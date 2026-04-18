import Link from 'next/link'
import { Trophy } from 'lucide-react'

type Props = {
  locale: 'es' | 'en'
  daysUntilWc: number
}

/**
 * Hero section for /live: red-pulse eyebrow, headline, World Cup callout.
 * Category cards moved into `LiveEventsBrowser` so they can drive the
 * filter for the listings below.
 */
export function LiveProductSections({ locale, daysUntilWc }: Props) {
  const es = locale === 'es'
  return (
    <section className="px-4 pb-10 pt-8 sm:pt-10">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          CONSCIOUS LIVE
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {es
            ? 'Predicciones en tiempo real durante eventos en vivo'
            : 'Real-time predictions during live events'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          {es
            ? 'Transmisión en vivo + micro-predicciones + leaderboard + chat. La experiencia de segunda pantalla definitiva.'
            : 'Live stream + micro-predictions + leaderboard + chat. The ultimate second-screen experience.'}
        </p>
        <p className="mt-5 inline-flex items-center justify-center gap-2 text-sm text-emerald-400/95">
          <Trophy className="h-4 w-4 shrink-0" aria-hidden="true" />
          {es ? (
            <span>
              Próximo: Copa del Mundo 2026 — 11 de junio, Estadio Azteca
              {daysUntilWc > 0 ? ` · Faltan ${daysUntilWc} días` : ''}
            </span>
          ) : (
            <span>
              Next: 2026 World Cup — June 11, Estadio Azteca
              {daysUntilWc > 0 ? ` · ${daysUntilWc} days to go` : ''}
            </span>
          )}
        </p>
      </div>
    </section>
  )
}

type B2BProps = {
  locale: 'es' | 'en'
  /** When `true`, render a dashed-border block (used directly under the
   * event listings as an inline CTA). Defaults to the original divider style. */
  variant?: 'section' | 'inline'
}

export function LiveB2BCTA({ locale, variant = 'section' }: B2BProps) {
  const es = locale === 'es'

  if (variant === 'inline') {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-[#2d3748] bg-[#1a2029]/60 p-8 text-center">
        <h3 className="text-base font-semibold text-white sm:text-lg">
          {es ? '¿Quieres un evento en vivo con tu marca?' : 'Want a live event with your brand?'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          {es
            ? 'Lanzamientos, conferencias, subastas — totalmente personalizable.'
            : 'Launches, conferences, auctions — fully customizable.'}
        </p>
        <Link
          href="/pulse"
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          {es ? 'Conocer planes →' : 'View plans →'}
        </Link>
      </div>
    )
  }

  return (
    <section className="border-t border-[#2d3748] px-4 py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-bold text-white">
          {es ? '¿Quieres un evento en vivo con tu marca?' : 'Want a live event with your brand?'}
        </h2>
        <p className="mt-3 text-slate-400">
          {es
            ? 'Lanzamientos, conferencias, activaciones — totalmente personalizable.'
            : 'Launches, conferences, activations — fully customizable.'}
        </p>
        <Link
          href="/pulse"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          {es ? 'Conocer planes →' : 'View plans →'}
        </Link>
      </div>
    </section>
  )
}
