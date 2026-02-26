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
    { data: fund },
    { data: transactions },
    { data: userTrades },
    { data: causes },
    { data: allVotes },
    { data: myVotes },
  ] = await Promise.all([
    supabase
      .from('conscious_fund')
      .select('current_balance, total_collected, total_disbursed')
      .limit(1)
      .single(),
    supabase
      .from('conscious_fund_transactions')
      .select(
        `
        id,
        amount,
        source_type,
        description,
        created_at,
        prediction_markets(id, title)
      `
      )
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('prediction_trades')
      .select('conscious_fund_amount, amount')
      .eq('user_id', userId),
    supabase.from('fund_causes').select('*').eq('active', true).order('name'),
    supabase.from('fund_votes').select('cause_id').eq('cycle', cycle),
    supabase.from('fund_votes').select('cause_id').eq('user_id', userId).eq('cycle', cycle),
  ])

  const userContribution =
    userTrades?.reduce((sum, t) => sum + Number(t.conscious_fund_amount), 0) ?? 0

  const totalVolume = (userTrades ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const hasTraded = totalVolume > 0
  const votePower = Math.min(10, Math.max(hasTraded ? 1 : 0, Math.floor(totalVolume / 500)))
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

  // Normalize prediction_markets: Supabase may return array or object for FK relation
  const normalizedTransactions = (transactions ?? []).map((tx) => {
    const pm = tx.prediction_markets
    const market = Array.isArray(pm) ? pm[0] : pm
    return {
      id: tx.id,
      amount: tx.amount,
      source_type: tx.source_type,
      description: tx.description,
      created_at: tx.created_at,
      prediction_markets: market ? { id: String(market.id), title: String(market.title) } : null,
    }
  })

  const nextDisbursement = new Date()
  nextDisbursement.setMonth(nextDisbursement.getMonth() + 1)
  nextDisbursement.setDate(0)

  return {
    fund: fund ?? {
      current_balance: 0,
      total_collected: 0,
      total_disbursed: 0,
    },
    transactions: normalizedTransactions,
    userContribution,
    causes: causesWithVotes,
    cycle,
    votePower,
    votesUsed,
    myVotesByCause,
    maxVotes,
    nextDisbursement: nextDisbursement.toISOString(),
  }
}

export default async function PredictionsFundPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const data = await getFundData(user.id)

  return (
    <FundClient
      fund={data.fund}
      transactions={data.transactions}
      userContribution={data.userContribution}
      causes={data.causes}
      cycle={data.cycle}
      votePower={data.votePower}
      votesUsed={data.votesUsed}
      myVotesByCause={data.myVotesByCause}
      maxVotes={data.maxVotes}
      nextDisbursement={data.nextDisbursement}
    />
  )
}
