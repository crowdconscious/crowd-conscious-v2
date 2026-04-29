import Link from 'next/link'
import { notFound } from 'next/navigation'

import SponsorReportView, {
  type SponsorReportPayload,
} from '@/components/sponsor/SponsorReportView'
import SponsorReportPrintButton from '@/components/sponsor/SponsorReportPrintButton'
import { getSponsorPulseReport } from '@/lib/agents/sponsor-pulse-report-agent'
import type { SponsorPulseReportSnapshot } from '@/lib/agents/sponsor-pulse-report-agent'
import { AuthSessionExpiredError, getCurrentUser } from '@/lib/auth-server'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function SponsorMarketReportPage({
  params,
}: {
  params: Promise<{ token: string; marketId: string }>
}) {
  const { token, marketId } = await params
  const admin = createAdminClient()

  const { data: account } = await admin
    .from('sponsor_accounts')
    .select('id, company_name, logo_url, access_token, contact_email')
    .eq('access_token', token)
    .eq('status', 'active')
    .maybeSingle()

  if (!account) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 text-slate-400">
        <p>Enlace inválido.</p>
      </div>
    )
  }

  const { data: market } = await admin
    .from('prediction_markets')
    .select(
      `
      id,
      title,
      status,
      created_at,
      resolution_date,
      resolved_at,
      description_short,
      total_votes,
      current_probability,
      is_pulse,
      sponsor_account_id,
      sponsor_name,
      pulse_client_email
    `
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
    notFound()
  }

  // Admin impersonation flag — same pattern as the main dashboard.
  let isAdminViewer = false
  try {
    const user = await getCurrentUser()
    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
      const userEmail = (user as { email?: string | null }).email?.toLowerCase().trim()
      if (
        user.user_type === 'admin' ||
        (!!adminEmail && !!userEmail && userEmail === adminEmail)
      ) {
        isAdminViewer = true
      }
    }
  } catch (e) {
    if (!(e instanceof AuthSessionExpiredError)) {
      console.warn('[sponsor-report] admin check failed', e)
    }
  }

  const cached = await getSponsorPulseReport(marketId)

  const snapshot =
    cached?.snapshot_data && typeof cached.snapshot_data === 'object'
      ? (cached.snapshot_data as unknown as SponsorPulseReportSnapshot)
      : null

  const nextSteps = Array.isArray(cached?.next_steps)
    ? (cached!.next_steps as string[])
    : []

  const report: SponsorReportPayload = {
    executiveSummary: cached?.executive_summary ?? null,
    convictionAnalysis: cached?.conviction_analysis ?? null,
    nextSteps,
    snapshot,
    generatedAt: cached?.generated_at ?? null,
    pdfPath: cached?.pdf_path ?? null,
  }

  const pdfDownloadUrl = `/api/dashboard/sponsor/${token}/report/${marketId}/pdf`
  const regenerateUrl = isAdminViewer
    ? `/api/dashboard/sponsor/${token}/report/${marketId}/regenerate`
    : null

  return (
    <>
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .report-shell { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="min-h-screen bg-[#0f1419] text-slate-100 print:bg-white print:text-slate-900">
        <div className="no-print border-b border-[#2d3748] px-4 py-4">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
            <Link
              href={`/dashboard/sponsor/${token}`}
              className="text-sm text-emerald-400 hover:underline"
            >
              ← Volver al dashboard
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {isAdminViewer ? (
                <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-2.5 py-0.5 text-xs font-medium text-amber-200">
                  Vista admin
                </span>
              ) : null}
              <SponsorReportPrintButton />
            </div>
          </div>
        </div>

        <div className="report-shell mx-auto max-w-3xl px-4 py-8 print:py-6">
          <SponsorReportView
            sponsor={{
              companyName: account.company_name ?? 'Patrocinador',
              logoUrl: account.logo_url ?? null,
            }}
            market={{
              id: market.id,
              title: market.title,
              status: market.status ?? null,
              createdAt: market.created_at,
              resolutionDate: market.resolution_date ?? null,
              resolvedAt: market.resolved_at ?? null,
              descriptionShort: market.description_short ?? null,
            }}
            report={report}
            pdfDownloadUrl={pdfDownloadUrl}
            regenerateUrl={regenerateUrl}
            showAdminControls={isAdminViewer}
          />
        </div>
      </div>
    </>
  )
}
