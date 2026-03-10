export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runSponsorReport } = await import('@/lib/agents/sponsor-report')
  const result = await runSponsorReport()
  return Response.json(result)
}

export const maxDuration = 30
