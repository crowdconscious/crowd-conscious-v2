import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { extractYoutubeVideoId } from '@/lib/youtube'
import { LIVE_EVENT_TYPE_KEYS, type LiveEventTypeKey } from '@/lib/live-event-types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    let q = supabase.from('live_events').select('*')

    if (statusFilter === 'live') {
      q = q.eq('status', 'live')
    } else if (statusFilter === 'upcoming') {
      q = q.eq('status', 'scheduled').gte('match_date', new Date().toISOString())
    } else if (statusFilter === 'scheduled') {
      q = q.eq('status', 'scheduled')
    } else if (statusFilter === 'completed') {
      q = q.eq('status', 'completed')
    }

    const ascending = statusFilter === 'upcoming'
    const { data, error } = await q.order('match_date', { ascending })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ events: data ?? [] })
  } catch (e) {
    console.error('[GET /api/live/events]', e)
    return Response.json({ error: 'Failed to list events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      match_date,
      youtube_url,
      youtube_video_id: bodyVideoId,
      sponsor_name,
      sponsor_logo_url,
      cover_image_url,
      team_a_name,
      team_a_flag,
      team_b_name,
      team_b_flag,
      translations,
      event_type: bodyEventType,
      event_subtype,
      suggested_questions: bodySuggested,
    } = body

    if (!title?.trim() || !match_date) {
      return Response.json({ error: 'title and match_date are required' }, { status: 400 })
    }

    const event_type: LiveEventTypeKey =
      typeof bodyEventType === 'string' && (LIVE_EVENT_TYPE_KEYS as readonly string[]).includes(bodyEventType)
        ? (bodyEventType as LiveEventTypeKey)
        : 'soccer_match'

    const subtype =
      typeof event_subtype === 'string' && event_subtype.trim() ? event_subtype.trim() : null

    let suggested_questions: Record<string, unknown> = {}
    if (bodySuggested && typeof bodySuggested === 'object' && !Array.isArray(bodySuggested)) {
      suggested_questions = bodySuggested as Record<string, unknown>
    }

    const fromUrl = typeof youtube_url === 'string' ? extractYoutubeVideoId(youtube_url) : null
    const youtube_video_id =
      (typeof bodyVideoId === 'string' && bodyVideoId.trim()) || fromUrl || null

    const admin = createAdminClient()

    const { data: inserted, error: insErr } = await admin
      .from('live_events')
      .insert({
        title: title.trim(),
        description: description?.trim() ?? null,
        match_date,
        event_type,
        event_subtype: subtype,
        suggested_questions,
        youtube_url: typeof youtube_url === 'string' ? youtube_url.trim() || null : null,
        youtube_video_id,
        sponsor_name: sponsor_name?.trim() || null,
        sponsor_logo_url: sponsor_logo_url?.trim() || null,
        cover_image_url: typeof cover_image_url === 'string' ? cover_image_url.trim() || null : null,
        team_a_name: typeof team_a_name === 'string' ? team_a_name.trim() || null : null,
        team_a_flag: typeof team_a_flag === 'string' ? team_a_flag.trim() || null : null,
        team_b_name: typeof team_b_name === 'string' ? team_b_name.trim() || null : null,
        team_b_flag: typeof team_b_flag === 'string' ? team_b_flag.trim() || null : null,
        translations: translations && typeof translations === 'object' ? translations : {},
        created_by: user.id,
        status: 'scheduled',
      })
      .select('*')
      .single()

    if (insErr) {
      console.error('[POST /api/live/events]', insErr)
      return Response.json({ error: insErr.message }, { status: 400 })
    }

    return Response.json({ event: inserted })
  } catch (e) {
    console.error('[POST /api/live/events]', e)
    return Response.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
