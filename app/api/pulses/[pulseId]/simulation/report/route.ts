/**
 * GET /api/pulses/[pulseId]/simulation/report
 *
 *   ?tier=summary|full   (default summary)
 *   ?runId=<uuid>        optional
 *   ?meta=1              JSON eligibility (no PDF)
 *
 * Feature flag: SIM_REPORT_ENABLED=true
 * Summary: closed + revealed Pulse (or admin). Full: admin | is_pulse_client | allowlist.
 */

import { NextResponse } from 'next/server'

import { AuthSessionExpiredError, getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  canDownloadFullReport,
  decideReportAccess,
  isReportEligible,
  type SimReportTier,
} from '@/lib/sim-report/access'
import { isSimReportEnabled } from '@/lib/sim-report/flag'
import { loadSimReportData } from '@/lib/sim-report/load-report'
import { generateSimFullPdf } from '@/lib/sim-report/pdf-full'
import { generateSimSummaryPdf } from '@/lib/sim-report/pdf-summary'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type Ctx = { params: Promise<{ pulseId: string }> }

function parseTier(raw: string | null): SimReportTier {
  return raw === 'full' ? 'full' : 'summary'
}

/** True when any active sponsor_accounts row for this user is a Pulse client. */
async function userIsPulseClient(user: {
  id: string
  email?: string | null
}): Promise<boolean> {
  const admin = createAdminClient()
  const email = (user.email ?? '').toLowerCase().trim()
  const [byId, byEmail] = await Promise.all([
    admin
      .from('sponsor_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_pulse_client', true)
      .limit(1),
    email
      ? admin
          .from('sponsor_accounts')
          .select('id')
          .ilike('contact_email', email)
          .eq('status', 'active')
          .eq('is_pulse_client', true)
          .limit(1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])
  return (byId.data?.length ?? 0) > 0 || (byEmail.data?.length ?? 0) > 0
}

async function resolveCaller(): Promise<{
  isAdmin: boolean
  isPulseClient: boolean
  email: string | null
}> {
  try {
    const user = await getCurrentUser()
    const isAdmin = isAdminUser(user)
    const isPulseClient = user ? await userIsPulseClient(user) : false
    return {
      isAdmin,
      isPulseClient,
      email: user?.email ?? null,
    }
  } catch (err) {
    if (err instanceof AuthSessionExpiredError) {
      return { isAdmin: false, isPulseClient: false, email: null }
    }
    return { isAdmin: false, isPulseClient: false, email: null }
  }
}

export async function GET(req: Request, ctx: Ctx) {
  const { pulseId } = await ctx.params
  const url = new URL(req.url)
  const tier = parseTier(url.searchParams.get('tier'))
  const runId = url.searchParams.get('runId')
  const metaOnly = url.searchParams.get('meta') === '1'

  if (!isSimReportEnabled()) {
    if (metaOnly) {
      return NextResponse.json({
        enabled: false,
        eligible: false,
        canFull: false,
      })
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const caller = await resolveCaller()

  if (metaOnly) {
    // Lightweight: load just enough for eligibility without rendering PDF/map.
    const loaded = await loadSimReportData({
      marketId: pulseId,
      runId,
      tier: 'summary',
      includeMap: false,
    })
    if (!loaded) {
      return NextResponse.json({
        enabled: true,
        eligible: false,
        canFull: false,
      })
    }
    const eligible = isReportEligible({
      pulseStatus: loaded.pulseStatus,
      runRevealedAt: loaded.runRevealedAt,
      runIsFixture: loaded.runIsFixture,
      isAdmin: caller.isAdmin,
    })
    const canFull =
      eligible &&
      canDownloadFullReport({
        isAdmin: caller.isAdmin,
        isPulseClient: caller.isPulseClient,
        userEmail: caller.email,
      })
    return NextResponse.json({
      enabled: true,
      eligible,
      canFull,
      runId: loaded.runId,
      upsellUrl: '/para-marcas',
    })
  }

  const loaded = await loadSimReportData({
    marketId: pulseId,
    runId,
    tier,
    includeMap: tier === 'full',
  })

  if (!loaded) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const decision = decideReportAccess({
    tier,
    eligibility: {
      pulseStatus: loaded.pulseStatus,
      runRevealedAt: loaded.runRevealedAt,
      runIsFixture: loaded.runIsFixture,
      isAdmin: caller.isAdmin,
    },
    fullAccess: {
      isAdmin: caller.isAdmin,
      isPulseClient: caller.isPulseClient,
      userEmail: caller.email,
    },
  })

  if (!decision.allow) {
    if (decision.reason === 'forbidden') {
      return NextResponse.json(
        {
          error: 'forbidden',
          message: 'Reporte completo para clientes',
          upsellUrl: '/para-marcas',
        },
        { status: 403 },
      )
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pdf =
    tier === 'full'
      ? await generateSimFullPdf(loaded.data)
      : await generateSimSummaryPdf(loaded.data)

  const shortId = pulseId.slice(0, 8)
  const filename =
    tier === 'full'
      ? `crowd-conscious-sim-completo-${shortId}.pdf`
      : `crowd-conscious-sim-resumen-${shortId}.pdf`

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Sim-Report-Tier': tier,
      'X-Sim-Run-Id': loaded.runId,
    },
  })
}
