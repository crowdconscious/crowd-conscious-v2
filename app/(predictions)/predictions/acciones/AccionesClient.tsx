'use client'

import Link from 'next/link'
import { ArrowLeft, ListChecks, Vote, Megaphone, PenLine, Radio, BookOpen, Shield } from 'lucide-react'
import type { UserActionItem, UserActionKind } from '@/lib/actions/user-actions'

type Props = {
  locale: 'es' | 'en'
  counts: Record<UserActionKind, number>
  recent: UserActionItem[]
  showReputationLink: boolean
}

const LABELS: Record<UserActionKind, { es: string; en: string; icon: typeof Vote }> = {
  vote: { es: 'Votos en Pulses', en: 'Pulse votes', icon: Vote },
  signal: { es: 'Señales publicadas', en: 'Signals published', icon: Megaphone },
  cosign: { es: 'Señales respaldadas', en: 'Signals co-signed', icon: PenLine },
  live: { es: 'Votos en eventos en vivo', en: 'Live event votes', icon: Radio },
  course: { es: 'Cursos', en: 'Courses', icon: BookOpen },
}

const ITEM_VERB: Record<UserActionKind, { es: string; en: string }> = {
  vote: { es: 'Votaste en', en: 'You voted on' },
  signal: { es: 'Publicaste', en: 'You published' },
  cosign: { es: 'Respaldaste', en: 'You co-signed' },
  live: { es: 'Votaste en vivo en', en: 'You voted live on' },
  course: { es: 'Te inscribiste en', en: 'You enrolled in' },
}

const ORDER: UserActionKind[] = ['vote', 'signal', 'cosign', 'live', 'course']

function formatWhen(iso: string, locale: 'es' | 'en'): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
  })
}

export function AccionesClient({ locale, counts, recent, showReputationLink }: Props) {
  const isEs = locale === 'es'
  const total = ORDER.reduce((s, k) => s + counts[k], 0)

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
            <ListChecks className="h-7 w-7 shrink-0 text-emerald-400" />
            {isEs ? 'Tus acciones' : 'Your actions'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isEs
              ? 'Privado. Solo tú lo ves. Tus acciones quedan registradas como evidencia — no son puntos ni hay rankings.'
              : 'Private. Only you see this. Your actions are recorded as evidence — not points, and there are no rankings.'}
          </p>
        </div>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ORDER.map((kind) => {
          const { icon: Icon } = LABELS[kind]
          return (
            <div key={kind} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <Icon className="mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-2xl font-semibold tabular-nums text-white">{counts[kind]}</p>
              <p className="text-xs text-slate-400">{isEs ? LABELS[kind].es : LABELS[kind].en}</p>
            </div>
          )
        })}
      </section>

      {showReputationLink && (
        <Link
          href="/predictions/reputacion"
          className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200 hover:border-emerald-500/60"
        >
          <Shield className="h-5 w-5 shrink-0" />
          {isEs
            ? 'Ver tu reputación cívica privada (por alcaldía y dominio)'
            : 'See your private civic reputation (by borough and domain)'}
        </Link>
      )}

      {total === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <p className="text-slate-400">
            {isEs
              ? 'Aún no hay acciones registradas. Vota en un Pulse, publica o respalda una señal.'
              : 'No actions recorded yet. Vote on a Pulse, or publish or co-sign a signal.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/pulse" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
              {isEs ? 'Ver Pulses' : 'See Pulses'}
            </Link>
            <Link href="/signals" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-500/40">
              {isEs ? 'Reportar' : 'Report'}
            </Link>
          </div>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {isEs ? 'Recientes' : 'Recent'}
          </h2>
          <ul className="space-y-2">
            {recent.map((item) => {
              const verb = isEs ? ITEM_VERB[item.kind].es : ITEM_VERB[item.kind].en
              const body = (
                <>
                  <p className="text-sm text-slate-200">
                    <span className="text-slate-400">{verb} </span>
                    {item.title || (isEs ? '(sin título)' : '(untitled)')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatWhen(item.created_at, locale)}</p>
                </>
              )
              return (
                <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  {item.href ? (
                    <Link href={item.href} className="block hover:opacity-90">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
