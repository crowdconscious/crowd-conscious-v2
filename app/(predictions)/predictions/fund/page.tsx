import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { FundClient } from './FundClient'
import { SITE_URL } from '@/lib/seo/site'
import { buildCauseDistributionBreakdown } from '@/lib/fund-transparency'
import { consciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import {
  TransparencyDashboard,
  type SponsorshipLogPublic,
} from '@/components/fund/TransparencyDashboard'

export const metadata: Metadata = {
  title: { absolute: 'Fondo Consciente | Crowd Conscious' },
  description:
    'Hasta el 40% del neto estimado de patrocinios (según nivel) alimenta el Fondo Consciente. Los usuarios eligen a qué causas va el impacto. Transparente y gratuito.',
  alternates: {
    canonical: `${SITE_URL}/predictions/fund`,
    languages: {
      'es-MX': `${SITE_URL}/predictions/fund`,
      'en-US': `${SITE_URL}/predictions/fund`,
    },
  },
}

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

async function getFundData(userId: string | null) {
  const cycle = getCurrentCycle()
  // Use admin client when unauthenticated (fund_causes, fund_votes require auth for anon)
  const supabase = userId ? await createClient() : createAdminClient()
  const admin = createAdminClient()

  const [
    { data: sponsorMarkets },
    { data: causes },
    { data: allVotes },
    { data: myVotes },
    { data: fund },
    { data: userXp },
    { data: sponsorshipLogRows },
    { count: sponsorshipLogCount },
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, title, sponsor_name, sponsor_logo_url, sponsor_contribution')
      .not('sponsor_name', 'is', null)
      .gt('sponsor_contribution', 0)
      .is('archived_at', null),
    supabase.from('fund_causes').select('*').eq('active', true).order('name'),
    supabase.from('fund_votes').select('cause_id').eq('cycle', cycle),
    userId
      ? supabase.from('fund_votes').select('cause_id').eq('user_id', userId).eq('cycle', cycle)
      : { data: [] },
    supabase.from('conscious_fund').select('current_balance, total_collected, total_disbursed').limit(1).single(),
    userId
      ? supabase
          .from('xp_transactions')
          .select('amount')
          .eq('user_id', userId)
          .in('action_type', ['prediction_vote', 'prediction_correct'])
      : { data: [] },
    admin
      .from('sponsorship_log')
      .select(
        'id, sponsor_name, is_anonymous, sponsor_tier, amount_paid, net_amount, fund_allocation, fund_percent, paid_at'
      )
      .eq('is_public', true)
      .order('paid_at', { ascending: false })
      .limit(50),
    admin.from('sponsorship_log').select('*', { count: 'exact', head: true }).eq('is_public', true),
  ])

  // Total Fund: Stripe webhook + trade fees → conscious_fund.current_balance (0 is valid; never || fallback)
  const totalFund = consciousFundBalanceMxn(fund ?? undefined)

  const causesSupported = (causes ?? []).length
  const monthlyAllocation = totalFund > 0 ? Math.floor(totalFund / 12) : 0

  const yourImpactXp = (userXp ?? []).reduce((sum, t) => sum + Number(t.amount), 0)

  // 1 vote per user per month (free-to-play)
  const votePower = 1
  const votesUsed = (myVotes ?? []).length

  const voteCountByCause: Record<string, number> = {}
  for (const v of allVotes ?? []) {
    const id = v.cause_id
    voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
  }

  const myVotesByCause: Record<string, number> = {}
  for (const v of myVotes ?? []) {
    const id = v.cause_id
    myVotesByCause[id] = (myVotesByCause[id] ?? 0) + 1
  }

  const causesWithVotes = (causes ?? []).map((c) => ({
    ...c,
    vote_count: voteCountByCause[c.id] ?? 0,
  }))

  const maxVotes = Math.max(1, ...Object.values(voteCountByCause))

  const sponsors = (sponsorMarkets ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    sponsor_name: (m as { sponsor_name?: string }).sponsor_name,
    sponsor_logo_url: (m as { sponsor_logo_url?: string }).sponsor_logo_url,
    sponsor_contribution: Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0),
  }))

  const causesBreakdown = buildCauseDistributionBreakdown(
    causesWithVotes.map((c) => ({
      id: c.id,
      name: c.name,
      vote_count: c.vote_count,
    })),
    Number(fund?.total_disbursed ?? 0),
    totalFund
  )

  const sponsorshipLogs: SponsorshipLogPublic[] = (sponsorshipLogRows ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: String(r.id),
      sponsor_name: String(r.sponsor_name ?? ''),
      is_anonymous: Boolean(r.is_anonymous),
      sponsor_tier: String(r.sponsor_tier ?? 'starter'),
      amount_paid: Number(r.amount_paid),
      net_amount: Number(r.net_amount),
      fund_allocation: Number(r.fund_allocation),
      fund_percent: Number(r.fund_percent),
      paid_at: String(r.paid_at),
    }
  })

  return {
    totalFund,
    causesSupported,
    monthlyAllocation,
    yourImpactXp,
    causes: causesWithVotes,
    cycle,
    votePower,
    votesUsed,
    myVotesByCause,
    maxVotes,
    sponsors,
    totalDisbursed: Number(fund?.total_disbursed ?? 0),
    sponsorshipLogs,
    sponsorshipLogTotal: sponsorshipLogCount ?? 0,
    causesBreakdown,
  }
}

export default async function PredictionsFundPage() {
  const user = await getCurrentUser()
  const data = await getFundData(user?.id ?? null)

  return (
    <FundClient
      totalFund={data.totalFund}
      causesSupported={data.causesSupported}
      monthlyAllocation={data.monthlyAllocation}
      yourImpactXp={data.yourImpactXp}
      causes={data.causes}
      cycle={data.cycle}
      votePower={data.votePower}
      votesUsed={data.votesUsed}
      myVotesByCause={data.myVotesByCause}
      maxVotes={data.maxVotes}
      sponsors={data.sponsors}
      totalDisbursed={data.totalDisbursed}
      sponsorshipLogs={data.sponsorshipLogs}
      sponsorshipLogTotal={data.sponsorshipLogTotal}
      causesBreakdown={data.causesBreakdown}
      isAuthenticated={!!user}
    />
  )
}
