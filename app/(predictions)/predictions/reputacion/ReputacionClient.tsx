'use client'

import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import {
  civicReputationDomainLabel,
  civicReputationReasonLabel,
  type CivicReputationDomain,
  type CivicReputationReason,
} from '@/lib/reputation/domains'

type BreakdownRow = {
  alcaldia: string
  domain: CivicReputationDomain
  points: number
  updated_at: string
}

type RecentRow = {
  id: string
  domain: CivicReputationDomain
  alcaldia: string
  reason: CivicReputationReason
  points: number
  created_at: string
}

type Props = {
  locale: 'es' | 'en'
  totalPoints: number
  breakdown: BreakdownRow[]
  recent: RecentRow[]
}

function formatWhen(iso: string, locale: 'es' | 'en'): string {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ReputacionClient({
  locale,
  totalPoints,
  breakdown,
  recent,
}: Props) {
  const isEs = locale === 'es'

  // Group by alcaldía for the private breakdown.
  const byAlcaldia = new Map<string, BreakdownRow[]>()
  for (const row of breakdown) {
    const list = byAlcaldia.get(row.alcaldia) ?? []
    list.push(row)
    byAlcaldia.set(row.alcaldia, list)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/predictions"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label={isEs ? 'Volver' : 'Back'}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Shield className="h-7 w-7 shrink-0 text-emerald-400" />
            {isEs ? 'Tu reputación' : 'Your reputation'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isEs
              ? 'Privada. Solo tú la ves. Se gana por respaldos que avanzan, señales que otros firman, evaluar lugares y presencia sostenida — nunca por votar una opción o subir tu confianza.'
              : 'Private. Only you see this. Earned for co-signs that advance, señales others back, evaluating places, and sustained presence — never for picking an option or raising confidence.'}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {isEs ? 'Total cívico' : 'Civic total'}
        </p>
        <p className="mt-1 text-3xl font-semibold text-white tabular-nums">
          {totalPoints}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {isEs
            ? 'No es un ranking público. Más adelante podrá abrir acceso en Lugares Conscientes certificados.'
            : 'Not a public ranking. Later this may unlock access at certified Conscious Locations.'}
        </p>
      </div>

      {breakdown.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">
            {isEs
              ? 'Aún no hay reputación cívica. Respaldá una señal hasta un umbral, publicá una que otros firmen, o evaluá un lugar.'
              : 'No civic reputation yet. Co-sign a señal to a stage, publish one others back, or evaluate a place.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signals"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {isEs ? 'Reportar' : 'Report'}
            </Link>
            <Link
              href="/locations"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-500/40"
            >
              {isEs ? 'Evaluar' : 'Evaluate'}
            </Link>
          </div>
        </div>
      ) : (
        <section className="mb-10 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            {isEs ? 'Por alcaldía y dominio' : 'By borough and domain'}
          </h2>
          {[...byAlcaldia.entries()].map(([alcaldia, rows]) => (
            <div key={alcaldia}>
              <h3 className="mb-2 text-lg font-medium text-white">{alcaldia}</h3>
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li
                    key={`${row.alcaldia}-${row.domain}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    <span className="text-sm text-slate-200">
                      {civicReputationDomainLabel(row.domain, locale)}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-emerald-300">
                      {row.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {isEs ? 'Movimientos recientes' : 'Recent movements'}
          </h2>
          <ul className="space-y-2">
            {recent.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <p className="text-sm font-medium text-emerald-300/90">
                  {civicReputationReasonLabel(ev.reason, locale)}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {ev.alcaldia} ·{' '}
                  {civicReputationDomainLabel(ev.domain, locale)} · +{ev.points}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatWhen(ev.created_at, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-slate-600">
        {isEs
          ? 'La precisión en mercados con resultado real se mide aparte — no se mezcla aquí.'
          : 'Accuracy on markets with a real outcome is scored separately — not mixed here.'}
      </p>
    </div>
  )
}
