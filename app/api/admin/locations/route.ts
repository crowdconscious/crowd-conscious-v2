import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createConsciousLocationVotingMarket } from '@/lib/locations/create-voting-market'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, supabase: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') {
    return { user: null, supabase: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, supabase, error: null }
}

export async function GET() {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const admin = createAdminClient()
  const { data: locations, error } = await admin
    .from('conscious_locations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ locations: locations ?? [] })
}

export async function POST(request: Request) {
  const gate = await requireAdmin()
  if (gate.error || !gate.user) return gate.error!
  const user = gate.user

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const slug = String(body.slug ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const status = (body.status as string) || 'pending'
  const validStatuses = ['pending', 'active', 'under_review', 'suspended', 'revoked']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()

  const lat =
    typeof body.latitude === 'number' && Number.isFinite(body.latitude)
      ? body.latitude
      : null
  const lng =
    typeof body.longitude === 'number' && Number.isFinite(body.longitude)
      ? body.longitude
      : null

  const row = {
    name,
    slug,
    category: (body.category as string) || 'restaurant',
    city: (body.city as string) || 'CDMX',
    neighborhood: (body.neighborhood as string) || null,
    address: (body.address as string) || null,
    latitude: lat,
    longitude: lng,
    description: (body.description as string) || null,
    description_en: (body.description_en as string) || null,
    why_conscious: (body.why_conscious as string) || null,
    why_conscious_en: (body.why_conscious_en as string) || null,
    user_benefits: (body.user_benefits as string) || null,
    user_benefits_en: (body.user_benefits_en as string) || null,
    instagram_handle: (body.instagram_handle as string) || null,
    website_url: (body.website_url as string) || null,
    contact_email: (body.contact_email as string) || null,
    phone: (body.phone as string) || null,
    cover_image_url: (body.cover_image_url as string) || null,
    logo_url: (body.logo_url as string) || null,
    status,
    is_featured: Boolean(body.is_featured),
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    metadata:
      body.metadata != null && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : { values: [] },
  }

  const { data: inserted, error: insertErr } = await admin
    .from('conscious_locations')
    .insert(row as never)
    .select()
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 400 })
  }

  let location = inserted
  let market: { id: string; title: string } | null = null

  if (status === 'active') {
    try {
      const marketId = await createConsciousLocationVotingMarket(admin, user.id, name)
      const now = new Date().toISOString()
      const nextReview = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      const { data: updated, error: upErr } = await admin
        .from('conscious_locations')
        .update({
          current_market_id: marketId,
          certified_at: now,
          certified_by: user.id,
          next_review_date: nextReview,
          updated_at: now,
        })
        .eq('id', inserted.id)
        .select()
        .single()

      if (!upErr && updated) location = updated

      const { data: m } = await admin
        .from('prediction_markets')
        .select('id, title')
        .eq('id', marketId)
        .single()
      market = m
    } catch (e) {
      console.error('[admin/locations POST] market creation', e)
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : 'Failed to create voting market',
          location,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ location, market })
}
