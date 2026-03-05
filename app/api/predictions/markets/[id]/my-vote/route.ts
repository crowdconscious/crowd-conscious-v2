import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const supabase = await createClient()
    const { data: voteRow, error } = await supabase
      .from('market_votes')
      .select('id, outcome_id, confidence, xp_earned, is_correct, bonus_xp, created_at')
      .eq('market_id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !voteRow) {
      return NextResponse.json({ vote: null }, { status: 200 })
    }

    const { data: outcomeRow } = await supabase
      .from('market_outcomes')
      .select('label')
      .eq('id', voteRow.outcome_id)
      .single()

    const vote = {
      outcome_id: voteRow.outcome_id,
      outcome_label: outcomeRow?.label ?? null,
      confidence: voteRow.confidence,
      xp_earned: voteRow.xp_earned,
      is_correct: voteRow.is_correct,
      bonus_xp: voteRow.bonus_xp ?? 0,
      created_at: voteRow.created_at,
    }

    return NextResponse.json({ vote })
  } catch (err) {
    console.error('My vote fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch vote' },
      { status: 500 }
    )
  }
}
