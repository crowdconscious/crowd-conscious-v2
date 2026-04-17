'use client'

import { useEffect, useState } from 'react'
import { daysUntilWorldCup } from '@/lib/world-cup-kickoff'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Top-of-page Mundial hero on /pulse. Anchors the page to the World Cup
 * narrative (the entire reason most B2B prospects will land here in May/June)
 * and routes them to the pricing block where the Mundial Pulse Pack lives.
 *
 * Renders client-side so the countdown can update without re-fetching the
 * server tree.
 */
export function MundialPulseHero({ locale }: Props) {
  const es = locale === 'es'
  const [days, setDays] = useState<number>(() => daysUntilWorldCup())

  useEffect(() => {
    const id = setInterval(() => setDays(daysUntilWorldCup()), 60_000)
    return () => clearInterval(id)
  }, [])

  const onClick = () => {
    document
      .getElementById('pulse-mundial-pack')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="border-b border-white/10 bg-gradient-to-br from-emerald-900/20 via-[#0f1419] to-amber-900/10 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
          {es ? 'Edición Mundial 2026' : 'World Cup 2026 Edition'}
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {es
            ? 'El Mundial llega a México. ¿Qué piensa tu comunidad?'
            : 'The World Cup is coming to Mexico. What does your community think?'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          {es
            ? 'Mide el sentimiento real con Conscious Pulse. Sin bots. Sin encuestas aburridas. Confianza real.'
            : 'Measure real sentiment with Conscious Pulse. No bots. No boring surveys. Real confidence.'}
        </p>

        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          <span aria-hidden>⚽</span>
          <span>
            {es ? `Faltan ${days} días para la inauguración` : `${days} days until kickoff`}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClick}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {es ? 'Ver el Mundial Pulse Pack' : 'See the World Cup Pulse Pack'}
          </button>
          <a
            href="#pulse-pricing"
            className="rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            {es ? 'Ver todos los planes' : 'See all plans'}
          </a>
        </div>
      </div>
    </section>
  )
}
