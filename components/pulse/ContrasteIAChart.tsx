/**
 * Contraste IA — "Lo que la IA esperaba vs lo que dijo la gente".
 * Presentational only (no hooks): used on /pulse/[id] and the sponsor report.
 * Small grey text uses slate-400 on the dark card (#94a3b8 on #0f1419 ≈ 7:1).
 */
import { isClaimEligible } from '@/lib/contraste-ia/publish-gate'
import type { ContrasteData } from '@/lib/contraste-ia/server'
import { gapHeadline } from '@/lib/contraste-ia/core'

const pct = (x: number) => `${Math.round(x * 100)}%`

export function formatLockedAt(iso: string, locale: 'es' | 'en' = 'es'): string {
  const d = new Date(iso)
  const s = d.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${s} (hora CDMX)`
}

function Histogram({ dist, color, label }: { dist: Record<string, number>; color: string; label: string }) {
  const keys = Array.from({ length: 10 }, (_, i) => String(i + 1))
  const total = keys.reduce((a, k) => a + (dist[k] ?? 0), 0)
  const max = Math.max(1, ...keys.map((k) => dist[k] ?? 0))
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-xs text-slate-300">{label}</p>
      <div className="flex h-16 items-end gap-[3px]" role="img" aria-label={`${label}: ${keys.map((k) => `${k}: ${total ? Math.round(((dist[k] ?? 0) / total) * 100) : 0}%`).join(', ')}`}>
        {keys.map((k) => (
          <div key={k} className="flex-1 rounded-t-sm" style={{ height: `${((dist[k] ?? 0) / max) * 100}%`, minHeight: 2, background: color }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>1 · Lo dudo</span>
        <span>10 · Muy seguro/a</span>
      </div>
    </div>
  )
}

export default function ContrasteIAChart({
  data,
  audience = 'public',
}: {
  data: ContrasteData | null
  audience?: 'public' | 'client'
}) {
  const title = 'Contraste IA: lo que la IA esperaba vs lo que dijo la gente'
  if (!data) return null
  const p = data.prediction
  if (!p) {
    return (
      <section className="pulse-section mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" aria-label={title}>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">
          Este Pulse se abrió sin una predicción de IA bloqueada, así que no hay contraste que mostrar. Lo decimos abiertamente en lugar de
          calcular una predicción después de conocer los votos.
        </p>
      </section>
    )
  }
  const c = data.comparison
  const headline = c ? gapHeadline(c) : null
  const multi = Object.values(p.optionDistribution).reduce((a, b) => a + b, 0) > 1.05
  return (
    <section className="pulse-section mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" aria-label={title}>
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-300">
        <span>Contraste IA</span>
        {isClaimEligible(p) ? (
          <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 normal-case tracking-normal text-emerald-300">
            Bloqueada antes del primer voto · {formatLockedAt(p.lockedAt)}
          </span>
        ) : (
          <span className="rounded-full border border-amber-400/50 px-2 py-0.5 normal-case tracking-normal text-amber-300">
            {p.status === 'late' ? 'Tardía' : 'Redacción cambió'} · registrada {formatLockedAt(p.lockedAt)}
          </span>
        )}
      </p>
      <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">Lo que la IA esperaba vs lo que dijo la gente</h3>
      {headline ? <p className="mt-2 text-sm font-medium text-emerald-300">{headline}</p> : (
        <p className="mt-2 text-sm text-slate-300">Aún no hay votos para comparar.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-violet-400" /> IA (predicción bloqueada)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> La gente ({data.human.voters} votos)</span>
      </div>

      <ul className="mt-3 space-y-3">
        {data.options.map((opt) => {
          const ai = p.optionDistribution[opt] ?? 0
          const sd = p.optionSpread[opt] ?? 0
          const hu = data.human.optionShare[opt] ?? 0
          const gap = Math.round((hu - ai) * 100)
          return (
            <li key={opt}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 text-sm text-slate-100">{opt}</span>
                {data.human.voters > 0 ? (
                  <span className={`shrink-0 text-xs font-medium ${Math.abs(gap) >= 10 ? 'text-amber-300' : 'text-slate-400'}`}>
                    {gap > 0 ? '+' : ''}{gap} pts
                  </span>
                ) : null}
              </div>
              <div className="relative mt-1 h-3 rounded bg-white/5" title={`IA ${pct(ai)} ± ${pct(sd)}`}>
                <div className="h-3 rounded bg-violet-400/80" style={{ width: pct(Math.min(1, ai)) }} />
                {sd > 0 ? (
                  <div className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-violet-100" style={{ left: pct(Math.max(0, ai - sd)), width: pct(Math.min(1, ai + sd) - Math.max(0, ai - sd)) }} />
                ) : null}
              </div>
              <div className="mt-1 h-3 rounded bg-white/5">
                <div className="h-3 rounded bg-emerald-400" style={{ width: pct(Math.min(1, hu)) }} />
              </div>
              <div className="mt-0.5 flex justify-between text-[11px] text-slate-400">
                <span>IA {pct(ai)}{sd > 0 ? ` (±${Math.round(sd * 100)})` : ''}</span>
                <span>Gente {data.human.voters > 0 ? pct(hu) : '—'}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {multi ? <p className="mt-2 text-[11px] text-slate-400">Se podía elegir más de una opción: cada barra es el % de personas que la eligió, por eso no suman 100%.</p> : null}

      <h4 className="mt-5 text-sm font-semibold text-white">¿Qué tan seguros estaban?</h4>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        <Histogram dist={p.confidenceDistribution} color="rgb(167 139 250 / 0.85)" label={`IA · promedio ${p.avgConfidence ?? '—'}/10`} />
        <Histogram dist={data.human.confidenceDistribution} color="rgb(52 211 153)" label={`Gente · promedio ${data.human.avgConfidence ?? '—'}/10${data.human.unknown ? ` · ${data.human.unknown} “No lo sé”` : ''}`} />
      </div>

      {audience === 'client' ? (
        <div className="mt-5 rounded-lg border border-violet-400/20 bg-violet-400/[0.06] p-3 text-sm text-slate-200">
          <p className="font-semibold text-white">Por qué importa la brecha</p>
          <p className="mt-1">
            La IA representa lo que «se esperaría» de un panel típico de la CDMX con la misma pregunta. Donde la gente real se aleja de esa
            expectativa está lo que una encuesta genérica, un estudio de escritorio o un modelo de IA no le habría dicho: prioridades
            locales, desconfianza o entusiasmo que sólo aparecen al preguntar. Una brecha grande es un hallazgo, no un error: úsela para
            decidir dónde actuar distinto de lo obvio. Una brecha pequeña confirma que la intuición general aplica a su comunidad.
          </p>
        </div>
      ) : null}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        {p.status === 'locked'
          ? `Predicción bloqueada el ${formatLockedAt(p.lockedAt)}, antes del primer voto. `
          : `Predicción registrada el ${formatLockedAt(p.lockedAt)}, después de que ya había votos${p.firstVoteAt ? ` (primer voto: ${formatLockedAt(p.firstVoteAt)})` : ''}. Sólo usó la pregunta y las opciones, pero la marcamos como tardía. `}
        La IA sólo vio la pregunta y las opciones, nunca resultados. {p.nRuns} corridas de {p.nPersonas} personas sintéticas · modelo {p.model}.
        No se puede editar después de bloquearse.
        {p.stale ? ' Nota: la redacción del Pulse cambió después de esta predicción.' : ''}
      </p>
    </section>
  )
}
