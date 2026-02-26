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

    const { data: causes, error: causesError } = await supabase
      .from('fund_causes')
      .select('*')
      .eq('active', true)
      .order('name')

    if (causesError) {
      console.error('Causes fetch error:', causesError)
      return NextResponse.json({ error: 'Failed to fetch causes' }, { status: 500 })
    }

    const { data: votes } = await supabase
      .from('fund_votes')
      .select('cause_id')
      .eq('cycle', cycle)

    const voteCountByCause: Record<string, number> = {}
    for (const v of votes ?? []) {
      const id = v.cause_id
      voteCountByCause[id] = (voteCountByCause[id] ?? 0) + 1
    }

    const causesWithVotes = (causes ?? []).map((c) => ({
      ...c,
      vote_count: voteCountByCause[c.id] ?? 0,
    }))

    return NextResponse.json({
      causes: causesWithVotes,
      cycle,
    })
  } catch (err) {
    console.error('Causes route error:', err)
    return NextResponse.json({ error: 'Failed to fetch causes' }, { status: 500 })
  }
}
