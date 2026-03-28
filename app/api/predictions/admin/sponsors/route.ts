import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: sponsorships, error: sponsorshipsError } = await supabase
      .from('sponsorships')
      .select('*')
      .order('created_at', { ascending: false })

    if (sponsorshipsError) {
      return Response.json({ error: sponsorshipsError.message }, { status: 500 })
    }

    const admin = createAdminClient()

    const enriched = await Promise.all(
      (sponsorships ?? []).map(async (s) => {
        let marketIds: string[] = []
        let marketTitles: string[] = []

        if ((s.tier === 'market' || s.tier === 'starter') && s.market_id) {
          marketIds = [s.market_id]
          const { data: m } = await admin
            .from('prediction_markets')
            .select('title')
            .eq('id', s.market_id)
            .single()
          marketTitles = m?.title ? [m.title] : []
        } else {
          const { data: markets } = await admin
            .from('prediction_markets')
            .select('id, title')
            .eq('sponsor_id', s.id)
          marketIds = (markets ?? []).map((m) => m.id)
          marketTitles = (markets ?? []).map((m) => m.title ?? 'Unknown')
        }

        const [
          { count: votesCount },
          { data: votes },
          { data: trades },
          { data: fundTx },
        ] = await Promise.all([
          admin.from('market_votes').select('id', { count: 'exact', head: true }).in('market_id', marketIds),
          marketIds.length > 0
            ? admin.from('market_votes').select('user_id').in('market_id', marketIds)
            : { data: [] },
          marketIds.length > 0
            ? admin.from('prediction_trades').select('user_id').in('market_id', marketIds)
            : { data: [] },
          admin
            .from('conscious_fund_transactions')
            .select('amount')
            .eq('source_type', 'sponsorship')
            .eq('source_id', s.id),
        ])

        const uniqueUsers = new Set<string>()
        for (const v of votes ?? []) {
          if (v.user_id) uniqueUsers.add(v.user_id)
        }
        for (const t of trades ?? []) {
          if (t.user_id) uniqueUsers.add(t.user_id)
        }

        const tradesCount = (trades ?? []).length
        const totalPredictions = (votesCount ?? 0) + tradesCount
        const fundContribution = (fundTx ?? []).reduce((sum, tx) => sum + Number(tx.amount ?? 0), 0)

        return {
          ...s,
          market_ids: marketIds,
          market_titles: marketTitles,
          total_predictions: totalPredictions,
          unique_users: uniqueUsers.size,
          fund_contribution_mxn: fundContribution,
          fund_status: fundContribution > 0 ? 'allocated' : 'pending',
        }
      })
    )

    return Response.json({ sponsorships: enriched })
  } catch (err) {
    console.error('Admin sponsors error:', err)
    return Response.json({ error: 'Failed to fetch sponsors' }, { status: 500 })
  }
}
