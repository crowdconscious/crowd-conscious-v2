/**
 * Stub for Task 2 — GET /api/pulses/[pulseId]/simulation.
 *
 * Task 3 owns the viewer; the live replay API + open-pulse gate tests live
 * in Task 2. This stub returns 501 so the viewer loader can surface a clear
 * "endpoint not ready" state instead of a generic 404 from Next.
 *
 * When Task 2 lands, replace this file entirely — do not merge partial
 * auth/RLS guesses here.
 */

import { NextResponse } from 'next/server'
import { isSimViewerEnabled } from '@/lib/sim-viewer/is-enabled'

type Ctx = { params: Promise<{ pulseId: string }> }

export async function GET(_req: Request, _ctx: Ctx) {
  if (!isSimViewerEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(
    {
      error: 'Simulation replay API not implemented',
      code: 'TASK_2_PENDING',
      message:
        'Task 2 owns GET /api/pulses/[pulseId]/simulation and the open-pulse access gate. Use /admin/sim-viewer/fixture until then.',
    },
    { status: 501 }
  )
}
