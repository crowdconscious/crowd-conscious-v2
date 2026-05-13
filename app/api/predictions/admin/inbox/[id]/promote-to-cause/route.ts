import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { parseNominationDescription } from '@/lib/inbox/parse-nomination'
import { isAdminUser } from '@/lib/auth/is-admin'

/** Mirrors the CHECK constraint on fund_causes.category (migration 205). */
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

/** Mirrors `slugify` in app/api/predictions/admin/causes/route.ts. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()

    if (!isAdminUser(profile)) {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    if (!id) return Response.json({ error: 'Missing inbox item id' }, { status: 400 })

    const body = await request.json()
    const { name, organization, category, description, website_url } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!organization || typeof organization !== 'string' || !organization.trim()) {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 })
    }
    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    // Pull the source row so we can recover the originating sponsor (if any)
    // even when the admin form didn't echo it back. Also gives us a sane
    // fallback for organization/website when the admin left them blank.
    const { data: inboxItem, error: inboxErr } = await admin
      .from('conscious_inbox')
      .select('id, type, description')
      .eq('id', id)
      .single()

    if (inboxErr || !inboxItem) {
      return NextResponse.json({ error: 'Inbox item not found' }, { status: 404 })
    }

    const parsed = parseNominationDescription(inboxItem.description as string | null)

    // Slug: derive from name; on collision, append a 4-char suffix so the
    // admin can still save without hand-editing. This mirrors the bigger
    // /admin/causes POST endpoint exactly.
    const baseSlug = slugify(name)
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Could not derive a slug from name; try a different cause name' },
        { status: 400 }
      )
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
      // Audit trail introduced in migration 205 — every promoted cause must
      // know which inbox row spawned it. Sponsor link is best-effort: only
      // set when we can recover a UUID from the structured nomination text.
      suggested_by_inbox_id: id,
    }
    if (website_url && typeof website_url === 'string' && website_url.trim()) {
      insert.website_url = website_url.trim()
    } else if (parsed.website_url) {
      insert.website_url = parsed.website_url
    }
    if (parsed.suggested_by_sponsor_id) {
      insert.suggested_by_sponsor_id = parsed.suggested_by_sponsor_id
    }

    const { data: cause, error: causeErr } = await admin
      .from('fund_causes')
      .insert(insert)
      .select()
      .single()

    if (causeErr) {
      console.error('[promote-to-cause] insert error:', causeErr)
      return NextResponse.json({ error: causeErr.message }, { status: 500 })
    }

    const { error: updateErr } = await admin
      .from('conscious_inbox')
      .update({ status: 'promoted_to_cause', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateErr) {
      console.error('[promote-to-cause] inbox update error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ cause })
  } catch (err) {
    console.error('[promote-to-cause] error:', err)
    return NextResponse.json({ error: 'Failed to promote' }, { status: 500 })
  }
}
