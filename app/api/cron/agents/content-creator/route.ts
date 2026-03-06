export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runContentCreator } = await import('@/lib/agents/content-creator')
  const result = await runContentCreator()
  return Response.json(result)
}

export const maxDuration = 45
