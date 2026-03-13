import { createClient } from '@/lib/supabase-server'
import { getCurrentUser, AuthSessionExpiredError } from '@/lib/auth-server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof AuthSessionExpiredError) {
      return new Response(null, { status: 401 })
    }
    console.error('Mark read error:', err)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
