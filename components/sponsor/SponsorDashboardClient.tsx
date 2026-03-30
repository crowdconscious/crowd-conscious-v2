'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { FileDown, ExternalLink } from 'lucide-react'

export type SponsorOutcomeRow = {
  id: string
  label: string
  probability: number
  vote_count?: number | null
}

export type SponsorDashboardMarketRow = {
  id: string
  title: string
  status: string
  totalVotes: number
  resolutionDate: string
  isPulse: boolean
  currentProbability: number
  outcomes: SponsorOutcomeRow[]
  avgConfidence: number | null
  strongOpinionCount: number
  topOutcomeLabel: string
  topOutcomePct: number
  confidenceBuckets: number[]
  votesByDay: { date: string; count: number }[]
  avgConfidenceByOutcome: { outcomeId: string; label: string; avg: number; count: number }[]
}

export type FundImpactRow = {
  amount: number
  description: string | null
  created_at: string
}

type Props = {
  account: {
    company_name: string
    logo_url: string | null
    tier: string
    is_pulse_client: boolean | null
    total_fund_contribution: number | null
    total_spent: number | null
    created_at: string
  }
  markets: SponsorDashboardMarketRow[]
  totalVotes: number
  totalMarkets: number
  avgConfidenceOverall: number | null
  fundImpactRows: FundImpactRow[]
  token: string
}

function formatPct(n: number) {
  return `${Math.round(n * 100)}%`
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function SponsorDashboardClient({
  account,
  markets,
  totalVotes,
  totalMarkets,
  avgConfidenceOverall,
  fundImpactRows,
  token,
}: Props) {
  const fundTotal = Number(account.total_fund_contribution ?? 0)
  const showPulse = account.is_pulse_client === true

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <header className="border-b border-[#2d3748] bg-[#0f1419] px-4 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {account.logo_url ? (
              <Image
                src={account.logo_url}
                alt=""
                width={160}
                height={48}
                className="max-h-12 w-auto rounded-lg object-contain"
                unoptimized
              />
            ) : null}
            <div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                Dashboard de {account.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Acceso: Socio de Impacto · Activo desde {fmtDate(account.created_at)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Mercados activos"
            value={String(totalMarkets)}
          />
          <StatCard label="Votos totales" value={totalVotes.toLocaleString()} />
          <StatCard
            label="Cert. promedio"
            value={
              avgConfidenceOverall != null
                ? `${avgConfidenceOverall.toFixed(1)}/10`
                : '—'
            }
          />
          <StatCard
            label="Al Fondo"
            value={`$${fundTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN`}
          />
        </section>

        <section>
          <h2 className="mb-4 border-b border-[#2d3748] pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Tus mercados
          </h2>
          <div className="space-y-4">
            {markets.length === 0 ? (
              <p className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-slate-400">
                Aún no hay mercados vinculados a tu cuenta.
              </p>
            ) : (
              markets.map((m) => (
                <article
                  key={m.id}
                  className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 shadow-sm"
                >
                  <h3 className="text-lg font-medium text-white">{m.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Status:{' '}
                    <span className="text-slate-300">{m.status}</span> ·{' '}
                    {m.topOutcomeLabel} {formatPct(m.topOutcomePct)} ·{' '}
                    {m.totalVotes} votos
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Conf:{' '}
                    {m.avgConfidence != null
                      ? `${m.avgConfidence.toFixed(1)}/10`
                      : '—'}{' '}
                    · Cierra: {fmtDate(m.resolutionDate)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/predictions/markets/${m.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/10"
                    >
                      Ver detalle <ExternalLink className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/dashboard/sponsor/${token}/report/${m.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/10"
                    >
                      <FileDown className="h-4 w-4" />
                      Descargar PDF
                    </Link>
                    {m.isPulse ? (
                      <Link
                        href={`/pulse/${m.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                      >
                        Pulse público
                      </Link>
                    ) : null}
                  </div>

                  {(showPulse || m.isPulse) && (
                    <PulseMarketAnalytics market={m} />
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-4 border-b border-[#2d3748] pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Impacto del Fondo Consciente
          </h2>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <p className="text-slate-300">
              Tu inversión ha generado{' '}
              <span className="text-emerald-400">
                ${fundTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
              </span>{' '}
              hacia el Fondo Consciente (estimado acumulado en tu cuenta).
            </p>
            {fundImpactRows.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {fundImpactRows.slice(0, 8).map((row) => (
                  <li key={row.created_at + (row.description ?? '')}>
                    <span className="text-emerald-400/90">
                      ${Number(row.amount).toLocaleString('es-MX', { maximumFractionDigits: 0 })}{' '}
                      MXN
                    </span>{' '}
                    — {row.description ?? 'Aporte al fondo'}
                  </li>
                ))}
              </ul>
            ) : null}
            {markets[0]?.id ? (
              <div className="mt-6">
                <Link
                  href={`/dashboard/sponsor/${token}/report/${markets[0].id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-3 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/10"
                >
                  <FileDown className="h-4 w-4" />
                  Descargar reporte de impacto PDF
                </Link>
              </div>
            ) : null}
          </div>
        </section>

      </main>

      <footer className="border-t border-[#2d3748] py-8 text-center text-xs text-slate-600">
        Powered by Crowd Conscious · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4 text-center">
      <div className="text-2xl font-semibold text-emerald-400">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  )
}

function PulseMarketAnalytics({ market }: { market: SponsorDashboardMarketRow }) {
  const maxBucket = Math.max(1, ...market.confidenceBuckets)
  const chartData = market.votesByDay.map((d) => ({
    date: d.date,
    votos: d.count,
  }))

  return (
    <div className="mt-6 space-y-6 border-t border-[#2d3748] pt-6">
      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-300">
          Distribución de confianza (1–10)
        </h4>
        <div className="flex h-28 items-end gap-1">
          {market.confidenceBuckets.map((c, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-emerald-500/70"
                style={{ height: `${(c / maxBucket) * 100}%`, minHeight: c > 0 ? 4 : 0 }}
              />
              <span className="text-[10px] text-slate-500">{i + 1}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Opiniones fuertes (≥8): {market.strongOpinionCount}
        </p>
      </div>

      {chartData.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-300">
            Votos en el tiempo
          </h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a2029', border: '1px solid #2d3748' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="votos"
                  stroke="#34d399"
                  fill="rgba(52, 211, 153, 0.25)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-300">
          Confianza promedio por resultado
        </h4>
        <ul className="space-y-1 text-sm text-slate-400">
          {market.avgConfidenceByOutcome.map((o) => (
            <li key={o.outcomeId} className="flex justify-between gap-4">
              <span>{o.label}</span>
              <span className="text-emerald-400/90">
                {o.count > 0 ? `${o.avg.toFixed(1)}/10 (${o.count} votos)` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
