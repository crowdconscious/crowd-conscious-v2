'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, MessageCircle, MapPin, Wallet, Vote } from 'lucide-react'
import {
  formatParticipationCount,
  shouldRevealCount,
} from '@/lib/display/participation'
import { trackUxEvent } from '@/lib/ux-overhaul-analytics'

export type LiveActionCardMarket = {
  id: string
  title: string
  total_votes: number | null
  /** Pulse hero cover (`prediction_markets.cover_image_url`, with image_url fallback). */
  cover_image_url?: string | null
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
}

type Props = {
  locale: 'es' | 'en'
  market: LiveActionCardMarket | null
  /** Sentence already localized (question text). */
  question: string
}

/**
 * Phase 1 ATF live action card — verb first, object second, sponsor below.
 * Desktop: copy + CTA left, Pulse cover right. Mobile: cover above the question.
 */
export function LiveActionCard({ locale, market, question }: Props) {
  const es = locale === 'es'

  useEffect(() => {
    trackUxEvent('feed_viewed', {
      surface: 'web',
      card_types: market ? ['A'] : [],
      card_count: market ? 1 : 0,
      header_scope: 'city',
    })
    if (!market) return
    trackUxEvent('card_impression', {
      surface: 'web',
      card_type: 'A',
      position: 0,
      object_id: market.id,
    })
  }, [market])

  if (!market) {
    return (
      <section className="relative overflow-hidden border-b border-cc-border bg-gradient-to-b from-[#0b1017] via-cc-bg to-cc-bg px-4 py-14 md:px-8 md:py-20">
        <Atmosphere />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Crowd Conscious
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            {es
              ? 'Hoy no hay una consulta abierta en la primera pantalla. Explora lo que sí puedes hacer.'
              : 'No live consultation on the first screen today. Explore what you can still do.'}
          </p>
          <TaxonomyLinks locale={locale} className="mt-8 justify-center" />
        </div>
      </section>
    )
  }

  const votes = market.total_votes ?? 0
  const proof = shouldRevealCount(votes)
    ? formatParticipationCount(votes, locale)
    : es
      ? 'Sé el primero en opinar · unos 30 segundos'
      : 'Be the first to weigh in · about 30 seconds'

  const href = `/pulse/${market.id}`
  const cover = market.cover_image_url?.trim() || null

  return (
    <section className="relative overflow-hidden border-b border-cc-border bg-gradient-to-b from-[#0b1017] via-cc-bg to-cc-bg px-4 py-12 md:px-8 md:py-16">
      <Atmosphere />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="order-2 md:order-1"
        >
          <p className="mb-3 text-sm font-medium text-emerald-400/90">
            Crowd Conscious
          </p>

          <Link
            href={href}
            onClick={() =>
              trackUxEvent('card_tapped', {
                surface: 'web',
                card_type: 'A',
                position: 0,
                object_id: market.id,
              })
            }
            className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <p className="text-balance text-3xl font-bold leading-[1.15] text-white sm:text-4xl md:text-5xl">
              {question}
            </p>
            <p className="mt-4 text-base text-slate-400 sm:text-lg">{proof}</p>

            <span className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors group-hover:bg-emerald-400">
              {es ? 'Votar' : 'Vote'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {market.sponsor_name ? (
            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-5">
              {market.sponsor_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={market.sponsor_logo_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover opacity-80"
                />
              ) : null}
              <p className="text-xs text-slate-500">
                {es ? 'Con el apoyo de' : 'Supported by'}{' '}
                <span className="text-slate-400">{market.sponsor_name}</span>
              </p>
            </div>
          ) : null}

          <TaxonomyLinks locale={locale} className="mt-10" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
          className="order-1 md:order-2"
        >
          <Link
            href={href}
            aria-hidden
            tabIndex={-1}
            onClick={() =>
              trackUxEvent('card_tapped', {
                surface: 'web',
                card_type: 'A',
                position: 0,
                object_id: market.id,
              })
            }
            className="relative block aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[#141a22] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.75)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 md:aspect-[5/4]"
          >
            {cover ? (
              <Image
                src={cover}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/30 via-[#141a22] to-sky-900/20">
                <BarChart3 className="h-14 w-14 text-emerald-500/40" aria-hidden />
              </div>
            )}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

function Atmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[36rem] w-[36rem] rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 h-[32rem] w-[32rem] rounded-full bg-sky-500/8 blur-[140px]"
      />
    </>
  )
}

function TaxonomyLinks({
  locale,
  className = '',
}: {
  locale: 'es' | 'en'
  className?: string
}) {
  const es = locale === 'es'
  const links = [
    { href: '/pulse', label: es ? 'Votar' : 'Vote', icon: Vote },
    { href: '/signals', label: es ? 'Respaldar' : 'Co-sign', icon: MessageCircle },
    { href: '/queja', label: es ? 'Reportar' : 'Report', icon: MessageCircle },
    { href: '/locations', label: es ? 'Evaluar' : 'Evaluate', icon: MapPin },
    { href: '/predictions/fund', label: es ? 'Decidir' : 'Decide', icon: Wallet },
  ]

  return (
    <nav
      aria-label={es ? 'Otras acciones' : 'Other actions'}
      className={`flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400 ${className}`}
    >
      {links.map((l) => {
        const Icon = l.icon
        return (
          <Link
            key={l.href + l.label}
            href={l.href}
            className="inline-flex min-h-[44px] items-center gap-1.5 transition-colors hover:text-emerald-300"
          >
            <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
