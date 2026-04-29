/**
 * One-call orchestration for "generate the executive report and (maybe)
 * email the sponsor". Used by:
 *   - app/api/cron/pulse-auto-resolve  (auto-fired when a Pulse resolves)
 *   - app/api/admin/agents/run/[name]   (manual admin run for one market)
 *
 * Email send is gated by SPONSOR_PULSE_REPORT_AUTO_EMAIL=1. Default OFF
 * during the MH pilot — the founder reviews the dashboard preview and
 * triggers the send manually with the same flag flipped to "1" or via
 * a one-shot admin-only "send email" button (TODO).
 */

import { runSponsorPulseReport } from '@/lib/agents/sponsor-pulse-report-agent'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { sponsorPulseReportReadyTemplate } from '@/lib/sponsor-pulse-emails'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app').replace(/\/$/, '')

export interface SponsorPulseReportPipelineResult {
  success: boolean
  marketId: string
  status: 'success' | 'skipped' | 'error'
  reason?: string
  emailSent: boolean
  error?: string
}

function isAutoEmailEnabled(): boolean {
  const raw = (process.env.SPONSOR_PULSE_REPORT_AUTO_EMAIL ?? '').trim()
  return raw === '1' || raw.toLowerCase() === 'true'
}

export async function generateSponsorReportAndMaybeEmail(
  marketId: string
): Promise<SponsorPulseReportPipelineResult> {
  const result = await runSponsorPulseReport(marketId)

  if (result.status === 'skipped') {
    return {
      success: true,
      marketId,
      status: 'skipped',
      reason: result.reason ?? 'skipped',
      emailSent: false,
    }
  }

  if (!result.success || result.status === 'error') {
    return {
      success: false,
      marketId,
      status: 'error',
      emailSent: false,
      error: result.error ?? 'agent_failed',
    }
  }

  if (!isAutoEmailEnabled()) {
    console.info('[sponsor-pulse-report-pipeline] auto-email disabled; report cached only')
    return { success: true, marketId, status: 'success', emailSent: false }
  }

  const admin = createAdminClient()

  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      'id, title, sponsor_account_id, sponsor_name, pulse_client_email'
    )
    .eq('id', marketId)
    .maybeSingle()
  if (!market) {
    return { success: true, marketId, status: 'success', emailSent: false }
  }

  // Resolve sponsor account: prefer sponsor_account_id; fall back to
  // company_name / pulse_client_email match. We need an access_token
  // for the dashboard URL, so a missing account == no email.
  let account: {
    id: string
    company_name: string | null
    contact_email: string | null
    access_token: string | null
  } | null = null
  if (market.sponsor_account_id) {
    const { data } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, contact_email, access_token')
      .eq('id', market.sponsor_account_id)
      .maybeSingle()
    account = data ?? null
  }
  if (!account && market.sponsor_name) {
    const { data } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, contact_email, access_token')
      .ilike('company_name', market.sponsor_name)
      .maybeSingle()
    account = data ?? null
  }
  if (!account && market.pulse_client_email) {
    const { data } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, contact_email, access_token')
      .ilike('contact_email', market.pulse_client_email)
      .maybeSingle()
    account = data ?? null
  }

  const sendTo =
    account?.contact_email?.trim() ?? market.pulse_client_email?.trim() ?? null
  const token = account?.access_token ?? null

  if (!sendTo || !token) {
    console.warn(
      '[sponsor-pulse-report-pipeline] cannot resolve recipient or token for market',
      marketId
    )
    return { success: true, marketId, status: 'success', emailSent: false }
  }

  const { data: cached } = await admin
    .from('sponsor_pulse_reports')
    .select('executive_summary')
    .eq('market_id', marketId)
    .maybeSingle()
  const previewSummary = cached?.executive_summary
    ? cached.executive_summary.replace(/\s+/g, ' ').slice(0, 220).trim() + '…'
    : null

  const dashboardUrl = `${APP_URL}/dashboard/sponsor/${token}/report/${marketId}`
  const pdfUrl = `${APP_URL}/api/dashboard/sponsor/${token}/report/${marketId}/pdf`
  const manageUrl = `${APP_URL}/dashboard/sponsor/${token}`
  const unsubscribeUrl = `${APP_URL}/dashboard/sponsor/${token}?unsubscribe=pulse_report`

  const tpl = sponsorPulseReportReadyTemplate({
    sponsorName: account?.company_name ?? market.sponsor_name ?? 'Patrocinador',
    marketTitle: market.title,
    marketId,
    previewSummary,
    dashboardReportUrl: dashboardUrl,
    pdfDownloadUrl: pdfUrl,
    locale: 'es',
    unsubscribeUrl,
    manageUrl,
  })

  const emailRes = await sendEmail(sendTo, tpl)
  if (!emailRes.success) {
    console.error(
      '[sponsor-pulse-report-pipeline] email failed:',
      emailRes.error
    )
    return {
      success: true,
      marketId,
      status: 'success',
      emailSent: false,
      error: `email_failed: ${emailRes.error ?? 'unknown'}`,
    }
  }

  await admin
    .from('sponsor_pulse_reports')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('market_id', marketId)

  return { success: true, marketId, status: 'success', emailSent: true }
}
