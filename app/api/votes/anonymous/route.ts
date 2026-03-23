import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Record an anonymous vote in market_votes (guest UUID as user_id).
 * Uses service role + execute_anonymous_market_vote RPC (no client key).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { market_id, outcome_id, confidence, guest_id } = body

    if (!market_id || !outcome_id || !guest_id) {
      return NextResponse.json(
        { error: 'market_id, outcome_id, and guest_id are required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(market_id) || !UUID_REGEX.test(outcome_id) || !UUID_REGEX.test(guest_id)) {
      return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })
    }

    const conf = typeof confidence === 'number' ? confidence : parseInt(String(confidence), 10)
    if (isNaN(conf) || conf < 1 || conf > 10) {
      return NextResponse.json(
        { error: 'Confidence must be a number between 1 and 10' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('execute_anonymous_market_vote', {
      p_guest_id: guest_id,
      p_market_id: market_id,
      p_outcome_id: outcome_id,
      p_confidence: conf,
    })

    if (error) {
      console.error('[anonymous vote]', error)
      return NextResponse.json({ error: error.message || 'Vote failed' }, { status: 400 })
    }

    const result = data as { success?: boolean; error?: string }
    if (result?.success === false) {
      return NextResponse.json({ error: result.error || 'Vote failed' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[anonymous vote]', err)
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 })
  }
}
