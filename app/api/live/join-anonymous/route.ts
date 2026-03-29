import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { alias, emoji, session_id } = body as {
      alias?: string
      emoji?: string
      session_id?: string
    }

    if (!alias || alias.trim().length < 2 || alias.trim().length > 20) {
      return NextResponse.json({ error: 'Alias must be 2-20 characters' }, { status: 400 })
    }

    if (!session_id || !UUID_REGEX.test(session_id)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    const cleanAlias = alias
      .trim()
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ _-]/g, '')
      .slice(0, 20)

    if (cleanAlias.length < 2) {
      return NextResponse.json({ error: 'Alias must be 2-20 characters' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('anonymous_participants')
      .select('*')
      .eq('session_id', session_id)
      .maybeSingle()

    if (existing) {
      const res = NextResponse.json({ participant: existing })
      setParticipantCookies(res, session_id, existing.alias, existing.avatar_emoji ?? '🎯')
      return res
    }

    const { data: participant, error } = await supabase
      .from('anonymous_participants')
      .insert({
        session_id,
        alias: cleanAlias,
        avatar_emoji: emoji?.trim() || '🎯',
      })
      .select()
      .single()

    if (error) {
      console.error('[join-anonymous]', error)
      return NextResponse.json(
        { error: 'Failed to join. Try a different alias.' },
        { status: 500 }
      )
    }

    const res = NextResponse.json({ participant })
    setParticipantCookies(res, session_id, participant.alias, participant.avatar_emoji ?? '🎯')
    return res
  } catch (e) {
    console.error('[join-anonymous]', e)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}

function setParticipantCookies(
  res: NextResponse,
  sessionId: string,
  alias: string,
  emoji: string
) {
  const maxAge = 60 * 60 * 24 * 7
  const base = { path: '/', maxAge, sameSite: 'lax' as const, httpOnly: true }
  res.cookies.set('cc_session', sessionId, {
    ...base,
    secure: process.env.NODE_ENV === 'production',
  })
  res.cookies.set('cc_alias', encodeURIComponent(alias), {
    ...base,
    secure: process.env.NODE_ENV === 'production',
  })
  res.cookies.set('cc_emoji', encodeURIComponent(emoji), {
    ...base,
    secure: process.env.NODE_ENV === 'production',
  })
}
