'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Props = {
  locale: 'es' | 'en'
  /** Override the conservative defaults at render time (e.g. SSR caller). */
  votes?: number
  avgConfidence?: number
  marketHref?: string
  blogHref?: string
}

type LiveStats = {
  votes: number
  avg_confidence: number
  market_href?: string
}

const BLOG_HREF = '/blog/club-reset-18-personas'

export function ClubResetCaseStudyCard({
  locale,
  votes: votesProp = 18,
  avgConfidence: confProp = 9.2,
  marketHref: marketProp = '/locations',
  blogHref = BLOG_HREF,
}: Props) {
  const [stats, setStats] = useState<LiveStats>({
    votes: votesProp,
    avg_confidence: confProp,
    market_href: marketProp,
  })

  useEffect(() => {
    let aborted = false
    fetch('/api/case-studies/club-reset')
      .then((r) => r.json())
      .then((data: LiveStats) => {
        if (aborted) return
        setStats({
          votes: data.votes ?? votesProp,
          avg_confidence: data.avg_confidence ?? confProp,
          market_href: data.market_href ?? marketProp,
        })
      })
      .catch(() => {
        // Non-fatal: the conservative defaults render fine.
      })
    return () => {
      aborted = true
    }
  }, [votesProp, confProp, marketProp])

  const votes = stats.votes
  const avgConfidence = stats.avg_confidence
  const marketHref = stats.market_href ?? marketProp
  const es = locale === 'es'
  return (
    <section className="border-t border-white/10 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {es ? 'Caso de estudio' : 'Case study'}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Club Reset</h2>
        <p className="mt-3 text-base text-slate-300">
          {es
            ? `${votes} personas votaron sobre la consciencia de Club Reset en Juárez — con ${avgConfidence.toFixed(1)}/10 de confianza promedio.`
            : `${votes} people voted on Club Reset's consciousness in Juárez — with an average confidence of ${avgConfidence.toFixed(1)}/10.`}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {es
            ? 'El mercado más activo de toda la plataforma. Esto es lo que sucede cuando un Lugar Consciente abre su comunidad a votar con confianza real.'
            : 'The most active market on the entire platform. This is what happens when a Conscious Location lets its community vote with real confidence.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={blogHref}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {es ? 'Leer el caso completo →' : 'Read the full case study →'}
          </Link>
          <Link
            href={marketHref}
            className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            {es ? 'Ver el mercado →' : 'See the market →'}
          </Link>
        </div>
      </div>
    </section>
  )
}
