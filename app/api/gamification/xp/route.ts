import { NextResponse } from 'next/server'

/**
 * Retired (Modelo Consciente): XP and achievements were retired; history is archived.
 * Kept as a 410 so old clients get a clear answer.
 */
export const dynamic = 'force-static'

function gone() {
  return NextResponse.json(
    { error: 'gone', message: 'XP and achievements were retired. See /predictions/acciones.' },
    { status: 410 }
  )
}

export async function GET() {
  return gone()
}

export async function POST() {
  return gone()
}
