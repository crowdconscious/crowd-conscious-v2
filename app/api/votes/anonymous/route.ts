import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Browser guest vote (localStorage guest UUID): inserts market_votes and updates
 * market_outcomes probabilities via execute_anonymous_market_vote (service role).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { market_id, outcome_id, confidence, guest_id } = body

    if (!market_id || !outcome_id || !guest_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!UUID_REGEX.test(market_id) || !UUID_REGEX.test(outcome_id) || !UUID_REGEX.test(guest_id)) {
      return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })
    }

    const conf = typeof confidence === 'number' ? confidence : parseInt(String(confidence), 10)
    if (isNaN(conf) || conf < 1 || conf > 10) {
      return NextResponse.json({ error: 'Invalid confidence value' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: market, error: marketError } = await admin
      .from('prediction_markets')
      .select('id, status, title, total_votes, engagement_count')
      .eq('id', market_id)
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .maybeSingle()

    if (marketError || !market) {
      return NextResponse.json({ error: 'Market not found or not active' }, { status: 404 })
    }

    const { data: rpcData, error: rpcError } = await admin.rpc('execute_anonymous_market_vote', {
      p_guest_id: guest_id,
      p_market_id: market_id,
      p_outcome_id: outcome_id,
      p_confidence: conf,
    })

    if (rpcError) {
      console.error('[anonymous vote]', rpcError)
      return NextResponse.json({ error: rpcError.message || 'Vote failed' }, { status: 400 })
    }

    const result = rpcData as {
      success?: boolean
      already_voted?: boolean
      error?: string
      total_votes?: number
      engagement_count?: number
    }

    if (result?.already_voted === true) {
      const [{ data: outcomes }, { count: registeredOnly }] = await Promise.all([
        admin.from('market_outcomes').select('id, label, probability, vote_count').eq('market_id', market_id),
        admin
          .from('market_votes')
          .select('*', { count: 'exact', head: true })
          .eq('market_id', market_id)
          .eq('is_anonymous', false),
      ])
      const { data: m } = await admin
        .from('prediction_markets')
        .select('total_votes, engagement_count')
        .eq('id', market_id)
        .single()
      return NextResponse.json({
        success: false,
        already_voted: true,
        message: 'Ya votaste en este mercado desde este dispositivo',
        outcomes: outcomes ?? [],
        engagement_count: m?.engagement_count ?? 0,
        total_votes: m?.total_votes ?? 0,
        registered_vote_count: registeredOnly ?? 0,
      })
    }

    if (result?.success === false) {
      return NextResponse.json(
        { error: result?.error || 'Vote failed' },
        { status: 400 }
      )
    }

    const [{ data: outcomes }, { data: updatedMarket }, { count: registeredOnly }] = await Promise.all([
      admin.from('market_outcomes').select('id, label, probability, vote_count').eq('market_id', market_id),
      admin.from('prediction_markets').select('total_votes, engagement_count').eq('id', market_id).single(),
      admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', market_id)
        .eq('is_anonymous', false),
    ])

    return NextResponse.json({
      success: true,
      message: 'Tu participación fue registrada',
      outcomes: outcomes ?? [],
      engagement_count: updatedMarket?.engagement_count ?? result?.engagement_count ?? 0,
      total_votes: updatedMarket?.total_votes ?? result?.total_votes,
      registered_vote_count: registeredOnly ?? 0,
      xp_earned: 0,
      outcome_label: (rpcData as { outcome_label?: string })?.outcome_label,
      new_probability: (rpcData as { new_probability?: number })?.new_probability,
    })
  } catch (err) {
    console.error('[anonymous vote]', err)
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 })
  }
}
