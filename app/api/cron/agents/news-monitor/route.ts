export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runNewsMonitor } = await import('@/lib/agents/news-monitor')
  const result = await runNewsMonitor()
  return Response.json(result)
}

export const maxDuration = 30
