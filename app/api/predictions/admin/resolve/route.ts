import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { notifyMarketResolutionVoters } from '@/lib/market-resolution-notifications'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { market_id, outcome, winning_outcome_id, evidence_url, admin_notes } = body

    if (!market_id) {
      return NextResponse.json(
        { error: 'market_id is required' },
        { status: 400 }
      )
    }

    // New flow: winning_outcome_id for free-to-play markets with outcomes
    if (winning_outcome_id) {
      const { data, error } = await supabase.rpc('resolve_market_free', {
        p_market_id: market_id,
        p_winning_outcome_id: winning_outcome_id,
      })

      if (error) {
        console.error('Resolve free error:', error)
        return NextResponse.json(
          { error: error.message || 'Resolution failed' },
          { status: 400 }
        )
      }

      const result = data as { success?: boolean; error?: string; total_voters?: number; correct_voters?: number; winning_outcome?: string }
      if (result.success === false) {
        return NextResponse.json(
          { error: result.error || 'Resolution failed' },
          { status: 400 }
        )
      }

      const admin = createAdminClient()
      const winningLabel = result.winning_outcome || 'Unknown'
      await notifyMarketResolutionVoters(admin, {
        marketId: market_id,
        winningOutcomeId: winning_outcome_id,
        winningLabel,
      })

      return NextResponse.json({
        success: true,
        total_voters: result.total_voters ?? 0,
        correct_voters: result.correct_voters ?? 0,
        winning_outcome: winningLabel,
      })
    }

    // Legacy flow: outcome (boolean) for money-based markets
    if (typeof outcome !== 'boolean') {
      return NextResponse.json(
        { error: 'Either winning_outcome_id or outcome (boolean) is required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const { data: positions } = await admin
      .from('prediction_positions')
      .select('user_id, side, shares, average_price')
      .eq('market_id', market_id)

    const { data: market } = await admin
      .from('prediction_markets')
      .select('id, title')
      .eq('id', market_id)
      .single()

    const { error } = await supabase.rpc('resolve_prediction_market', {
      p_market_id: market_id,
      p_outcome: outcome,
      p_evidence_url: evidence_url || null,
      p_admin_notes: admin_notes || null,
    })

    if (error) {
      console.error('Resolve error:', error)
      return NextResponse.json(
        { error: error.message || 'Resolution failed' },
        { status: 400 }
      )
    }

    const winningSide = outcome ? 'yes' : 'no'
    const payoutPerShare = 10

    for (const pos of positions || []) {
      if (Number(pos.shares) <= 0) continue
      const userId = pos.user_id
      const shares = Number(pos.shares)
      const avgPrice = Number(pos.average_price) || 0.5
      const won = pos.side === winningSide
      const payout = won ? shares * payoutPerShare : 0
      const costBasis = shares * avgPrice * 10

      const message = won
        ? `You won ${payout.toFixed(2)} MXN.`
        : `You lost your position (${costBasis.toFixed(2)} MXN cost basis).`

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'market_resolved',
        title: `Market resolved: ${market?.title || 'Prediction'}`,
        message: `"${market?.title || 'Market'}" resolved as ${winningSide.toUpperCase()}. ${message}`,
        data: { market_id, outcome: winningSide, won, payout: won ? payout : 0, cost_basis: costBasis },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resolve route error:', err)
    return NextResponse.json(
      { error: 'Resolution failed' },
      { status: 500 }
    )
  }
}
