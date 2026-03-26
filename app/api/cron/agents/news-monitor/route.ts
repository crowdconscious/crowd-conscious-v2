import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const dynamic = 'force-dynamic'

/** RSS + social signals + Claude; keep aligned with vercel.json */
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const { runId } = await cronHealthCheck('news-monitor', supabase)

  try {
    const { runNewsMonitor } = await import('@/lib/agents/news-monitor')
    const result = await runNewsMonitor({ includeSocial: true })

    if (!result.success) {
      await cronHealthComplete(runId, 'news-monitor', supabase, {
        success: false,
        error: result.error ?? 'news-monitor returned success: false',
      })
      return Response.json(result, { status: 500 })
    }

    await cronHealthComplete(runId, 'news-monitor', supabase, {
      success: true,
      summary: JSON.stringify(result),
    })
    return Response.json(result)
  } catch (error) {
    await cronHealthComplete(runId, 'news-monitor', supabase, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'Cron failed' }, { status: 500 })
  }
}
