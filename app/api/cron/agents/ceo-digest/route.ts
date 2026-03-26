import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const dynamic = 'force-dynamic'

/** CEO digest loads metrics + Claude + Resend; must exceed default 30s on busy DBs */
export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const { runId } = await cronHealthCheck('ceo-digest', supabase)

  try {
    const { runCeoDigest } = await import('@/lib/agents/ceo-digest')
    const result = await runCeoDigest()

    if (!result.success) {
      await cronHealthComplete(runId, 'ceo-digest', supabase, {
        success: false,
        error: result.error ?? 'CEO digest returned success: false',
      })
      return Response.json(result, { status: 500 })
    }

    await cronHealthComplete(runId, 'ceo-digest', supabase, {
      success: true,
      summary: JSON.stringify(result),
    })
    return Response.json(result)
  } catch (error) {
    await cronHealthComplete(runId, 'ceo-digest', supabase, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'Cron failed' }, { status: 500 })
  }
}
