export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runCeoDigest } = await import('@/lib/agents/ceo-digest')
  const result = await runCeoDigest()
  return Response.json(result)
}

/** CEO digest loads metrics + Claude + Resend; must exceed default 30s on busy DBs */
export const maxDuration = 300
