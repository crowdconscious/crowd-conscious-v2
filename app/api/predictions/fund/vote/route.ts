import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const voteSchema = z.object({
  cause_id: z.string().uuid(),
})

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cause_id' }, { status: 400 })
    }

    const { cause_id } = parsed.data
    const supabase = await createClient()
    const cycle = getCurrentCycle()

    // Free-to-play: 1 vote per user per month (not based on trades)
    const votePower = 1

    const { data: existingVotes } = await supabase
      .from('fund_votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('cycle', cycle)

    const votesUsed = (existingVotes ?? []).length
    if (votesUsed >= votePower) {
      return NextResponse.json(
        { error: 'No votes remaining', votesUsed, votePower },
        { status: 400 }
      )
    }

    const { data: cause } = await supabase
      .from('fund_causes')
      .select('id')
      .eq('id', cause_id)
      .eq('active', true)
      .single()

    if (!cause) {
      return NextResponse.json({ error: 'Cause not found' }, { status: 404 })
    }

    const { error } = await supabase.from('fund_votes').insert({
      user_id: user.id,
      cause_id: cause_id,
      cycle,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Already voted for this cause this cycle' },
          { status: 400 }
        )
      }
      console.error('Vote insert error:', error)
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    // Check and unlock achievements (Fund Voice, Fund Champion)
    await supabase.rpc('check_achievements', {
      p_user_id: user.id,
      p_action_type: 'fund_vote',
      p_action_id: null,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Vote route error:', err)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
