'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import type { SponsorPulseReportSnapshot } from '@/lib/agents/sponsor-pulse-report-agent'

/**
 * Sponsor executive report view.
 *
 * This is the dashboard / preview surface. The PDF is rendered server-side
 * by lib/sponsor-pulse-report-pdf.ts and consumes the same `report` row,
 * so any data shape change must be mirrored there.
 *
 * Distinct from the consumer-facing PulseResultsCard — this view is a
 * decision document: narrative, divergence callout, anonymised reasoning,
 * recommended actions, methodology disclosure.
 */

export interface SponsorReportSponsor {
  companyName: string
  logoUrl?: string | null
}

export interface SponsorReportMarket {
  id: string
  title: string
  status: string | null
  createdAt: string
  resolutionDate: string | null
  resolvedAt: string | null
  descriptionShort: string | null
}

export interface SponsorReportPayload {
  /** May be null if the agent hasn't run yet. */
  executiveSummary: string | null
  convictionAnalysis: string | null
  nextSteps: string[]
  snapshot: SponsorPulseReportSnapshot | null
  generatedAt: string | null
  pdfPath: string | null
}

export interface SponsorReportViewProps {
  sponsor: SponsorReportSponsor
  market: SponsorReportMarket
  report: SponsorReportPayload
  /** Server route URL that will trigger PDF download. Token-gated. */
  pdfDownloadUrl: string
  /** Admin-only regenerate URL. Pass null for sponsor-only viewers. */
  regenerateUrl: string | null
  /** Read-only when true: render banners explaining missing pieces. */
  showAdminControls: boolean
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Math.round(value * 100)}%`
}

function statusLabelEs(status: string | null): string {
  switch (status) {
    case 'resolved':
      return '🏁 Cerrado · resultados finales'
    case 'closed':
      return '🔒 Cerrado'
    case 'active':
    case 'trading':
      return '🟢 Activo'
    case 'draft':
      return '📝 Borrador'
    default:
      return status ?? '—'
  }
}

export default function SponsorReportView({
  sponsor,
  market,
  report,
  pdfDownloadUrl,
  regenerateUrl,
  showAdminControls,
}: SponsorReportViewProps) {
  const snap = report.snapshot
  const hasNarrative = !!(report.executiveSummary && report.convictionAnalysis)

  return (
    <div className="space-y-6">
      {/* Toolbar: PDF + regenerate */}
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <a
          href={pdfDownloadUrl}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
        >
          Descargar PDF
        </a>
        {showAdminControls && regenerateUrl ? (
          <RegenerateButton url={regenerateUrl} />
        ) : null}
      </div>

      {/* a. HEADER */}
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {sponsor.logoUrl ? (
              <Image
                src={sponsor.logoUrl}
                alt={sponsor.companyName}
                width={140}
                height={44}
                className="max-h-11 w-auto rounded object-contain"
                unoptimized
              />
            ) : null}
            <h1 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              {sponsor.companyName}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Reporte ejecutivo · {fmtDateTime(report.generatedAt)}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Crowd Conscious</div>
            <div>crowdconscious.app</div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/5 pt-5">
          <h2 className="text-lg font-medium text-emerald-400">{market.title}</h2>
          {market.descriptionShort ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {market.descriptionShort}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">
            {statusLabelEs(market.status)} · {fmtDate(market.createdAt)} →{' '}
            {fmtDate(market.resolvedAt ?? market.resolutionDate)}
          </p>
        </div>

        {snap ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total de votos" value={snap.totalVotes.toLocaleString('es-MX')} />
            <Stat
              label="Confianza promedio"
              value={
                snap.avgConfidence != null ? `${snap.avgConfidence.toFixed(1)}/10` : '—'
              }
            />
            <Stat
              label="Registrados"
              value={snap.registeredVotes.toLocaleString('es-MX')}
            />
            <Stat label="Invitados" value={snap.guestVotes.toLocaleString('es-MX')} />
          </div>
        ) : null}
      </SectionCard>

      {/* b. EXECUTIVE SUMMARY */}
      <SectionCard heading="Resumen ejecutivo">
        {report.executiveSummary ? (
          <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
            {report.executiveSummary}
          </p>
        ) : (
          <EmptyNarrative showAdminControls={showAdminControls} />
        )}
      </SectionCard>

      {/* c. VOTE BREAKDOWN */}
      {snap ? (
        <SectionCard heading="Distribución de votos">
          <ul className="space-y-5">
            {snap.outcomes.map((o, idx) => {
              const pct = Math.round(o.pct * 100)
              const isLeader = idx === 0
              const reasonings = (snap.topReasonings ?? [])
                .filter((r) => r.outcomeId === o.id)
                .slice(0, 2)
              return (
                <li key={o.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm sm:text-base">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-white break-words">{o.label}</span>
                      {o.subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-500 leading-snug">
                          {o.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-white">
                      {pct}%
                    </span>
                  </div>
                  <div
                    className="h-3 w-full overflow-hidden rounded-full bg-black/40"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={o.label}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLeader
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          : 'bg-white/15'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {o.votes.toLocaleString('es-MX')} votos · confianza{' '}
                    {o.avgConfidence != null
                      ? `${o.avgConfidence.toFixed(1)}/10`
                      : 's/d'}
                  </p>
                  {reasonings.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 border-l border-emerald-500/30 pl-3">
                      {reasonings.map((r, i) => (
                        <li key={i} className="text-sm text-slate-300 italic leading-snug">
                          “{r.snippet}”
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </SectionCard>
      ) : null}

      {/* d. CONVICTION ANALYSIS */}
      <SectionCard heading="Análisis de convicción">
        {report.convictionAnalysis ? (
          <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
            {report.convictionAnalysis}
          </p>
        ) : (
          <EmptyNarrative showAdminControls={showAdminControls} />
        )}
        {snap ? <DivergenceCallout snapshot={snap} /> : null}
      </SectionCard>

      {/* e. VOTER REASONING (full, anonymised) */}
      {snap && (snap.topReasonings ?? []).length > 0 ? (
        <ReasoningSection snapshot={snap} />
      ) : null}

      {/* f. PARTICIPATION OVER TIME */}
      {snap && snap.votesByDay.length > 0 ? (
        <SectionCard heading="Participación en el tiempo">
          <ParticipationChart data={snap.votesByDay} />
        </SectionCard>
      ) : null}

      {/* g. NEXT STEPS */}
      <SectionCard heading="Recomendaciones siguientes">
        {report.nextSteps.length > 0 ? (
          <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-200 marker:text-emerald-400">
            {report.nextSteps.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyNarrative showAdminControls={showAdminControls} />
        )}
      </SectionCard>

      {/* h. METHODOLOGY DISCLOSURE */}
      <SectionCard heading="Metodología">
        <p className="text-xs leading-relaxed text-slate-400">
          Esta es una consulta participativa pública (Pulse), no una encuesta
          probabilística. Los resultados reflejan la opinión de quienes
          decidieron participar a través de crowdconscious.app y enlaces
          compartidos. N = {snap?.totalVotes ?? 0}. Los datos personales se
          mantienen anónimos: ninguna razón mostrada incluye usuario, correo
          o IP. Las citas fueron parafraseadas o truncadas cuando incluían
          información identificable.
        </p>
      </SectionCard>
    </div>
  )
}

// ---------- subcomponents -----------------------------------------------

function SectionCard({
  heading,
  children,
}: {
  heading?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-cc-card p-5 sm:p-6 print:break-inside-avoid">
      {heading ? (
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          {heading}
        </h3>
      ) : null}
      {children}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 border border-white/5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white tabular-nums">{value}</p>
    </div>
  )
}

function EmptyNarrative({ showAdminControls }: { showAdminControls: boolean }) {
  return (
    <p className="text-sm text-slate-500 italic">
      {showAdminControls
        ? 'El agente todavía no ha generado este apartado. Usa “Regenerar” arriba para correrlo.'
        : 'Reporte aún no disponible. Crowd Conscious avisará cuando esté listo.'}
    </p>
  )
}

function DivergenceCallout({ snapshot }: { snapshot: SponsorPulseReportSnapshot }) {
  const sortedByVotes = [...snapshot.outcomes].sort((a, b) => b.pct - a.pct)
  const sortedByConf = [...snapshot.outcomes].sort(
    (a, b) => (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0)
  )
  const voteWinner = sortedByVotes[0]
  const confWinner = sortedByConf[0]
  if (!voteWinner || !confWinner) return null
  if (voteWinner.id === confWinner.id) return null

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
        Divergencia votos ↔ convicción
      </p>
      <p className="mt-2 text-sm text-amber-100 leading-relaxed">
        La opción más votada fue <strong>{voteWinner.label}</strong> con{' '}
        {fmtPct(voteWinner.pct)} ({voteWinner.votes} votos). Sin embargo,{' '}
        <strong>{confWinner.label}</strong> obtuvo la confianza promedio más
        alta (
        {confWinner.avgConfidence != null
          ? `${confWinner.avgConfidence.toFixed(1)}/10`
          : '—'}{' '}
        vs{' '}
        {voteWinner.avgConfidence != null
          ? `${voteWinner.avgConfidence.toFixed(1)}/10`
          : '—'}
        ). Quienes votaron por la opción minoritaria lo hicieron con mayor
        certeza.
      </p>
    </div>
  )
}

function ReasoningSection({ snapshot }: { snapshot: SponsorPulseReportSnapshot }) {
  const [sortMode, setSortMode] = useState<'recent' | 'confidence' | 'option'>('recent')
  const sorted = useMemo(() => {
    const arr = [...(snapshot.topReasonings ?? [])]
    if (sortMode === 'recent') {
      arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    } else if (sortMode === 'confidence') {
      arr.sort((a, b) => b.confidence - a.confidence)
    } else {
      arr.sort((a, b) => a.outcomeLabel.localeCompare(b.outcomeLabel))
    }
    return arr
  }, [snapshot.topReasonings, sortMode])

  if (sorted.length === 0) return null

  return (
    <SectionCard heading="Razones de los votantes (anonimizadas)">
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <SortBtn active={sortMode === 'recent'} onClick={() => setSortMode('recent')}>
          Más recientes
        </SortBtn>
        <SortBtn
          active={sortMode === 'confidence'}
          onClick={() => setSortMode('confidence')}
        >
          Por confianza
        </SortBtn>
        <SortBtn
          active={sortMode === 'option'}
          onClick={() => setSortMode('option')}
        >
          Por opción
        </SortBtn>
      </div>
      <ul className="space-y-3">
        {sorted.map((r, i) => (
          <li
            key={i}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-medium text-emerald-400">{r.outcomeLabel}</span>
              <span className="tabular-nums">conf {r.confidence}/10</span>
            </div>
            <p className="text-sm text-slate-200 leading-snug italic">“{r.snippet}”</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function SortBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function ParticipationChart({
  data,
}: {
  data: SponsorPulseReportSnapshot['votesByDay']
}) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const peak = data.reduce((acc, d) => (d.count > acc.count ? d : acc), data[0])
  return (
    <div>
      <ul className="space-y-1.5">
        {data.map((d) => {
          const pct = Math.round((d.count / max) * 100)
          const isPeak = d.date === peak.date
          return (
            <li key={d.date} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 tabular-nums text-slate-500">
                {d.date}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                <div
                  className={`h-full rounded-full ${
                    isPeak ? 'bg-emerald-400' : 'bg-emerald-500/40'
                  }`}
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-slate-300">
                {d.count}
              </span>
            </li>
          )
        })}
      </ul>
      {data.length > 1 ? (
        <p className="mt-3 text-xs text-slate-500">
          Día con mayor participación: <strong className="text-slate-300">{peak.date}</strong>{' '}
          ({peak.count} votos).
        </p>
      ) : null}
    </div>
  )
}

function RegenerateButton({ url }: { url: string }) {
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onClick = async () => {
    if (pending) return
    setPending(true)
    setMsg(null)
    try {
      const res = await fetch(url, { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setMsg(data.error ?? `Error ${res.status}`)
      } else {
        setMsg('Regenerado. Recargando…')
        window.setTimeout(() => window.location.reload(), 800)
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg ? <span className="text-xs text-slate-400">{msg}</span> : null}
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        {pending ? 'Regenerando…' : 'Regenerar insights (admin)'}
      </button>
    </div>
  )
}
