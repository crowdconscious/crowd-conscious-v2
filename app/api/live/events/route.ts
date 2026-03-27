import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { extractYoutubeVideoId } from '@/lib/youtube'

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
      translations,
    } = body

    if (!title?.trim() || !match_date) {
      return Response.json({ error: 'title and match_date are required' }, { status: 400 })
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
        youtube_url: typeof youtube_url === 'string' ? youtube_url.trim() || null : null,
        youtube_video_id,
        sponsor_name: sponsor_name?.trim() || null,
        sponsor_logo_url: sponsor_logo_url?.trim() || null,
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
