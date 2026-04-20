import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

const CATEGORIES = [
  'water',
  'education',
  'environment',
  'social_justice',
  'health',
  'mobility',
  'housing',
  'hunger',
  'culture',
  'emergency',
  'other',
] as const

type Category = (typeof CATEGORIES)[number]

function isValidHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (!v) return false
  if (!v.startsWith('https://')) return false
  if (v.includes('crowdconscious.app')) return false
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function requireAdmin() {
  return async () => {
    const user = await getCurrentUser()
    if (!user) return { error: 'Unauthorized', status: 401 as const }
    if (user.user_type !== 'admin') return { error: 'Admin only', status: 403 as const }
    return { user }
  }
}

export async function GET() {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const admin = createAdminClient()
    const cycle = new Date().toISOString().slice(0, 7)

    const [
      { data: causes, error: causesErr },
      { data: votes },
    ] = await Promise.all([
      admin.from('fund_causes').select('*').order('created_at', { ascending: false }),
      admin.from('fund_votes').select('cause_id').eq('cycle', cycle),
    ])

    if (causesErr) {
      console.error('[admin/causes] fetch error:', causesErr)
      return NextResponse.json({ error: causesErr.message }, { status: 500 })
    }

    const voteCountByCause: Record<string, number> = {}
    for (const v of votes ?? []) {
      const id = v.cause_id
      voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
    }

    const causesWithVotes = (causes ?? []).map((c) => ({
      ...c,
      vote_count: voteCountByCause[c.id] ?? 0,
    }))

    return NextResponse.json({ causes: causesWithVotes })
  } catch (err) {
    console.error('[admin/causes] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const {
      name,
      organization,
      category,
      description,
      short_description,
      website_url,
      image_url,
      logo_url,
      cover_image_url,
      instagram_handle,
      city,
      latitude,
      longitude,
      slug: rawSlug,
      verified,
      suggested_by_sponsor_id,
      suggested_by_inbox_id,
    } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!organization || typeof organization !== 'string' || !organization.trim()) {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 })
    }
    if (!category || !CATEGORIES.includes(category as Category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }
    if (short_description && typeof short_description === 'string' && short_description.length > 140) {
      return NextResponse.json({ error: 'short_description must be ≤140 chars' }, { status: 400 })
    }
    if (website_url && !isValidHttpsUrl(website_url)) {
      return NextResponse.json(
        { error: 'website_url must be an https URL and not crowdconscious.app' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Slug: use provided (if valid) or derive from name. Append an 8-char
    // suffix of a random UUID-ish string when a collision is detected so
    // the admin can still save without needing to edit the slug by hand.
    const baseSlug =
      (typeof rawSlug === 'string' && rawSlug.trim()) ? slugify(rawSlug) : slugify(name)
    if (!baseSlug) {
      return NextResponse.json({ error: 'Could not derive a slug from name' }, { status: 400 })
    }
    const { data: slugCollision } = await admin
      .from('fund_causes')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle()
    const finalSlug = slugCollision
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      : baseSlug

    const insert: Record<string, unknown> = {
      name: name.trim(),
      organization: organization.trim(),
      category,
      description: description.trim().slice(0, 500),
      slug: finalSlug,
      active: true,
    }
    if (short_description && typeof short_description === 'string') {
      insert.short_description = short_description.trim()
    }
    if (website_url && typeof website_url === 'string' && website_url.trim()) {
      insert.website_url = website_url.trim()
    }
    // `image_url` is the legacy column (pre-205); `cover_image_url` + `logo_url`
    // are the new split. Accept all three for backwards compatibility.
    if (image_url && typeof image_url === 'string' && image_url.trim()) {
      insert.image_url = image_url.trim()
    }
    if (cover_image_url && typeof cover_image_url === 'string' && cover_image_url.trim()) {
      insert.cover_image_url = cover_image_url.trim()
    }
    if (logo_url && typeof logo_url === 'string' && logo_url.trim()) {
      insert.logo_url = logo_url.trim()
    }
    if (instagram_handle && typeof instagram_handle === 'string' && instagram_handle.trim()) {
      insert.instagram_handle = instagram_handle.trim().replace(/^@/, '')
    }
    if (city && typeof city === 'string' && city.trim()) insert.city = city.trim()
    if (typeof latitude === 'number' && Number.isFinite(latitude)) insert.latitude = latitude
    if (typeof longitude === 'number' && Number.isFinite(longitude)) insert.longitude = longitude
    if (suggested_by_sponsor_id && typeof suggested_by_sponsor_id === 'string') {
      insert.suggested_by_sponsor_id = suggested_by_sponsor_id
    }
    if (suggested_by_inbox_id && typeof suggested_by_inbox_id === 'string') {
      insert.suggested_by_inbox_id = suggested_by_inbox_id
    }
    if (verified === true) {
      insert.verified = true
      insert.verified_at = new Date().toISOString()
      insert.verified_by = auth.user.id
    }

    const { data, error } = await admin
      .from('fund_causes')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('[admin/causes] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cause: data })
  } catch (err) {
    console.error('[admin/causes] POST error:', err)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await request.json()
    const {
      id,
      name,
      organization,
      category,
      description,
      short_description,
      website_url,
      image_url,
      logo_url,
      cover_image_url,
      instagram_handle,
      city,
      latitude,
      longitude,
      verified,
      active,
    } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const updates: Record<string, unknown> = {}

    if (name !== undefined) updates.name = typeof name === 'string' ? name.trim() : name
    if (organization !== undefined)
      updates.organization = typeof organization === 'string' ? organization.trim() : organization
    if (category !== undefined) {
      if (!CATEGORIES.includes(category as Category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updates.category = category
    }
    if (description !== undefined)
      updates.description =
        typeof description === 'string' ? description.trim().slice(0, 500) : description
    if (short_description !== undefined) {
      if (typeof short_description === 'string' && short_description.length > 140) {
        return NextResponse.json({ error: 'short_description must be ≤140 chars' }, { status: 400 })
      }
      updates.short_description =
        short_description && typeof short_description === 'string' ? short_description.trim() : null
    }
    if (website_url !== undefined) {
      if (website_url && !isValidHttpsUrl(website_url)) {
        return NextResponse.json(
          { error: 'website_url must be an https URL and not crowdconscious.app' },
          { status: 400 }
        )
      }
      updates.website_url =
        website_url && typeof website_url === 'string' ? website_url.trim() : null
    }
    if (image_url !== undefined)
      updates.image_url = image_url && typeof image_url === 'string' ? image_url.trim() : null
    if (cover_image_url !== undefined)
      updates.cover_image_url =
        cover_image_url && typeof cover_image_url === 'string' ? cover_image_url.trim() : null
    if (logo_url !== undefined)
      updates.logo_url = logo_url && typeof logo_url === 'string' ? logo_url.trim() : null
    if (instagram_handle !== undefined)
      updates.instagram_handle =
        instagram_handle && typeof instagram_handle === 'string'
          ? instagram_handle.trim().replace(/^@/, '')
          : null
    if (city !== undefined)
      updates.city = city && typeof city === 'string' ? city.trim() : null
    if (latitude !== undefined)
      updates.latitude = typeof latitude === 'number' && Number.isFinite(latitude) ? latitude : null
    if (longitude !== undefined)
      updates.longitude =
        typeof longitude === 'number' && Number.isFinite(longitude) ? longitude : null
    if (active !== undefined) updates.active = !!active

    if (verified !== undefined) {
      if (verified === true) {
        updates.verified = true
        updates.verified_at = new Date().toISOString()
        updates.verified_by = auth.user.id
      } else {
        updates.verified = false
        // Leave verified_at/verified_by in place as audit trail of who
        // previously signed it off — dropping verification does not erase
        // the history.
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('fund_causes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[admin/causes] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ cause: data })
  } catch (err) {
    console.error('[admin/causes] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
