import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CC_SESSION = 'cc_session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      const cookieStore = await cookies()
      const guestId = cookieStore.get(CC_SESSION)?.value
      if (!guestId || !UUID_REGEX.test(guestId)) {
        return NextResponse.json({ vote: null }, { status: 200 })
      }

      const admin = createAdminClient()

      const { data: participant } = await admin
        .from('anonymous_participants')
        .select('id')
        .eq('session_id', guestId)
        .is('converted_to_user_id', null)
        .maybeSingle()

      let voteRow:
        | {
            outcome_id: string
            confidence: number
            xp_earned: number
            is_correct: boolean | null
            bonus_xp: number | null
            created_at: string
          }
        | null = null

      if (participant?.id) {
        const { data } = await admin
          .from('market_votes')
          .select('id, outcome_id, confidence, xp_earned, is_correct, bonus_xp, created_at')
          .eq('market_id', id)
          .eq('anonymous_participant_id', participant.id)
          .maybeSingle()
        voteRow = data
      }

      if (!voteRow) {
        const { data: legacy } = await admin
          .from('market_votes')
          .select('id, outcome_id, confidence, xp_earned, is_correct, bonus_xp, created_at')
          .eq('market_id', id)
          .eq('user_id', guestId)
          .eq('is_anonymous', true)
          .maybeSingle()
        voteRow = legacy
      }

      if (!voteRow) {
        return NextResponse.json({ vote: null }, { status: 200 })
      }

      const { data: outcomeRow } = await admin
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
        is_anonymous: true as const,
      }

      return NextResponse.json({ vote })
    }

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
      is_anonymous: false as const,
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
