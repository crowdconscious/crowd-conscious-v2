import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

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

    const { id } = (await request.json()) as { id?: string }
    if (!id) {
      return Response.json({ error: 'id required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('agent_content')
      .update({ published: true })
      .eq('id', id)
      .in('content_type', ['market_suggestion', 'market_insight'])

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Dismiss suggestion error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
