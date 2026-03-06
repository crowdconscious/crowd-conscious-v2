export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runInboxCurator } = await import('@/lib/agents/inbox-curator')
  const result = await runInboxCurator()
  return Response.json(result)
}

export const maxDuration = 30
