import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Admin-only fetch of the cached Sponsor Pulse executive report for a
 * given market. Returns the agent's narrative outputs (executive summary,
 * conviction analysis, next steps) plus the sponsor dashboard URL so the
 * agents page can preview the run result inline and link straight into
 * the full report.
 *
 * If no report row exists yet, returns { report: null }. The picker UI
 * uses that to communicate "no run yet" without treating it as an error.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await context.params
  if (!marketId) {
    return NextResponse.json({ error: 'missing marketId' }, { status: 400 })
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: market, error: marketError } = await admin
    .from('prediction_markets')
    .select('id, title, status, sponsor_account_id')
    .eq('id', marketId)
    .single()

  if (marketError || !market) {
    return NextResponse.json({ error: 'market not found' }, { status: 404 })
  }

  const { data: report, error: reportError } = await admin
    .from('sponsor_pulse_reports')
    .select(
      'id, executive_summary, conviction_analysis, next_steps, snapshot_data, generated_at, model, tokens_in, tokens_out, cost, pdf_path, pdf_generated_at, email_sent_at, sponsor_account_id'
    )
    .eq('market_id', marketId)
    .maybeSingle()

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  // Resolve the sponsor access token (if any) so the admin can jump
  // straight into the live dashboard view of the report.
  let dashboardUrl: string | null = null
  const sponsorAccountId = report?.sponsor_account_id ?? market.sponsor_account_id
  if (sponsorAccountId) {
    const { data: sponsor } = await admin
      .from('sponsor_accounts')
      .select('access_token, company_name')
      .eq('id', sponsorAccountId)
      .single()
    if (sponsor?.access_token) {
      dashboardUrl = `/dashboard/sponsor/${sponsor.access_token}/report/${marketId}`
    }
  }

  return NextResponse.json({
    market: {
      id: market.id,
      title: market.title,
      status: market.status,
    },
    report: report
      ? {
          id: report.id,
          executiveSummary: report.executive_summary,
          convictionAnalysis: report.conviction_analysis,
          nextSteps: Array.isArray(report.next_steps) ? report.next_steps : [],
          snapshot: report.snapshot_data ?? null,
          generatedAt: report.generated_at,
          model: report.model,
          tokensIn: report.tokens_in ?? 0,
          tokensOut: report.tokens_out ?? 0,
          cost: Number(report.cost ?? 0),
          pdfPath: report.pdf_path,
          pdfGeneratedAt: report.pdf_generated_at,
          emailSentAt: report.email_sent_at,
        }
      : null,
    dashboardUrl,
  })
}
