import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createConsciousCreatorVotingMarket } from '@/lib/creators/create-voting-market'
import { isAdminUser } from '@/lib/auth/is-admin'
import { sendCreatorVerifiedEmail } from '@/lib/resend'

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

async function loadProfileName(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string
): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('handle, full_name')
    .eq('id', profileId)
    .maybeSingle()
  return (data?.full_name as string | null) || `@${data?.handle ?? 'creador'}`
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const { id } = await params
  const admin = createAdminClient()
  const { data: certification, error } = await admin
    .from('creator_certifications')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !certification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, handle, full_name, avatar_url')
    .eq('id', certification.profile_id)
    .maybeSingle()

  return NextResponse.json({ certification, profile: profile ?? null })
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
  const { data: existing } = await admin
    .from('creator_certifications')
    .select('*')
    .eq('id', id)
    .single()
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  const stringFields = [
    'why_conscious',
    'why_conscious_en',
    'craft',
    'craft_en',
    'city',
    'cover_image_url',
  ] as const

  for (const f of stringFields) {
    if (f in body && body[f] !== undefined) {
      patch[f] = body[f] === null || body[f] === '' ? null : String(body[f])
    }
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

  // Certify action: status -> active + Tier 3 seal + 90-day review window.
  const certify = body.certify === true
  if (certify) {
    const now = new Date().toISOString()
    patch.status = 'active'
    patch.certified_at = now
    patch.certified_by = user.id
    patch.next_review_date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  const nextStatus = (patch.status as string) ?? existing.status

  const { data: updated, error: upErr } = await admin
    .from('creator_certifications')
    .update(patch as never)
    .eq('id', id)
    .select()
    .single()

  if (upErr || !updated) {
    return NextResponse.json({ error: upErr?.message ?? 'Update failed' }, { status: 400 })
  }

  let certification = updated
  let market: { id: string; title: string } | null = null

  if (nextStatus === 'active' && !existing.current_market_id) {
    try {
      const creatorName = await loadProfileName(admin, String(existing.profile_id))
      const marketId = await createConsciousCreatorVotingMarket(admin, user.id, creatorName)
      const { data: cert2 } = await admin
        .from('creator_certifications')
        .update({
          current_market_id: marketId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (cert2) certification = cert2
      const { data: m } = await admin
        .from('prediction_markets')
        .select('id, title')
        .eq('id', marketId)
        .single()
      market = m
    } catch (e) {
      console.error('[admin/creators PATCH] market creation', e)
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to create voting market', certification },
        { status: 500 }
      )
    }
  }

  // Verification-moment email (Creators Phase 2). Fires only on the first
  // certification of this row; awaited so Vercel doesn't freeze the lambda
  // mid-send, but fail-soft — an email failure must never fail the certify.
  let emailSent = false
  if (certify && !existing.certified_at) {
    try {
      const { data: recipient } = await admin
        .from('profiles')
        .select('email, handle, full_name')
        .eq('id', String(existing.profile_id))
        .maybeSingle()
      const email = (recipient?.email as string | null) ?? null
      const recipientHandle = (recipient?.handle as string | null) ?? null
      if (email && recipientHandle) {
        // ES default — profiles carry no locale signal today.
        const result = await sendCreatorVerifiedEmail(email, {
          name: (recipient?.full_name as string | null) || `@${recipientHandle}`,
          handle: recipientHandle,
          locale: 'es',
        })
        emailSent = result.success
        if (!result.success) {
          console.error('[admin/creators PATCH] verified email failed:', result.error)
        }
      } else {
        console.warn(
          '[admin/creators PATCH] verified email skipped — missing email or handle for profile',
          existing.profile_id
        )
      }
    } catch (e) {
      console.error('[admin/creators PATCH] verified email error:', e)
    }
  }

  return NextResponse.json({ certification, market, emailSent })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin()
  if (gate.error) return gate.error

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('creator_certifications').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
