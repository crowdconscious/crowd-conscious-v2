import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

const CC_SESSION = 'cc_session'
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params
    if (!UUID_REGEX.test(postId)) {
      return NextResponse.json({ error: 'Invalid post' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('blog_comments')
      .select('id, author_name, author_avatar, content, created_at, user_id, anonymous_participant_id')
      .eq('blog_post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[blog comments GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: data ?? [] })
  } catch (e) {
    console.error('[blog comments GET]', e)
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await context.params
    if (!UUID_REGEX.test(postId)) {
      return NextResponse.json({ error: 'Invalid post' }, { status: 400 })
    }

    const body = await request.json()
    const content = String(body.content ?? '').trim()
    if (content.length < 1 || content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be 1–1000 characters' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: post } = await admin
      .from('blog_posts')
      .select('id')
      .eq('id', postId)
      .eq('status', 'published')
      .maybeSingle()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const user = await getCurrentUser()
    if (user) {
      const { data: prof } = await admin
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      const authorName =
        prof?.full_name?.trim() ||
        (user.email ? user.email.split('@')[0] : null) ||
        'Usuario'

      const { data: row, error } = await admin
        .from('blog_comments')
        .insert({
          blog_post_id: postId,
          user_id: user.id,
          author_name: authorName,
          author_avatar: prof?.avatar_url ?? null,
          content,
        })
        .select('id, author_name, author_avatar, content, created_at')
        .single()

      if (error) {
        console.error('[blog comments POST]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ comment: row })
    }

    const cookieStore = await cookies()
    const sessionId = cookieStore.get(CC_SESSION)?.value
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: 'Sign in or choose an alias to comment', requiresAuth: true }, { status: 401 })
    }

    const { data: participant } = await admin
      .from('anonymous_participants')
      .select('id, alias, avatar_emoji')
      .eq('session_id', sessionId)
      .is('converted_to_user_id', null)
      .maybeSingle()

    if (!participant?.id) {
      return NextResponse.json({ error: 'Choose an alias to comment', requiresAlias: true }, { status: 401 })
    }

    const { data: row, error } = await admin
      .from('blog_comments')
      .insert({
        blog_post_id: postId,
        anonymous_participant_id: participant.id,
        author_name: participant.alias,
        author_avatar: participant.avatar_emoji ?? null,
        content,
      })
      .select('id, author_name, author_avatar, content, created_at')
      .single()

    if (error) {
      console.error('[blog comments POST anon]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comment: row })
  } catch (e) {
    console.error('[blog comments POST]', e)
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 })
  }
}
