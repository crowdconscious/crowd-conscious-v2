import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

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
    const { market_id, outcome, evidence_url, admin_notes } = body

    if (!market_id || typeof outcome !== 'boolean') {
      return NextResponse.json(
        { error: 'market_id and outcome (boolean) required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Fetch positions BEFORE resolve (they get zeroed)
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
    const marketTitle = market?.title || 'Market'

    for (const pos of positions || []) {
      if (Number(pos.shares) <= 0) continue
      const userId = pos.user_id
      const shares = Number(pos.shares)
      const avgPrice = Number(pos.average_price) || 0.5
      const won = pos.side === winningSide
      const payout = won ? shares * payoutPerShare : 0
      const costBasis = shares * avgPrice * 10

      const message = won
        ? `Ganaste $${payout.toFixed(2)} MXN.`
        : `Perdiste tu posición de $${costBasis.toFixed(2)} MXN.`

      const fullMessage = `El mercado "${marketTitle}" se resolvió como ${winningSide.toUpperCase()}. ${message}`

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'market_resolved',
        title: `Mercado resuelto: ${marketTitle}`,
        message: fullMessage,
        data: {
          market_id,
          outcome: winningSide,
          won,
          payout: won ? payout : 0,
          cost_basis: costBasis,
        },
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
