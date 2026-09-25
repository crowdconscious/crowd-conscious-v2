import { getReconocimientosConfig } from '@/lib/reconocimientos'

/**
 * Public config for Reconocimientos Phase 0 (external form link-out).
 * Mobile reads this so one Vercel env change lights up web + app.
 * No auth. No secrets — only the public form URL when enabled.
 */
export async function GET() {
  const config = getReconocimientosConfig()
  return Response.json(config, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
