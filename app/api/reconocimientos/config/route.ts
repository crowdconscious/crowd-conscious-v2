import { NextResponse } from 'next/server'
import { getReconocimientosConfig } from '@/lib/reconocimientos'

/**
 * Public config for Reconocimientos.
 * Mobile reads this so one Vercel env change lights up web + app.
 * Contract: { enabled: boolean, intakeUrl: string | null }
 * intakeUrl is the absolute /reconoce URL (no src). No auth. No secrets.
 */
export async function GET() {
  const config = getReconocimientosConfig()
  return NextResponse.json(
    { enabled: config.enabled, intakeUrl: config.intakeUrl },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  )
}
