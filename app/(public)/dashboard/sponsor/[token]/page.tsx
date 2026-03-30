import { createAdminClient } from '@/lib/supabase-admin'
import SponsorDashboardClient from '@/components/sponsor/SponsorDashboardClient'
import {
  aggregateAvgConfidence,
  buildSponsorDashboardMarkets,
} from '@/lib/sponsor-dashboard-build'
import type { FundImpactRow } from '@/components/sponsor/SponsorDashboardClient'

export const dynamic = 'force-dynamic'

export default async function SponsorDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: account, error: accErr } = await admin
    .from('sponsor_accounts')
    .select('*')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (accErr || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 text-center text-slate-400">
        <p>Enlace de acceso inválido o expirado.</p>
      </div>
    )
  }

  void admin
    .from('sponsor_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', account.id)

  const { data: marketsRaw } = await admin
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      status,
      total_votes,
      current_probability,
      resolution_date,
      is_pulse,
      market_outcomes(id, label, probability, vote_count)
    `
    )
    .eq('sponsor_account_id', account.id)
    .order('created_at', { ascending: false })

  const list = marketsRaw ?? []
  const marketIds = list.map((m) => m.id)

  const { data: votes } =
    marketIds.length > 0
      ? await admin
          .from('market_votes')
          .select('market_id, confidence, created_at, outcome_id')
          .in('market_id', marketIds)
      : { data: [] as { market_id: string; confidence: number; created_at: string; outcome_id: string }[] }

  const { data: fundImpactRows } =
    marketIds.length > 0
      ? await admin
          .from('conscious_fund_transactions')
          .select('amount, description, created_at')
          .eq('source_type', 'sponsorship')
          .in('market_id', marketIds)
          .order('created_at', { ascending: false })
      : { data: [] as FundImpactRow[] }

  const markets = buildSponsorDashboardMarkets(
    list as Parameters<typeof buildSponsorDashboardMarkets>[0],
    votes ?? []
  )

  const totalVotes = markets.reduce((sum, m) => sum + m.totalVotes, 0)
  const avgConfidenceOverall = aggregateAvgConfidence(markets)

  return (
    <SponsorDashboardClient
      account={{
        company_name: account.company_name,
        logo_url: account.logo_url,
        tier: account.tier,
        is_pulse_client: account.is_pulse_client,
        total_fund_contribution: account.total_fund_contribution,
        total_spent: account.total_spent,
        created_at: account.created_at,
      }}
      markets={markets}
      totalVotes={totalVotes}
      totalMarkets={markets.length}
      avgConfidenceOverall={avgConfidenceOverall}
      fundImpactRows={(fundImpactRows ?? []) as FundImpactRow[]}
      token={token}
    />
  )
}
