import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** In-memory rate limit: one comment per 5s per actor key (best-effort). */
const rateWindowMs = 5000
const lastPostAt = new Map<string, number>()

function allowRate(key: string) {
  const now = Date.now()
  const prev = lastPostAt.get(key) ?? 0
  if (now - prev < rateWindowMs) return false
  lastPostAt.set(key, now)
  if (lastPostAt.size > 20_000) {
    const cutoff = now - rateWindowMs * 2
    for (const [k, t] of lastPostAt) {
      if (t < cutoff) lastPostAt.delete(k)
    }
  }
  return true
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    if (!eventId || !UUID_REGEX.test(eventId)) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: rows, error } = await supabase
      .from('live_comments')
      .select(
        'id, live_event_id, user_id, anonymous_participant_id, content, author_display_name, author_avatar, created_at'
      )
      .eq('live_event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const chronological = [...(rows ?? [])].reverse()
    return NextResponse.json({ comments: chronological })
  } catch (e) {
    console.error('[GET /api/live/comments]', e)
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const live_event_id = typeof body.live_event_id === 'string' ? body.live_event_id : ''
    const contentRaw = typeof body.content === 'string' ? body.content.trim() : ''

    if (!live_event_id || !UUID_REGEX.test(live_event_id)) {
      return NextResponse.json({ error: 'live_event_id required' }, { status: 400 })
    }
    if (contentRaw.length < 1 || contentRaw.length > 500) {
      return NextResponse.json({ error: 'Content must be 1–500 characters' }, { status: 400 })
    }

    const admin = createAdminClient()
    const user = await getCurrentUser()

    if (user) {
      const key = `u:${user.id}:${live_event_id}`
      if (!allowRate(key)) {
        return NextResponse.json({ error: 'Wait a few seconds before posting again' }, { status: 429 })
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      const display =
        profile?.full_name?.trim() ||
        (typeof profile?.email === 'string' ? profile.email.split('@')[0] : null) ||
        'User'
      const avatar =
        typeof profile?.avatar_url === 'string' && profile.avatar_url.trim()
          ? profile.avatar_url.trim()
          : '👤'

      const { data: inserted, error } = await admin
        .from('live_comments')
        .insert({
          live_event_id,
          user_id: user.id,
          anonymous_participant_id: null,
          content: contentRaw,
          author_display_name: display,
          author_avatar: avatar,
        })
        .select(
          'id, live_event_id, user_id, anonymous_participant_id, content, author_display_name, author_avatar, created_at'
        )
        .single()

      if (error) {
        console.error('[POST /api/live/comments]', error)
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ comment: inserted })
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get('cc_session')?.value
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: 'Sign in or join with an alias to comment' }, { status: 401 })
    }

    const { data: participant, error: pErr } = await admin
      .from('anonymous_participants')
      .select('id, alias, avatar_emoji')
      .eq('session_id', sessionId)
      .is('converted_to_user_id', null)
      .maybeSingle()

    if (pErr || !participant?.id) {
      return NextResponse.json({ error: 'Invalid anonymous session' }, { status: 401 })
    }

    const key = `a:${participant.id}:${live_event_id}`
    if (!allowRate(key)) {
      return NextResponse.json({ error: 'Wait a few seconds before posting again' }, { status: 429 })
    }

    const display = participant.alias?.trim() || 'Guest'
    const avatar =
      typeof participant.avatar_emoji === 'string' && participant.avatar_emoji.trim()
        ? participant.avatar_emoji.trim()
        : '🎯'

    const { data: inserted, error } = await admin
      .from('live_comments')
      .insert({
        live_event_id,
        user_id: null,
        anonymous_participant_id: participant.id,
        content: contentRaw,
        author_display_name: display,
        author_avatar: avatar,
      })
      .select(
        'id, live_event_id, user_id, anonymous_participant_id, content, author_display_name, author_avatar, created_at'
      )
      .single()

    if (error) {
      console.error('[POST /api/live/comments]', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ comment: inserted })
  } catch (e) {
    console.error('[POST /api/live/comments]', e)
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  }
}
