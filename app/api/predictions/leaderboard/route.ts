import { NextResponse } from 'next/server'

/**
 * Retired (Modelo Consciente): there are no public rankings.
 * Kept as a 410 so old clients get a clear answer; removed fully in XP stage 3.
 */
export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json(
    { error: 'gone', message: 'Rankings were retired. See /predictions/acciones.' },
    { status: 410 }
  )
}
