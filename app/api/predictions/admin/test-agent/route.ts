import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const isDev = process.env.NODE_ENV === 'development'
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  const hasValidAuth =
    isDev ||
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET

  if (!hasValidAuth) {
    return Response.json(
      {
        error:
          'Unauthorized. Pass ?secret=YOUR_CRON_SECRET or set authorization header.',
      },
      { status: 401 }
    )
  }

  const agentName = searchParams.get('agent')

  if (!agentName) {
    return Response.json(
      {
        error: 'Specify ?agent=AGENT_NAME',
        available: ['ceo-digest', 'content-creator', 'news-monitor', 'inbox-curator'],
        usage: '/api/predictions/admin/test-agent?agent=ceo-digest&secret=YOUR_CRON_SECRET',
      },
      { status: 400 }
    )
  }

  try {
    let result: unknown
    const startTime = Date.now()

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
        return Response.json(
          {
            error: `Unknown agent: ${agentName}`,
            available: ['ceo-digest', 'content-creator', 'news-monitor', 'inbox-curator'],
          },
          { status: 400 }
        )
    }

    return Response.json({
      success: true,
      agent: agentName,
      duration_ms: Date.now() - startTime,
      result,
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(`[TEST-AGENT] ${agentName} failed:`, err)
    return Response.json(
      {
        success: false,
        agent: agentName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        hint: 'Check Vercel logs for more detail: Vercel Dashboard → Deployments → Functions → Logs',
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 120
