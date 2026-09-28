/**
 * Serves the marked simulation fixture for admin / local preview.
 * Never present these numbers as real results.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import {
  isSimViewerEnabled,
  isSimViewerFixtureOpen,
} from '@/lib/sim-viewer-flag'
import { loadSimulationFixture } from '@/lib/sim-viewer/load-fixture'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSimViewerEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const open = isSimViewerFixtureOpen()
  if (!open) {
    const user = await getCurrentUser()
    if (!user || !isAdminUser(user)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const data = loadSimulationFixture()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Sim-Fixture': '1',
    },
  })
}
