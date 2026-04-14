import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createConsciousLocationVotingMarket } from '@/lib/locations/create-voting-market'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const { id } = await params
  const admin = createAdminClient()
  const { data: location, error } = await admin.from('conscious_locations').select('*').eq('id', id).single()

  if (error || !location) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ location })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error || !gate.user) return gate.error!
  const user = gate.user

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin.from('conscious_locations').select('*').eq('id', id).single()
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const stringFields = [
    'name',
    'slug',
    'category',
    'city',
    'neighborhood',
    'address',
    'description',
    'description_en',
    'why_conscious',
    'why_conscious_en',
    'user_benefits',
    'user_benefits_en',
    'instagram_handle',
    'website_url',
    'contact_email',
    'phone',
    'cover_image_url',
    'logo_url',
  ] as const

  for (const f of stringFields) {
    if (f in body && body[f] !== undefined) {
      patch[f] = body[f] === null || body[f] === '' ? null : String(body[f])
    }
  }

  if (typeof body.slug === 'string') {
    patch.slug = body.slug.trim().toLowerCase().replace(/\s+/g, '-')
  }

  if ('status' in body && body.status !== undefined) {
    patch.status = body.status
  }
  if ('is_featured' in body && body.is_featured !== undefined) {
    patch.is_featured = Boolean(body.is_featured)
  }
  if ('sort_order' in body && typeof body.sort_order === 'number') {
    patch.sort_order = body.sort_order
  }

  if ('metadata' in body && body.metadata !== undefined) {
    if (body.metadata === null) {
      patch.metadata = {}
    } else if (typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
      const prev =
        existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
          ? (existing.metadata as Record<string, unknown>)
          : {}
      patch.metadata = { ...prev, ...(body.metadata as Record<string, unknown>) }
    }
  }

  const nextStatus = (patch.status as string) ?? existing.status

  const { data: updated, error: upErr } = await admin
    .from('conscious_locations')
    .update(patch as never)
    .eq('id', id)
    .select()
    .single()

  if (upErr || !updated) {
    return NextResponse.json({ error: upErr?.message ?? 'Update failed' }, { status: 400 })
  }

  let location = updated
  let market: { id: string; title: string } | null = null

  if (nextStatus === 'active' && !existing.current_market_id) {
    const locName = String(updated.name ?? existing.name)
    try {
      const marketId = await createConsciousLocationVotingMarket(admin, user.id, locName)
      const now = new Date().toISOString()
      const nextReview = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      const { data: loc2 } = await admin
        .from('conscious_locations')
        .update({
          current_market_id: marketId,
          certified_at: now,
          certified_by: user.id,
          next_review_date: nextReview,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .single()
      if (loc2) location = loc2
      const { data: m } = await admin
        .from('prediction_markets')
        .select('id, title')
        .eq('id', marketId)
        .single()
      market = m
    } catch (e) {
      console.error('[admin/locations PATCH] market creation', e)
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to create voting market', location },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ location, market })
}
