import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const voteSchema = z.object({
  cause_id: z.string().uuid(),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CC_SESSION = 'cc_session'
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180 // 180 days

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

function generateAlias(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `Anónimo-${n}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = voteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cause_id' }, { status: 400 })
    }
    const { cause_id } = parsed.data
    const cycle = getCurrentCycle()

    const user = await getCurrentUser()

    // Validate cause (shared branch).
    const adminForValidation = createAdminClient()
    const { data: cause } = await adminForValidation
      .from('fund_causes')
      .select('id, active')
      .eq('id', cause_id)
      .maybeSingle()

    if (!cause || !(cause as { active?: boolean }).active) {
      return NextResponse.json({ error: 'Cause not found' }, { status: 404 })
    }

    // -------- Authenticated path --------
    if (user) {
      const supabase = await createClient()
      const votePower = 1
      const { data: existingVotes } = await supabase
        .from('fund_votes')
        .select('id')
        .eq('user_id', user.id)
        .eq('cycle', cycle)
      if ((existingVotes ?? []).length >= votePower) {
        return NextResponse.json(
          { error: 'No votes remaining', votesUsed: (existingVotes ?? []).length, votePower },
          { status: 400 }
        )
      }

      const { error } = await supabase.from('fund_votes').insert({
        user_id: user.id,
        cause_id,
        cycle,
      })
      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'Ya votaste por esta causa este ciclo' },
            { status: 400 }
          )
        }
        console.error('Fund vote insert error (auth):', error)
        return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
      }

      await supabase.rpc('check_achievements', {
        p_user_id: user.id,
        p_action_type: 'fund_vote',
        p_action_id: null,
      })

      return NextResponse.json({ success: true })
    }

    // -------- Anonymous path --------
    const cookieStore = await cookies()
    let sessionId = cookieStore.get(CC_SESSION)?.value
    const setSessionCookie = !sessionId || !UUID_REGEX.test(sessionId)
    if (setSessionCookie) sessionId = randomUUID()

    const admin = createAdminClient()

    // Find or create the anonymous_participants row tied to this session.
    const { data: existingParticipant } = await admin
      .from('anonymous_participants')
      .select('id')
      .eq('session_id', sessionId!)
      .is('converted_to_user_id', null)
      .maybeSingle()

    let participantId: string | null =
      (existingParticipant as { id?: string } | null)?.id ?? null

    if (!participantId) {
      const { data: created, error: createErr } = await admin
        .from('anonymous_participants')
        .insert({
          session_id: sessionId!,
          alias: generateAlias(),
          avatar_emoji: '🌱',
        })
        .select('id')
        .single()
      if (createErr || !created) {
        console.error('[fund vote anon] create participant failed:', createErr)
        return NextResponse.json({ error: 'Could not start anon session' }, { status: 500 })
      }
      participantId = (created as { id: string }).id
    }

    // One anon vote per participant per cycle.
    const { data: existingAnonVotes } = await admin
      .from('fund_votes')
      .select('id')
      .eq('anonymous_participant_id', participantId)
      .eq('cycle', cycle)
    if ((existingAnonVotes ?? []).length >= 1) {
      const res = NextResponse.json(
        { error: 'Ya votaste este ciclo desde este navegador' },
        { status: 400 }
      )
      if (setSessionCookie) {
        res.cookies.set(CC_SESSION, sessionId!, {
          path: '/',
          maxAge: SESSION_COOKIE_MAX_AGE,
          sameSite: 'lax',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        })
      }
      return res
    }

    const { error: insertErr } = await admin.from('fund_votes').insert({
      cause_id,
      cycle,
      anonymous_participant_id: participantId,
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'Ya votaste por esta causa este ciclo' },
          { status: 400 }
        )
      }
      console.error('Fund vote insert error (anon):', insertErr)
      return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
    }

    const res = NextResponse.json({ success: true, anonymous: true })
    if (setSessionCookie) {
      res.cookies.set(CC_SESSION, sessionId!, {
        path: '/',
        maxAge: SESSION_COOKIE_MAX_AGE,
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
    }
    return res
  } catch (err) {
    console.error('Vote route error:', err)
    return NextResponse.json({ error: 'Failed to cast vote' }, { status: 500 })
  }
}
