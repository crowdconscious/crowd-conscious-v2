export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const agentName = body.agent ?? (request.nextUrl.searchParams.get('agent') as string)

    if (!agentName) {
      return NextResponse.json(
        { error: 'Specify agent' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    let result: unknown

    switch (agentName) {
      case 'ceo-digest': {
        const { runCeoDigest } = await import('@/lib/agents/ceo-digest')
        result = await runCeoDigest()
        break
      }
      case 'content-creator': {
        const { runContentCreator } = await import('@/lib/agents/content-creator')
        result = await runContentCreator()
        break
      }
      case 'news-monitor': {
        const { runNewsMonitor } = await import('@/lib/agents/news-monitor')
        result = await runNewsMonitor()
        break
      }
      case 'inbox-curator': {
        const { runInboxCurator } = await import('@/lib/agents/inbox-curator')
        result = await runInboxCurator()
        break
      }
      default:
        return NextResponse.json(
          { error: `Unknown agent: ${agentName}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      agent: agentName,
      duration_ms: Date.now() - startTime,
      result,
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Run agent error:', err)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? (error as Error).stack : undefined,
        hint: 'Check Vercel logs for more detail: Vercel Dashboard → Deployments → Functions → Logs',
      },
      { status: 500 }
    )
  }
}
