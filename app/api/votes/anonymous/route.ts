import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeVoteReasoning, voteReasoningMaxForMarket } from '@/lib/vote-reasoning'
import { persistVoteReasoning } from '@/lib/persist-vote-reasoning'
import {
  normalizeOtherText,
  parseRankings,
} from '@/lib/pulse-vote-ranking'
import {
  parseSelections,
  primaryFromSelections,
} from '@/lib/multi-select-pulses'
import {
  standardRateLimit,
  getRateLimitIdentifier,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Guest vote for browsers and native apps (no cookies required).
 * Body JSON → execute_anonymous_market_vote via service_role.
 * Rate limit: same standard tier as /api/predictions/vote (20 req/min/IP).
 *
 * See docs/MULTI-SELECT-PULSES.md for the mobile request/response contract.
 */
export async function POST(request: Request) {
  try {
    const rlIdentifier = await getRateLimitIdentifier(request, null)
    const rl = await checkRateLimit(standardRateLimit, rlIdentifier)
    if (rl && !rl.allowed) {
      return rateLimitResponse(rl.limit, rl.remaining, rl.reset)
    }

    const body = await request.json()
    const { market_id, guest_id, reasoning: rawReasoning } = body
    const rankings = parseRankings(body.rankings)
    const otherNorm = normalizeOtherText(body.other_text ?? body.otherText)
    if (!otherNorm.ok) {
      return NextResponse.json({ error: otherNorm.error }, { status: 400 })
    }

    const selParsed = parseSelections(body.selections)
    if (!selParsed.ok) {
      return NextResponse.json({ error: selParsed.error }, { status: 400 })
    }
    const selections = selParsed.selections

    let outcome_id: string | undefined =
      typeof body.outcome_id === 'string' ? body.outcome_id : undefined
    let conf: number =
      body.confidence == null || body.confidence === ''
        ? NaN
        : typeof body.confidence === 'number'
          ? body.confidence
          : parseInt(String(body.confidence), 10)

    if (selections && selections.length > 0) {
      const primary = primaryFromSelections(selections)
      outcome_id = primary.outcome_id
      conf = primary.confidence
    }

    if (!market_id || !outcome_id || !guest_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!UUID_REGEX.test(market_id) || !UUID_REGEX.test(outcome_id) || !UUID_REGEX.test(guest_id)) {
      return NextResponse.json({ error: 'Invalid UUID' }, { status: 400 })
    }

    // 0 = "No lo sé" (excluded from confidence average). Never impute 5.
    if (isNaN(conf) || conf < 0 || conf > 10) {
      return NextResponse.json({ error: 'Invalid confidence value' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: market, error: marketError } = await admin
      .from('prediction_markets')
      .select('id, status, title, total_votes, engagement_count, is_micro_market')
      .eq('id', market_id)
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .maybeSingle()

    if (marketError || !market) {
      return NextResponse.json({ error: 'Market not found or not active' }, { status: 404 })
    }

    const reasoningNorm = normalizeVoteReasoning(
      rawReasoning,
      voteReasoningMaxForMarket(market.is_micro_market)
    )

    const { data: rpcData, error: rpcError } = await admin.rpc('execute_anonymous_market_vote', {
      p_guest_id: guest_id,
      p_market_id: market_id,
      p_outcome_id: outcome_id,
      p_confidence: conf,
      p_rankings: rankings,
      p_other_text: otherNorm.text,
      p_selections: selections,
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
        message: 'Ya votaste en este Pulse desde este dispositivo',
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

    const voteId = (rpcData as { vote_id?: string })?.vote_id
    await persistVoteReasoning(admin, {
      reasoning: reasoningNorm,
      marketId: market_id,
      voteId,
    })

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
      vote_id: voteId,
      confidence: (rpcData as { confidence?: number })?.confidence ?? conf,
    })
  } catch (err) {
    console.error('[anonymous vote]', err)
    return NextResponse.json({ error: 'Vote failed' }, { status: 500 })
  }
}
