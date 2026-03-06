import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ votes: [] })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inbox_votes')
      .select('inbox_item_id')
      .eq('user_id', user.id)

    if (error) {
      console.error('My votes fetch error:', error)
      return Response.json({ votes: [] })
    }

    const votes = (data || []).map((v) => v.inbox_item_id)
    return Response.json({ votes })
  } catch (err) {
    console.error('My votes error:', err)
    return Response.json({ votes: [] })
  }
}
