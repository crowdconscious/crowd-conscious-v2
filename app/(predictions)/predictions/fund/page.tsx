import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { FundClient } from './FundClient'
function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

async function getFundData(userId: string) {
  const supabase = await createClient()
  const cycle = getCurrentCycle()

  const [
    { data: sponsorMarkets },
    { data: causes },
    { data: allVotes },
    { data: myVotes },
    { data: fund },
    { data: userXp },
  ] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, title, sponsor_name, sponsor_logo_url, sponsor_contribution')
      .not('sponsor_name', 'is', null)
      .gt('sponsor_contribution', 0),
    supabase.from('fund_causes').select('*').eq('active', true).order('name'),
    supabase.from('fund_votes').select('cause_id').eq('cycle', cycle),
    supabase.from('fund_votes').select('cause_id').eq('user_id', userId).eq('cycle', cycle),
    supabase.from('conscious_fund').select('current_balance, total_collected, total_disbursed').limit(1).single(),
    supabase
      .from('xp_transactions')
      .select('amount')
      .eq('user_id', userId)
      .in('action_type', ['prediction_vote', 'prediction_correct']),
  ])

  // Total Fund: use actual balance from conscious_fund (updated by Stripe webhook on sponsor payments + trade fees)
  const totalFund = Math.max(
    0,
    Number(fund?.current_balance ?? 0) ||
      Math.max(0, Number(fund?.total_collected ?? 0) - Number(fund?.total_disbursed ?? 0))
  )

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
  }
}

export default async function PredictionsFundPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getFundData(user.id)

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
    />
  )
}
