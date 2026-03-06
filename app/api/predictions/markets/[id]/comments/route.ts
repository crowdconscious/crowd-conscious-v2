import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from('market_comments')
      .select('id, user_id, content, created_at')
      .eq('market_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return Response.json({ comments: [] })
    }

    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.full_name || 'Anonymous'])
    )

    const withNames = (comments ?? []).map((c) => ({
      ...c,
      username: profileMap.get(c.user_id) || 'Anonymous',
    }))

    return Response.json({ comments: withNames })
  } catch (err) {
    console.error('Comments fetch error:', err)
    return Response.json({ comments: [] })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const content = body.content?.trim()

    if (!content) {
      return Response.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('market_comments')
      .insert({
        market_id: id,
        user_id: user.id,
        content,
      })
      .select('id, user_id, content, created_at')
      .single()

    if (error) {
      console.error('Comment insert error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    return Response.json({
      comment: {
        ...data,
        username: profile?.full_name || 'Anonymous',
      },
    })
  } catch (err) {
    console.error('Comment error:', err)
    return Response.json({ error: 'Failed to post' }, { status: 500 })
  }
}
