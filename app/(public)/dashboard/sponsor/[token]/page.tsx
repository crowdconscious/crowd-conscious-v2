import { createAdminClient } from '@/lib/supabase-admin'
import SponsorDashboardClient from '@/components/sponsor/SponsorDashboardClient'
import {
  aggregateAvgConfidence,
  buildSponsorDashboardMarkets,
} from '@/lib/sponsor-dashboard-build'
import { fetchMarketsForSponsorAccount } from '@/lib/sponsor-account-access'
import type { FundImpactRow } from '@/components/sponsor/types'

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app').replace(/\/$/, '')

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

  const accountRow = {
    id: account.id,
    company_name: account.company_name,
    contact_email: account.contact_email,
  }

  const listRaw = await fetchMarketsForSponsorAccount(admin, accountRow)
  const list = listRaw as Parameters<typeof buildSponsorDashboardMarkets>[0]

  const marketIds = list.map((m) => m.id)

  const { data: votes } =
    marketIds.length > 0
      ? await admin
          .from('market_votes')
          .select('market_id, confidence, created_at, outcome_id, reasoning')
          .in('market_id', marketIds)
      : { data: [] as { market_id: string; confidence: number; created_at: string; outcome_id: string; reasoning?: string | null }[] }

  const totalReasonings =
    (votes ?? []).filter((v) => typeof v.reasoning === 'string' && v.reasoning.trim().length > 0).length

  // Fund impact rows come from three paths, all tied to this sponsor:
  //   (A) market-sponsored Pulses     — matched by market_id IN sponsorMarkets
  //   (B) Pulse B2B purchases         — matched by source_id IN (sponsorships
  //                                     for this contact_email), since the
  //                                     webhook writes market_id = NULL.
  //   (C) Pulse add-on slot purchases — tagged in the description with
  //                                     [sponsor_account:<uuid>].
  // Before this fix, a Pulse-only sponsor saw $0 "Impacto del Fondo" even
  // though their confirmation email promised a fund contribution.
  const { data: sponsorshipRows } = await admin
    .from('sponsorships')
    .select('id')
    .eq('sponsor_email', account.contact_email)
  const sponsorshipIds = (sponsorshipRows ?? []).map((r: { id: string }) => r.id)

  const fundImpactQueries = await Promise.all([
    marketIds.length > 0
      ? admin
          .from('conscious_fund_transactions')
          .select('amount, description, created_at')
          .eq('source_type', 'sponsorship')
          .in('market_id', marketIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as FundImpactRow[] }),
    sponsorshipIds.length > 0
      ? admin
          .from('conscious_fund_transactions')
          .select('amount, description, created_at')
          .eq('source_type', 'sponsorship')
          .in('source_id', sponsorshipIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as FundImpactRow[] }),
    admin
      .from('conscious_fund_transactions')
      .select('amount, description, created_at')
      .eq('source_type', 'sponsorship')
      .ilike('description', `%[sponsor_account:${account.id}]%`)
      .order('created_at', { ascending: false }),
  ])

  const seen = new Set<string>()
  const fundImpactRows: FundImpactRow[] = []
  for (const q of fundImpactQueries) {
    for (const row of (q.data ?? []) as FundImpactRow[]) {
      const key = `${row.created_at}|${row.amount}|${row.description ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      fundImpactRows.push(row)
    }
  }
  fundImpactRows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const voteRows = (votes ?? []).map((v) => ({
    market_id: v.market_id,
    confidence: v.confidence,
    created_at: v.created_at,
    outcome_id: v.outcome_id,
  }))

  const markets = buildSponsorDashboardMarkets(list, voteRows)

  const totalVotes = markets.reduce((sum, m) => sum + m.totalVotes, 0)
  const avgConfidenceOverall = aggregateAvgConfidence(markets)
  const activeMarketCount = list.filter((m) => m.status === 'active' || m.status === 'trading').length

  const lastVisit = (account as { last_dashboard_visit?: string | null }).last_dashboard_visit
  const isFirstVisit = !lastVisit

  const { count: pulseMarketCount } = await admin
    .from('prediction_markets')
    .select('id', { count: 'exact', head: true })
    .eq('sponsor_account_id', account.id)
    .eq('is_pulse', true)

  const pulseUsed = pulseMarketCount ?? 0
  const maxPulse = Number((account as { max_pulse_markets?: number }).max_pulse_markets ?? 1)

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
        contact_email: account.contact_email,
        max_pulse_markets: maxPulse,
        used_pulse_markets: pulseUsed,
      }}
      markets={markets}
      marketsRaw={listRaw}
      totalVotes={totalVotes}
      activeMarketCount={activeMarketCount}
      totalReasonings={totalReasonings}
      avgConfidenceOverall={avgConfidenceOverall}
      fundImpactRows={fundImpactRows}
      token={token}
      isFirstVisit={isFirstVisit}
      appOrigin={APP_ORIGIN}
    />
  )
}
