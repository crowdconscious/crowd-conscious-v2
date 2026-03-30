import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import type { Database } from '@/types/database'

type AgentContent = Database['public']['Tables']['agent_content']['Row']

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10))

    const supabase = await createClient()
    const { data, error, count } = await supabase
      .from('agent_content')
      .select('*', { count: 'exact' })
      .eq('published', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('agent-content list error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      items: (data ?? []) as AgentContent[],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    })
  } catch (err) {
    console.error('agent-content route:', err)
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 })
  }
}
