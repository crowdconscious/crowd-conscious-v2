import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const dynamic = 'force-dynamic'

export const maxDuration = 300

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createAdminClient()
  const { runId } = await cronHealthCheck('inbox-curator', supabase)

  try {
    const { runInboxCurator } = await import('@/lib/agents/inbox-curator')
    const result = await runInboxCurator()

    if (!result.success) {
      await cronHealthComplete(runId, 'inbox-curator', supabase, {
        success: false,
        error: result.error ?? 'inbox-curator returned success: false',
      })
      return Response.json(result, { status: 500 })
    }

    await cronHealthComplete(runId, 'inbox-curator', supabase, {
      success: true,
      summary: JSON.stringify(result),
    })
    return Response.json(result)
  } catch (error) {
    await cronHealthComplete(runId, 'inbox-curator', supabase, {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'Cron failed' }, { status: 500 })
  }
}
