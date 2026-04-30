import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const includeArchived = new URL(request.url).searchParams.get('includeArchived') === '1'

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    let contentQuery = supabase
      .from('agent_content')
      .select('*')
      .in('agent_type', ['news_monitor', 'content_creator'])
      .order('created_at', { ascending: false })
      .limit(200)
    if (!includeArchived) contentQuery = contentQuery.is('archived_at', null)

    const [
      { data: allRuns },
      { data: allContent },
      { data: blogPosts },
    ] = await Promise.all([
      supabase
        .from('agent_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      contentQuery,
      supabase
        .from('blog_posts')
        .select(
          'id, slug, title, excerpt, status, published_at, created_at, category, cover_image_url, generated_by, pulse_market_id, agent_content_id'
        )
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const runs = (allRuns ?? []) as Array<{
      id: string
      agent_name: string
      status: string
      duration_ms: number
      tokens_input: number
      tokens_output: number
      cost_estimate: number
      error_message: string | null
      created_at: string
    }>

    const lastRunsByAgent: Record<string, (typeof runs)[0]> = {}
    for (const r of runs) {
      if (!lastRunsByAgent[r.agent_name]) {
        lastRunsByAgent[r.agent_name] = r
      }
    }

    const monthlyRuns = runs.filter((r) => r.created_at >= monthStart)
    const totalCostMonth = monthlyRuns.reduce((s, r) => s + Number(r.cost_estimate ?? 0), 0)
    const totalRunsMonth = monthlyRuns.length
    const totalErrorsMonth = monthlyRuns.filter((r) => r.status === 'error').length

    const content = (allContent ?? []) as Array<{
      id: string
      content_type: string
      title: string
      body: string
      metadata: Record<string, unknown>
      published: boolean
      created_at: string
    }>

    return NextResponse.json({
      agentRuns: runs.slice(0, 50),
      lastRunsByAgent,
      monthlyStats: {
        totalCost: totalCostMonth,
        totalRuns: totalRunsMonth,
        totalErrors: totalErrorsMonth,
      },
      agentContent: content,
      blogPosts: blogPosts ?? [],
    })
  } catch (err) {
    console.error('Agents API error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch' },
      { status: 500 }
    )
  }
}
