import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createConsciousCreatorVotingMarket } from '@/lib/creators/create-voting-market'
import { isAdminUser } from '@/lib/auth/is-admin'
import { normalizeHandle } from '@/lib/i18n/creator'
import type { CreatorCertificationRow } from '@/lib/creators/types'

// Mirrors app/api/admin/locations. One deliberate difference: setting
// status='active' creates the voting market (the public card needs it) but
// does NOT set certified_at — Tier 3 certification is the explicit certify
// action on the [id] route, per the tier ladder in the strategy doc §4.

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('user_type, email').eq('id', user.id).single()
  if (!isAdminUser(profile)) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user, error: null }
}

type AdminProfileSummary = {
  id: string
  handle: string | null
  full_name: string | null
  avatar_url: string | null
}

export async function GET() {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const admin = createAdminClient()
  const { data: certs, error } = await admin
    .from('creator_certifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (certs ?? []) as CreatorCertificationRow[]
  let profiles: AdminProfileSummary[] = []
  if (rows.length > 0) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, handle, full_name, avatar_url')
      .in(
        'id',
        rows.map((r) => r.profile_id)
      )
    profiles = (profs ?? []) as AdminProfileSummary[]
  }
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  const creators = rows.map((r) => ({
    ...r,
    profile: profileById.get(r.profile_id) ?? null,
  }))

  return NextResponse.json({ creators })
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

  const handle = normalizeHandle(String(body.profile_handle ?? ''))
  if (!handle) {
    return NextResponse.json({ error: 'profile_handle is required' }, { status: 400 })
  }

  const status = (body.status as string) || 'pending'
  const validStatuses = ['pending', 'active', 'under_review', 'suspended', 'revoked']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, handle, full_name')
    .ilike('handle', handle)
    .eq('user_type', 'influencer')
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      { error: `No creator profile found for handle "${handle}"` },
      { status: 404 }
    )
  }

  const { data: existing } = await admin
    .from('creator_certifications')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: 'This profile already has a certification' },
      { status: 409 }
    )
  }

  const row = {
    profile_id: profile.id,
    status,
    why_conscious: (body.why_conscious as string) || null,
    why_conscious_en: (body.why_conscious_en as string) || null,
    craft: (body.craft as string) || null,
    craft_en: (body.craft_en as string) || null,
    city: (body.city as string) || 'CDMX',
    cover_image_url: (body.cover_image_url as string) || null,
    is_featured: Boolean(body.is_featured),
    sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
    metadata:
      body.metadata != null && typeof body.metadata === 'object'
        ? (body.metadata as Record<string, unknown>)
        : { values: [] },
  }

  const { data: inserted, error: insertErr } = await admin
    .from('creator_certifications')
    .insert(row as never)
    .select()
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 400 })
  }

  let certification = inserted
  let market: { id: string; title: string } | null = null

  if (status === 'active') {
    try {
      const creatorName = (profile.full_name as string | null) || `@${profile.handle}`
      const marketId = await createConsciousCreatorVotingMarket(admin, user.id, creatorName)
      const { data: updated, error: upErr } = await admin
        .from('creator_certifications')
        .update({
          current_market_id: marketId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', inserted.id)
        .select()
        .single()

      if (!upErr && updated) certification = updated

      const { data: m } = await admin
        .from('prediction_markets')
        .select('id, title')
        .eq('id', marketId)
        .single()
      market = m
    } catch (e) {
      console.error('[admin/creators POST] market creation', e)
      return NextResponse.json(
        {
          error: e instanceof Error ? e.message : 'Failed to create voting market',
          certification,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ certification, market })
}
