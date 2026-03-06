import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

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
    if (!id) {
      return Response.json({ error: 'Missing inbox item id' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user already voted
    const { data: existing } = await supabase
      .from('inbox_votes')
      .select('id')
      .eq('inbox_item_id', id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      // Remove vote
      await supabase
        .from('inbox_votes')
        .delete()
        .eq('inbox_item_id', id)
        .eq('user_id', user.id)
      return Response.json({ voted: false })
    } else {
      // Add vote
      const { error } = await supabase.from('inbox_votes').insert({
        inbox_item_id: id,
        user_id: user.id,
      })
      if (error) {
        console.error('Vote insert error:', error)
        return Response.json({ error: error.message }, { status: 500 })
      }

      // Notify submitter (if different from voter)
      const { data: item } = await supabase
        .from('conscious_inbox')
        .select('user_id, title')
        .eq('id', id)
        .single()
      if (item && item.user_id !== user.id) {
        try {
          const admin = createAdminClient()
          await admin.from('notifications').insert({
            user_id: item.user_id,
            type: 'inbox_upvote',
            title: 'Someone upvoted your idea',
            message: `"${item.title?.slice(0, 50) || 'Your submission'}..." received an upvote.`,
            link: '/predictions/inbox',
          })
        } catch {
          // ignore
        }
      }

      return Response.json({ voted: true })
    }
  } catch (err) {
    console.error('Vote error:', err)
    return Response.json({ error: 'Failed to vote' }, { status: 500 })
  }
}
