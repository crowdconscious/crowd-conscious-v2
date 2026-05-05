import { NextResponse } from 'next/server'

import {
  getSponsorPulseReport,
  runSponsorPulseReport,
  type SponsorPulseReportSnapshot,
} from '@/lib/agents/sponsor-pulse-report-agent'
import { generateSponsorPulseReportPDF } from '@/lib/sponsor-pulse-report-pdf'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Bumped from 60s — we now auto-run the agent inline when no narrative is
// cached. Sonnet completion + PDF render fits comfortably in 90s; we
// reserve 120s for safety against cold starts.
export const maxDuration = 120

const STORAGE_BUCKET = 'sponsor-reports'

/**
 * Token-gated PDF download for the sponsor executive report.
 *
 * Validation flow:
 *   1. Resolve sponsor by access_token, status=active.
 *   2. Verify the requested market belongs to that account
 *      (sponsor_account_id match, or fallback by company_name / email).
 *   3. Read the cached agent narrative + snapshot. If missing, run the
 *      agent inline so the sponsor never sees a "not_ready" 503 — the
 *      whole point of the dashboard is they can pull a fresh,
 *      analysis-bearing PDF on demand. If the market still has too few
 *      votes to produce a narrative (<5), we render a clearly-labelled
 *      preliminary PDF instead of failing.
 *   4. Best-effort upload to `sponsor-reports/{market_id}-{ts}.pdf` for
 *      audit + email-attachment use; failures are non-fatal.
 *   5. Stream the PDF back inline so the browser can preview it.
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

  // Try the cache first. If the narrative is missing or only partially
  // filled, run the agent right here so the sponsor's download always
  // includes analysis (when possible) without bouncing through admin.
  let cached = await getSponsorPulseReport(marketId)
  let preliminaryReason: 'insufficient_votes' | 'agent_failed' | null = null

  const hasNarrative = !!(
    cached?.executive_summary && cached?.conviction_analysis
  )

  if (!hasNarrative) {
    const runResult = await runSponsorPulseReport(marketId)
    if (runResult.status === 'success') {
      cached = await getSponsorPulseReport(marketId)
    } else if (runResult.status === 'skipped') {
      // Most common skip reason: insufficient_votes (<5). The caller
      // still gets a real PDF, just labelled as "preliminary" with the
      // snapshot we have so far.
      preliminaryReason = 'insufficient_votes'
    } else {
      // Don't block the download on agent / Anthropic / network errors;
      // the sponsor still deserves the data part. We log + label the
      // PDF preliminary so they understand the analysis is missing for
      // a transient reason, not because we have nothing to say.
      console.error(
        '[sponsor-report-pdf] inline agent run failed:',
        runResult.error
      )
      preliminaryReason = 'agent_failed'
    }
  }

  const snapshot =
    cached?.snapshot_data && typeof cached.snapshot_data === 'object'
      ? (cached.snapshot_data as unknown as SponsorPulseReportSnapshot)
      : null

  const nextSteps = Array.isArray(cached?.next_steps)
    ? (cached!.next_steps as string[])
    : []

  // Mid-pulse PDFs get a "PRELIMINAR" stamp so a sponsor reading the file
  // a week later knows whether it's an interim or final view. Markets
  // that have actually closed (status=resolved/closed) get the unmarked
  // version because by then the report IS final.
  const marketIsClosed =
    market.status === 'resolved' || market.status === 'closed'
  const isPreliminary = !marketIsClosed || !!preliminaryReason

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
      executiveSummary: cached?.executive_summary ?? null,
      convictionAnalysis: cached?.conviction_analysis ?? null,
      nextSteps,
      snapshot,
      generatedAt: cached?.generated_at ?? new Date().toISOString(),
    },
    flags: {
      isPreliminary,
      preliminaryReason,
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
