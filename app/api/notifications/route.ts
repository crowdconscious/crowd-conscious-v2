import { createClient } from '@/lib/supabase-server'
import { getCurrentUser, AuthSessionExpiredError } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ notifications: [], unreadCount: 0 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, message, link, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Notifications fetch error:', error)
      return Response.json({ notifications: [], unreadCount: 0 })
    }

    const notifications = data ?? []
    const unreadCount = notifications.filter((n) => !n.read).length

    return Response.json({ notifications, unreadCount })
  } catch (err) {
    if (err instanceof AuthSessionExpiredError) {
      return new Response(null, { status: 401 })
    }
    console.error('Notifications error:', err)
    return Response.json({ notifications: [], unreadCount: 0 })
  }
}
