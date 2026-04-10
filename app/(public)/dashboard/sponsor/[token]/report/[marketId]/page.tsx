import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase-admin'
import SponsorReportPrintButton from '@/components/sponsor/SponsorReportPrintButton'
import { buildSponsorDashboardMarkets } from '@/lib/sponsor-dashboard-build'
import { marketBelongsToSponsorAccount } from '@/lib/sponsor-account-access'
import { notFound } from 'next/navigation'

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
      total_votes,
      current_probability,
      resolution_date,
      is_pulse,
      sponsor_account_id,
      sponsor_name,
      pulse_client_email,
      market_outcomes(id, label, probability, vote_count)
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

  const { data: votes } = await admin
    .from('market_votes')
    .select('market_id, confidence, created_at, outcome_id')
    .eq('market_id', marketId)

  const { data: fundRows } = await admin
    .from('conscious_fund_transactions')
    .select('amount, description, created_at')
    .eq('source_type', 'sponsorship')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false })

  const [row] = buildSponsorDashboardMarkets(
    [market] as Parameters<typeof buildSponsorDashboardMarkets>[0],
    votes ?? []
  )

  const generated = new Date().toLocaleString('es-MX')

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
            <SponsorReportPrintButton />
          </div>
        </div>

        <div className="report-shell mx-auto max-w-3xl px-4 py-10 print:py-6">
          <header className="mb-8 flex flex-col gap-4 border-b border-[#2d3748] pb-6 print:border-slate-300">
            <div className="flex items-start justify-between gap-4">
              <div>
                {account.logo_url ? (
                  <Image
                    src={account.logo_url}
                    alt=""
                    width={140}
                    height={42}
                    className="max-h-10 w-auto rounded object-contain print:max-h-12"
                    unoptimized
                  />
                ) : null}
                <h1 className="mt-4 text-2xl font-semibold text-white print:text-slate-900">
                  {account.company_name}
                </h1>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                  Reporte de mercado · {generated}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 print:text-slate-600">
                <div>Crowd Conscious</div>
                <div>crowdconscious.app</div>
              </div>
            </div>
          </header>

          <section className="mb-8">
            <h2 className="text-lg font-medium text-emerald-400 print:text-emerald-700">
              {row.title}
            </h2>
            <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
              Estado: {row.status} · Cierra:{' '}
              {new Date(row.resolutionDate).toLocaleDateString('es-MX')}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-slate-700">
              Resultados (probabilidad modelo)
            </h3>
            <div className="space-y-2">
              {row.outcomes.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-lg bg-[#1a2029] px-3 py-2 print:bg-slate-100"
                >
                  <span>{o.label}</span>
                  <span className="text-emerald-400 print:text-emerald-700">
                    {Math.round(o.probability * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-slate-700">
              Confianza de votos
            </h3>
            <p className="text-slate-300 print:text-slate-800">
              Promedio:{' '}
              {row.avgConfidence != null
                ? `${row.avgConfidence.toFixed(1)} / 10`
                : '—'}{' '}
              · Votos con confianza ≥8: {row.strongOpinionCount} · Total votos:{' '}
              {row.totalVotes}
            </p>
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-slate-700">
              Línea de tiempo (votos por día)
            </h3>
            <ul className="text-sm text-slate-400 print:text-slate-700">
              {row.votesByDay.length === 0 ? (
                <li>Sin votos aún.</li>
              ) : (
                row.votesByDay.map((d) => (
                  <li key={d.date}>
                    {d.date}: {d.count} voto(s)
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-slate-700">
              Impacto al Fondo Consciente
            </h3>
            <ul className="space-y-1 text-sm text-slate-400 print:text-slate-700">
              {(fundRows ?? []).length === 0 ? (
                <li>—</li>
              ) : (
                (fundRows ?? []).map((f) => (
                  <li key={f.created_at + (f.description ?? '')}>
                    ${Number(f.amount).toLocaleString('es-MX')} MXN —{' '}
                    {f.description ?? 'Patrocinio'}
                  </li>
                ))
              )}
            </ul>
          </section>

          <footer className="border-t border-[#2d3748] pt-6 text-center text-xs text-slate-600 print:border-slate-300 print:text-slate-500">
            Powered by Crowd Conscious · Generado {generated}
          </footer>
        </div>
      </div>
    </>
  )
}
