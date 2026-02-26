import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const cycle = getCurrentCycle()

    const [
      { data: votes, error },
      { data: trades },
    ] = await Promise.all([
      supabase
        .from('fund_votes')
        .select('cause_id')
        .eq('user_id', user.id)
        .eq('cycle', cycle),
      supabase
        .from('prediction_trades')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'filled'),
    ])

    if (error) {
      console.error('My votes fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
    }

    const voteCountByCause: Record<string, number> = {}
    for (const v of votes ?? []) {
      const id = v.cause_id
      voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
    }

    const totalVolume = (trades ?? []).reduce((s, t) => s + Number(t.amount), 0)
    const hasTraded = totalVolume > 0
    const rawPower = Math.floor(totalVolume / 500)
    const votePower = Math.min(10, Math.max(hasTraded ? 1 : 0, rawPower))
    const votesUsed = (votes ?? []).length

    return NextResponse.json({
      votes: voteCountByCause,
      cycle,
      votePower,
      votesUsed,
    })
  } catch (err) {
    console.error('My votes route error:', err)
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
  }
}
