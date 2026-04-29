import { NextResponse } from 'next/server'

import {
  getSponsorPulseReport,
  type SponsorPulseReportSnapshot,
} from '@/lib/agents/sponsor-pulse-report-agent'
import { generateSponsorPulseReportPDF } from '@/lib/sponsor-pulse-report-pdf'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const STORAGE_BUCKET = 'sponsor-reports'

/**
 * Token-gated PDF download for the sponsor executive report.
 *
 * Validation flow mirrors the parent dashboard route:
 *   1. Resolve sponsor by access_token, status=active.
 *   2. Verify the requested market belongs to that account
 *      (sponsor_account_id match, or fallback by company_name / email).
 *   3. Read the cached agent narrative + snapshot. If absent, return
 *      503 with an explicit message instead of an empty PDF.
 *   4. Render PDF with jsPDF.
 *   5. Best-effort upload to `sponsor-reports/{market_id}-{ts}.pdf` for
 *      audit + email-attachment use; failures are non-fatal.
 *   6. Stream the PDF back inline so the browser can preview it.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string; marketId: string }> }
) {
  const { token, marketId } = await ctx.params
  const admin = createAdminClient()

  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, logo_url, contact_email, status')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()
  if (!account) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 404 })
  }

  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      'id, title, status, created_at, resolution_date, resolved_at, description_short, sponsor_account_id, sponsor_name, pulse_client_email'
    )
    .eq('id', marketId)
    .maybeSingle()

  if (
    !market ||
    !marketBelongsToSponsorAccount(market, {
      id: account.id,
      company_name: account.company_name,
      contact_email: account.contact_email,
    })
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const cached = await getSponsorPulseReport(marketId)
  if (!cached || (!cached.executive_summary && !cached.conviction_analysis)) {
    return NextResponse.json(
      {
        error: 'report_not_ready',
        message:
          'El reporte aún no se ha generado. Crowd Conscious avisará cuando esté listo.',
      },
      { status: 503 }
    )
  }

  const snapshot =
    cached.snapshot_data && typeof cached.snapshot_data === 'object'
      ? (cached.snapshot_data as unknown as SponsorPulseReportSnapshot)
      : null

  const nextSteps = Array.isArray(cached.next_steps)
    ? (cached.next_steps as string[])
    : []

  const logoBase64 = await fetchLogoAsDataUrl(account.logo_url ?? null)

  const buffer = generateSponsorPulseReportPDF({
    sponsor: {
      companyName: account.company_name ?? 'Patrocinador',
      logoBase64,
    },
    market: {
      title: market.title,
      descriptionShort: market.description_short ?? null,
      status: market.status ?? null,
      createdAt: market.created_at,
      resolutionDate: market.resolution_date ?? null,
      resolvedAt: market.resolved_at ?? null,
    },
    report: {
      executiveSummary: cached.executive_summary ?? null,
      convictionAnalysis: cached.conviction_analysis ?? null,
      nextSteps,
      snapshot,
      generatedAt: cached.generated_at,
    },
  })

  // Best-effort storage upload (audit trail + attachable in email later).
  try {
    const ts = Date.now()
    const path = `${marketId}-${ts}.pdf`
    const { error: upErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      })
    if (!upErr) {
      await admin
        .from('sponsor_pulse_reports')
        .update({ pdf_path: path, pdf_generated_at: new Date().toISOString() })
        .eq('market_id', marketId)
    } else {
      console.warn('[sponsor-report-pdf] storage upload failed:', upErr.message)
    }
  } catch (e) {
    console.warn('[sponsor-report-pdf] storage upload threw:', e)
  }

  const filename = `crowd-conscious-${marketId.slice(0, 8)}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

async function fetchLogoAsDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // jsPDF only handles PNG/JPEG reliably. We pass PNG and accept the
    // JPEGs that browsers ship as PNG-encodable; an exotic format simply
    // skips the logo.
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}
