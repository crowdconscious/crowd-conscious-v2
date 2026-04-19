import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { LOCATION_CATEGORY_FORM_OPTIONS } from '@/lib/locations/categories'
import { slugifyLocationName } from '@/lib/locations/slug'

export const dynamic = 'force-dynamic'

const VALID_CATEGORIES: readonly string[] = LOCATION_CATEGORY_FORM_OPTIONS.map(
  (c) => c.value
)

/**
 * Bulk-import endpoint for /predictions/admin/locations/bulk-import.
 *
 * The CSV upload runs in two phases:
 *   1. dry_run=true → server validates the parsed rows and returns a per-row
 *      result table the operator can review.
 *   2. dry_run=false → server inserts every row that passes validation.
 *
 * Rows always land as `status='pending'` so an admin still has to flip the
 * status on the single-location editor (which is also what triggers the
 * voting-market creation). This keeps bulk import safe — an operator can
 * paste 50 rows from a spreadsheet without accidentally publishing them.
 *
 * Slug collisions inside the batch and against existing rows in the DB are
 * surfaced as validation errors so the operator can fix them before the
 * write phase.
 */

const rowSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  category: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  latitude: z.number().finite().optional().nullable(),
  longitude: z.number().finite().optional().nullable(),
  instagram_handle: z.string().trim().optional(),
  website: z.string().trim().optional(),
  contact_email: z.string().trim().optional(),
  description_es: z.string().trim().optional(),
  description_en: z.string().trim().optional(),
  why_conscious_es: z.string().trim().optional(),
  why_conscious_en: z.string().trim().optional(),
})

const bodySchema = z.object({
  rows: z.array(z.unknown()).min(1).max(200),
  dry_run: z.boolean().optional().default(false),
})

type RowResult = {
  index: number
  ok: boolean
  name: string
  slug: string
  error?: string
  location_id?: string
  inserted?: boolean
}

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if (profile?.user_type !== 'admin') {
    return {
      user: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }
  return { user, error: null }
}

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      { status: 400 }
    )
  }

  const { rows, dry_run } = parsed.data
  const admin = createAdminClient()

  const seenSlugs = new Set<string>()
  const validated: Array<{ index: number; row: z.infer<typeof rowSchema>; slug: string }> = []
  const results: RowResult[] = []

  rows.forEach((raw, index) => {
    const r = rowSchema.safeParse(raw)
    if (!r.success) {
      results.push({
        index,
        ok: false,
        name: typeof (raw as { name?: unknown })?.name === 'string' ? (raw as { name: string }).name : '',
        slug: '',
        error: r.error.issues.map((i) => i.message).join('; '),
      })
      return
    }
    const data = r.data
    const slug = slugifyLocationName(data.name)
    if (!slug) {
      results.push({ index, ok: false, name: data.name, slug: '', error: 'name yields empty slug' })
      return
    }
    const cat = data.category && VALID_CATEGORIES.includes(data.category) ? data.category : 'restaurant'
    if (data.category && !VALID_CATEGORIES.includes(data.category)) {
      results.push({
        index,
        ok: false,
        name: data.name,
        slug,
        error: `unknown category "${data.category}"`,
      })
      return
    }
    if (seenSlugs.has(slug)) {
      results.push({
        index,
        ok: false,
        name: data.name,
        slug,
        error: 'duplicate slug within this CSV',
      })
      return
    }
    seenSlugs.add(slug)
    validated.push({ index, row: { ...data, category: cat }, slug })
  })

  if (validated.length > 0) {
    const slugs = validated.map((v) => v.slug)
    const { data: existing } = await admin
      .from('conscious_locations')
      .select('slug')
      .in('slug', slugs)
    const existingSlugs = new Set((existing ?? []).map((r) => r.slug))
    for (let i = validated.length - 1; i >= 0; i -= 1) {
      const v = validated[i]
      if (existingSlugs.has(v.slug)) {
        results.push({
          index: v.index,
          ok: false,
          name: v.row.name,
          slug: v.slug,
          error: 'slug already exists in DB',
        })
        validated.splice(i, 1)
      }
    }
  }

  // Validation phase complete — preview always returns here.
  if (dry_run) {
    for (const v of validated) {
      results.push({ index: v.index, ok: true, name: v.row.name, slug: v.slug })
    }
    results.sort((a, b) => a.index - b.index)
    return NextResponse.json({
      dry_run: true,
      total: rows.length,
      valid: validated.length,
      invalid: rows.length - validated.length,
      results,
    })
  }

  let inserted = 0
  for (const v of validated) {
    const ig = v.row.instagram_handle?.trim() || null
    const insertRow = {
      name: v.row.name.trim(),
      slug: v.slug,
      category: v.row.category as 'restaurant',
      city: v.row.city?.trim() || 'CDMX',
      neighborhood: v.row.neighborhood?.trim() || null,
      address: v.row.address?.trim() || null,
      latitude: typeof v.row.latitude === 'number' ? v.row.latitude : null,
      longitude: typeof v.row.longitude === 'number' ? v.row.longitude : null,
      instagram_handle: ig ? (ig.startsWith('@') ? ig.slice(1) : ig) : null,
      website_url: v.row.website?.trim() || null,
      contact_email: v.row.contact_email?.trim() || null,
      description: v.row.description_es?.trim() || null,
      description_en: v.row.description_en?.trim() || null,
      why_conscious: v.row.why_conscious_es?.trim() || null,
      why_conscious_en: v.row.why_conscious_en?.trim() || null,
      status: 'pending' as const,
      is_featured: false,
      sort_order: 0,
      metadata: { values: [], imported_via: 'bulk_csv' },
    }

    const { data: row, error: insErr } = await admin
      .from('conscious_locations')
      .insert(insertRow as never)
      .select('id, slug')
      .single()

    if (insErr || !row) {
      results.push({
        index: v.index,
        ok: false,
        name: v.row.name,
        slug: v.slug,
        error: insErr?.message ?? 'insert failed',
      })
      continue
    }
    inserted += 1
    results.push({
      index: v.index,
      ok: true,
      name: v.row.name,
      slug: v.slug,
      location_id: row.id,
      inserted: true,
    })
  }

  results.sort((a, b) => a.index - b.index)
  return NextResponse.json({
    dry_run: false,
    total: rows.length,
    inserted,
    failed: rows.length - inserted,
    results,
  })
}
