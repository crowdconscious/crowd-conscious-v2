import { NextRequest, NextResponse } from 'next/server'
import { runLugarConscienteJob } from '@/lib/lugar/repo'
import { LUGAR_CONSCIENTE_ENABLED } from '@/lib/lugar/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Daily: award Lugar Consciente, flag suspicious → pending, renew or lapse yearly. Bearer CRON_SECRET. */
export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!LUGAR_CONSCIENTE_ENABLED) return NextResponse.json({ skipped: 'disabled' })
  const out = await runLugarConscienteJob()
  console.log('[cron/lugar-consciente]', out)
  return NextResponse.json(out)
}
