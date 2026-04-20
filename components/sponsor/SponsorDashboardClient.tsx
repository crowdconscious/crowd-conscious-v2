'use client'

import type React from 'react'
import { useState } from 'react'
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
import { FileDown, BarChart3, Share2, BookOpen, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { SponsorOnboardingBanner } from '@/components/sponsor/SponsorOnboardingBanner'
import { SponsorMarketCard } from '@/components/sponsor/SponsorMarketCard'
import { SuggestCauseForm } from '@/components/sponsor/SuggestCauseForm'
import type { SponsorDashboardMarketRow, FundImpactRow } from '@/components/sponsor/types'

export type { SponsorOutcomeRow, SponsorDashboardMarketRow, FundImpactRow } from '@/components/sponsor/types'

const TIER_ES: Record<string, { label: string; color: string }> = {
  starter: { label: 'Patrocinador de Mercado', color: 'text-slate-400' },
  growth: { label: 'Patrocinador de Categoría', color: 'text-emerald-400' },
  champion: { label: 'Socio de Impacto', color: 'text-amber-400' },
  anchor: { label: 'Patrocinador Fundador', color: 'text-purple-400' },
  pilot: { label: 'Pilot Pulse', color: 'text-cyan-400' },
  pulse_unico: { label: 'Pulse Único', color: 'text-emerald-400' },
  pulse_pack: { label: 'Pulse Pack (3)', color: 'text-emerald-400' },
  suscripcion: { label: 'Suscripción Pulse', color: 'text-amber-400' },
  mundial_pack: { label: 'Mundial Pulse Pack', color: 'text-amber-400' },
  mundial_pack_founding: { label: 'Mundial Pack · Fundador', color: 'text-fuchsia-400' },
  enterprise: { label: 'Enterprise', color: 'text-purple-400' },
}

type RawMarket = {
  id: string
  title: string
  cover_image_url?: string | null
  translations?: unknown
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
    contact_email: string
    max_pulse_markets: number
    used_pulse_markets: number
  }
  markets: SponsorDashboardMarketRow[]
  marketsRaw: RawMarket[]
  totalVotes: number
  activeMarketCount: number
  totalReasonings: number
  avgConfidenceOverall: number | null
  fundImpactRows: FundImpactRow[]
  token: string
  isFirstVisit: boolean
  appOrigin: string
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

function displayTitle(raw: RawMarket, fallback: string): string {
  const tr = raw.translations as { es?: { title?: string } } | null
  const t = tr?.es?.title?.trim()
  return t || fallback
}

export default function SponsorDashboardClient({
  account,
  markets,
  marketsRaw,
  totalVotes,
  activeMarketCount,
  totalReasonings,
  avgConfidenceOverall,
  fundImpactRows,
  token,
  isFirstVisit,
  appOrigin,
}: Props) {
  const fundTotal = Number(account.total_fund_contribution ?? 0)
  const showPulse = account.is_pulse_client === true
  const tier = TIER_ES[account.tier] ?? TIER_ES.starter
  const maxPulse = account.max_pulse_markets ?? 1
  const usedPulse = account.used_pulse_markets ?? 0
  const unlimited = maxPulse >= 999
  const atPulseLimit = !unlimited && usedPulse >= maxPulse
  const pulsePct = unlimited ? 100 : maxPulse > 0 ? Math.min(100, Math.round((usedPulse / maxPulse) * 100)) : 0
  const [addonLoading, setAddonLoading] = useState(false)

  const startPulseAddon = async () => {
    setAddonLoading(true)
    try {
      const res = await fetch(`/api/dashboard/sponsor/${encodeURIComponent(token)}/pulse-addon-checkout`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
    } finally {
      setAddonLoading(false)
    }
  }

  const enriched = useMemo(() => {
    return markets.map((m) => {
      const raw = marketsRaw.find((r) => r.id === m.id)
      return {
        ...m,
        coverImageUrl: raw?.cover_image_url ?? null,
        displayTitle: raw ? displayTitle(raw, m.title) : m.title,
      }
    })
  }, [markets, marketsRaw])

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
                <span className={tier.color}>{tier.label}</span>
                {' · '}
                Activo desde {fmtDate(account.created_at)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8">
        {isFirstVisit ? (
          <SponsorOnboardingBanner
            companyName={account.company_name}
            isPulseClient={showPulse}
            token={token}
          />
        ) : null}

        {showPulse ? (
          <section className="rounded-xl border border-emerald-500/25 bg-[#1a2029] p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Tu plan Conscious Pulse</h2>
            <p className="mt-2 text-lg font-semibold text-white">
              Tu plan: <span className={tier.color}>{tier.label}</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Mercados Pulse:{' '}
              <span className="font-medium text-white">
                {usedPulse} de {unlimited ? '∞' : maxPulse} utilizados
              </span>
            </p>
            <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pulsePct}%` }}
              />
            </div>
            {atPulseLimit ? (
              <p className="mt-3 text-sm text-amber-400/95">
                Has alcanzado el límite de tu plan.{' '}
                <Link
                  href={`/pulse#pulse-pricing?email=${encodeURIComponent(account.contact_email)}`}
                  className="font-medium text-emerald-400 underline hover:text-emerald-300"
                >
                  Subir de plan →
                </Link>
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/sponsor/${token}/create-pulse`}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                  atPulseLimit ? 'cursor-not-allowed bg-slate-600 opacity-60 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                aria-disabled={atPulseLimit}
              >
                + Crear nuevo Pulse
              </Link>
              <button
                type="button"
                onClick={startPulseAddon}
                disabled={addonLoading}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {addonLoading ? '…' : 'Comprar más'}
              </button>
              <Link
                href={`/pulse#pulse-pricing?email=${encodeURIComponent(account.contact_email)}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Subir de plan →
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-[#2d3748] bg-[#1a2029]/80 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Patrocinar mercados</h2>
          <p className="mt-2 text-sm text-slate-400">
            También puedes asociar tu marca a mercados existentes de la plataforma.
          </p>
          <Link
            href={`/markets?sponsor_mode=true&token=${encodeURIComponent(token)}`}
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-600"
          >
            Ver mercados disponibles →
          </Link>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Mercados activos" value={String(activeMarketCount)} />
          <StatCard label="Votos totales" value={totalVotes.toLocaleString()} />
          <StatCard
            label="Cert. promedio"
            value={avgConfidenceOverall != null ? `${avgConfidenceOverall.toFixed(1)}/10` : '—'}
          />
          <StatCard label="Razonamientos" value={String(totalReasonings)} />
          <StatCard
            label="Al Fondo (acum.)"
            accent
            value={`$${fundTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
          />
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BarChart3 className="h-4 w-4" />
            Qué puedes hacer
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {showPulse ? (
              <ActionCard
                icon={<span className="text-xl">📊</span>}
                title="Crear un Pulse"
                description="Nueva pregunta multi-opción para tu comunidad (certeza y resultados en vivo)."
                href={atPulseLimit ? '#' : `/dashboard/sponsor/${token}/create-pulse`}
                cta="Crear Pulse →"
                disabled={atPulseLimit}
              />
            ) : null}
            <ActionCard
              icon={<FileDown className="h-5 w-5 text-emerald-400" />}
              title="Reportes"
              description="PDF por mercado con resultados, confianza e impacto al fondo."
              href={`/dashboard/sponsor/${token}/reports`}
              cta="Ver reportes →"
            />
            <ActionCard
              icon={<Share2 className="h-5 w-5 text-emerald-400" />}
              title="Compartir"
              description="Enlaces públicos, WhatsApp y códigos QR por mercado."
              href={`/dashboard/sponsor/${token}/share`}
              cta="Compartir →"
            />
            <ActionCard
              icon={<BookOpen className="h-5 w-5 text-emerald-400" />}
              title="Cómo funciona"
              description="Guía rápida del panel de patrocinador."
              href={`/dashboard/sponsor/${token}/guide`}
              cta="Ver guía →"
            />
          </div>
        </section>

        <SuggestCauseForm token={token} />

        <section>
          <h2 className="mb-4 border-b border-[#2d3748] pb-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            Tus mercados
          </h2>
          {enriched.length === 0 ? (
            <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 text-center">
              <span className="text-3xl">📊</span>
              <p className="mt-3 font-medium text-white">Aún no tienes mercados vinculados</p>
              <p className="mt-1 text-sm text-slate-400">
                {showPulse
                  ? 'Crea tu primer Pulse o pide a Crowd Conscious que vincule un mercado existente a tu cuenta.'
                  : 'Tu mercado patrocinado aparecerá aquí cuando esté vinculado a tu cuenta (o nombre de patrocinador).'}
              </p>
              {showPulse ? (
                <Link
                  href={`/dashboard/sponsor/${token}/create-pulse`}
                  className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Crear primer Pulse →
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              {enriched.map((m) => (
                <div key={m.id}>
                  <SponsorMarketCard
                    market={m}
                    token={token}
                    appOrigin={appOrigin}
                  />
                  {(showPulse || m.isPulse) && m.totalVotes > 0 ? (
                    <PulseMarketAnalytics market={m} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-400">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Impacto del Fondo Consciente
          </h2>
          <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
            <p className="text-slate-300">
              Tu patrocinio contribuye al Fondo Consciente para causas comunitarias elegidas por la
              comunidad.
            </p>
            {fundTotal > 0 ? (
              <p className="mt-2 text-lg font-bold text-emerald-400">
                ${fundTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
                <span className="ml-2 text-sm font-normal text-slate-500">estimado acumulado</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Los aportes al fondo aparecerán aquí tras el procesamiento de pagos de patrocinio.
              </p>
            )}
            {fundImpactRows.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {fundImpactRows.slice(0, 8).map((row) => (
                  <li key={row.created_at + (row.description ?? '')}>
                    <span className="text-emerald-400/90">
                      ${Number(row.amount).toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN
                    </span>{' '}
                    — {row.description ?? 'Aporte al fondo'}
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/predictions/fund"
              className="mt-4 inline-block text-sm text-emerald-400 hover:underline"
            >
              Ver causas del fondo →
            </Link>
          </div>
        </section>

        <footer className="border-t border-[#2d3748] py-8 text-center text-sm text-slate-500">
          <p>¿Necesitas ayuda? Tu account manager:</p>
          <a href="mailto:francisco@crowdconscious.app" className="font-medium text-emerald-400 hover:underline">
            francisco@crowdconscious.app
          </a>
          <p className="mt-4 text-xs text-slate-600">
            Powered by Crowd Conscious · {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-[#2d3748] p-4 text-center ${
        accent ? 'bg-emerald-500/5' : 'bg-[#1a2029]'
      }`}
    >
      <div className={`text-2xl font-semibold ${accent ? 'text-emerald-400' : 'text-emerald-400'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  description,
  href,
  cta,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  cta: string
  disabled?: boolean
}) {
  const className = `flex flex-col rounded-xl border border-[#2d3748] bg-[#1a2029] p-5 transition ${
    disabled
      ? 'cursor-not-allowed opacity-50'
      : 'hover:border-emerald-500/30 hover:bg-[#1f2630]'
  }`
  const inner = (
    <>
      <div className="mb-2">{icon}</div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-400">{description}</p>
      <span className="mt-3 text-sm font-medium text-emerald-400">{cta}</span>
    </>
  )
  if (disabled) {
    return (
      <div className={className} role="group" aria-disabled>
        {inner}
      </div>
    )
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

function PulseMarketAnalytics({ market }: { market: SponsorDashboardMarketRow }) {
  const maxBucket = Math.max(1, ...market.confidenceBuckets)
  const chartData = market.votesByDay.map((d) => ({
    date: d.date,
    votos: d.count,
  }))

  return (
    <div className="mt-4 space-y-6 rounded-xl border border-[#2d3748] bg-[#0f1419]/80 p-5">
      <div>
        <h4 className="mb-2 text-sm font-medium text-slate-300">Distribución de confianza (1–10)</h4>
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
        <p className="mt-2 text-xs text-slate-500">Opiniones fuertes (≥8): {market.strongOpinionCount}</p>
      </div>

      {chartData.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-medium text-slate-300">Votos en el tiempo</h4>
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
        <h4 className="mb-2 text-sm font-medium text-slate-300">Confianza promedio por resultado</h4>
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
