import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { extractYoutubeVideoId } from '@/lib/youtube'
import { runLiveEventCompletedSideEffects } from '@/lib/live-event-completion'
import { LIVE_EVENT_TYPE_KEYS, type LiveEventTypeKey } from '@/lib/live-event-types'

type Props = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Props) {
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

    const { id } = await params
    const body = await request.json()

    const admin = createAdminClient()

    const { data: before } = await admin.from('live_events').select('*').eq('id', id).maybeSingle()

    const updates: Record<string, unknown> = {}
    if (typeof body.title === 'string') updates.title = body.title.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim() || null
    if (typeof body.match_date === 'string') updates.match_date = body.match_date
    if (typeof body.status === 'string') updates.status = body.status
    if (typeof body.youtube_url === 'string') {
      updates.youtube_url = body.youtube_url.trim() || null
      updates.youtube_video_id = extractYoutubeVideoId(body.youtube_url)
    }
    if (typeof body.youtube_video_id === 'string' && body.youtube_url === undefined) {
      updates.youtube_video_id = body.youtube_video_id.trim() || null
    }
    if (typeof body.sponsor_name === 'string') updates.sponsor_name = body.sponsor_name.trim() || null
    if (typeof body.sponsor_logo_url === 'string') updates.sponsor_logo_url = body.sponsor_logo_url.trim() || null
    if (typeof body.cover_image_url === 'string') updates.cover_image_url = body.cover_image_url.trim() || null
    if (typeof body.team_a_name === 'string') updates.team_a_name = body.team_a_name.trim() || null
    if (typeof body.team_a_flag === 'string') updates.team_a_flag = body.team_a_flag.trim() || null
    if (typeof body.team_b_name === 'string') updates.team_b_name = body.team_b_name.trim() || null
    if (typeof body.team_b_flag === 'string') updates.team_b_flag = body.team_b_flag.trim() || null
    if (body.translations && typeof body.translations === 'object') updates.translations = body.translations
    if (typeof body.event_type === 'string' && (LIVE_EVENT_TYPE_KEYS as readonly string[]).includes(body.event_type)) {
      updates.event_type = body.event_type as LiveEventTypeKey
    }
    if (body.event_subtype !== undefined) {
      updates.event_subtype = typeof body.event_subtype === 'string' ? body.event_subtype.trim() || null : null
    }
    if (body.suggested_questions !== undefined && body.suggested_questions && typeof body.suggested_questions === 'object') {
      updates.suggested_questions = body.suggested_questions
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await admin
      .from('live_events')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[PATCH /api/live/events/[id]]', error)
      return Response.json({ error: error.message }, { status: 400 })
    }

    const becameCompleted =
      typeof updates.status === 'string' &&
      updates.status === 'completed' &&
      before?.status !== 'completed' &&
      updated

    if (becameCompleted) {
      void runLiveEventCompletedSideEffects(admin, {
        id: updated.id,
        title: updated.title,
        total_fund_impact: updated.total_fund_impact,
        total_votes_cast: updated.total_votes_cast,
      }).catch((err) => console.error('[PATCH live event] completion side effects', err))
    }

    return Response.json({ event: updated })
  } catch (e) {
    console.error('[PATCH /api/live/events/[id]]', e)
    return Response.json({ error: 'Failed to update event' }, { status: 500 })
  }
}
