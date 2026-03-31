import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') {
    return { error: NextResponse.json({ error: 'Admin only' }, { status: 403 }) }
  }
  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const { data: coupons, error } = await admin
    .from('coupon_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = coupons ?? []
  const withCounts = await Promise.all(
    rows.map(async (c) => {
      const { count } = await admin
        .from('coupon_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', c.id)
      return { ...c, redemption_count: count ?? 0 }
    })
  )

  return NextResponse.json({ coupons: withCounts })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  const type =
    typeof body.type === 'string' && ['pulse_trial', 'sponsor_trial', 'full_access'].includes(body.type)
      ? body.type
      : 'pulse_trial'
  const discount_percent =
    typeof body.discount_percent === 'number'
      ? Math.min(100, Math.max(0, Math.round(body.discount_percent)))
      : 100
  const max_uses = typeof body.max_uses === 'number' ? Math.max(1, Math.round(body.max_uses)) : 1
  const max_pulse_markets =
    typeof body.max_pulse_markets === 'number' ? Math.max(0, Math.round(body.max_pulse_markets)) : 3
  const max_live_events =
    typeof body.max_live_events === 'number' ? Math.max(0, Math.round(body.max_live_events)) : 0
  const valid_until =
    typeof body.valid_until === 'string' && body.valid_until.length > 0 ? body.valid_until : null

  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin
    .from('coupon_codes')
    .insert({
      code,
      type,
      discount_percent,
      max_uses,
      max_pulse_markets,
      max_live_events,
      valid_until,
      is_active: true,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ coupon: created })
}
