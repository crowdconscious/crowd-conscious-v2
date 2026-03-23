import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser, AuthSessionExpiredError } from '@/lib/auth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Re-attribute a guest market_votes row to the logged-in user and award XP (post-signup).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guest_id, market_id } = body

    if (!guest_id || !market_id) {
      return NextResponse.json({ error: 'guest_id and market_id are required' }, { status: 400 })
    }

    if (!UUID_REGEX.test(guest_id) || !UUID_REGEX.test(market_id)) {
      return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('claim_guest_market_vote', {
      p_guest_id: guest_id,
      p_new_user_id: user.id,
      p_market_id: market_id,
    })

    if (error) {
      console.error('[claim-guest]', error)
      return NextResponse.json({ error: error.message || 'Claim failed' }, { status: 400 })
    }

    const result = data as { success?: boolean; error?: string; xp_earned?: number }
    if (result?.success === false) {
      return NextResponse.json({ error: result.error || 'Claim failed' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthSessionExpiredError) {
      return new Response(null, { status: 401 })
    }
    console.error('[claim-guest]', err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
