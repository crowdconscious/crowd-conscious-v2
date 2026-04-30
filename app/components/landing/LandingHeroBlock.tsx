'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { WorldCupCountdown } from './WorldCupCountdown'
import { FundThermometer } from '@/components/fund/FundThermometer'
import { CONSCIOUS_FUND_GOAL_MXN } from '@/lib/predictions/fund-goal'

type Props = {
  locale: 'es' | 'en'
  fundBalance: number
}

/**
 * Block 1 of the 3-block homepage.
 * Full viewport on mobile, two-column on desktop. Headline + CTAs on
 * the left, live data (Mundial countdown + Conscious Fund thermometer)
 * on the right.
 */
export function LandingHeroBlock({ locale, fundBalance }: Props) {
  const es = locale === 'es'

  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden border-b border-cc-border bg-gradient-to-b from-[#0b1017] via-cc-bg to-cc-bg px-4 py-12 md:px-8 md:py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[40rem] w-[40rem] rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 h-[36rem] w-[36rem] rounded-full bg-amber-500/10 blur-[140px]"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {es ? 'Mundial 2026 · En vivo' : 'World Cup 2026 · Live'}
          </p>

          <h1 className="text-4xl font-bold leading-[1.05] text-white sm:text-5xl md:text-6xl">
            {es ? (
              <>
                Tu voto{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                  financia causas reales.
                </span>
              </>
            ) : (
              <>
                Your vote{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                  funds real causes.
                </span>
              </>
            )}
          </h1>

          <p className="mt-5 max-w-xl text-lg text-slate-300 sm:text-xl">
            {es
              ? 'Empieza con un voto. Sin dinero real, sin tarjeta, sin bots. Solo inteligencia colectiva.'
              : 'Start with a vote. No real money, no credit card, no bots. Just collective intelligence.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pulse"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
            >
              {es ? 'Ver Pulses' : 'Browse Pulses'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/locations"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#2d3748] bg-[#1a2029] px-6 py-3 text-base font-medium text-slate-200 transition-colors hover:border-emerald-500/40"
            >
              {es ? 'Lugares Conscientes' : 'Conscious Locations'}
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            {es
              ? 'Gratis · anónimo para empezar · crea cuenta cuando quieras.'
              : 'Free · anonymous to start · create an account whenever you want.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.12 }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-5 shadow-xl backdrop-blur-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {es ? 'Faltan para el Mundial' : 'Until the World Cup'}
            </p>
            <WorldCupCountdown locale={locale} />
          </div>

          <div className="rounded-2xl border border-[#2d3748] bg-[#0f1419]/80 p-5 shadow-xl backdrop-blur-sm">
            <FundThermometer
              current={fundBalance}
              goal={CONSCIOUS_FUND_GOAL_MXN}
              currency="MXN"
              variant="full"
              locale={locale}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
