import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { FundClient } from './FundClient'

async function getFundData(userId: string) {
  const supabase = await createClient()

  const [
    { data: fund },
    { data: transactions },
    { data: userTrades },
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
      .select('conscious_fund_amount')
      .eq('user_id', userId),
  ])

  const userContribution =
    userTrades?.reduce((sum, t) => sum + Number(t.conscious_fund_amount), 0) ?? 0

  return {
    fund: fund ?? {
      current_balance: 0,
      total_collected: 0,
      total_disbursed: 0,
    },
    transactions: transactions ?? [],
    userContribution,
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
    />
  )
}
