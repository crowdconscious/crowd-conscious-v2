'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

export interface FundImpactTickerProps {
  totalVotes: number
  fundImpact: number
  activeCause: string
  sponsorName?: string
  locale?: 'en' | 'es'
  /**
   * When fund impact is $0 (typical for free-to-play live events), show votes + sponsor
   * instead of "→ $0.00 for …", which reads as broken.
   */
  hideFundAmountWhenZero?: boolean
}

function formatMoney(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatInt(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US').format(Math.round(n))
}

function useAnimatedScalar(target: number, duration = 600) {
  const [v, setV] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const start = fromRef.current
    const end = target
    if (start === end) return
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - t, 2)
      setV(start + (end - start) * eased)
      if (t < 1) requestAnimationFrame(tick)
      else fromRef.current = end
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return v
}

export function FundImpactTicker({
  totalVotes,
  fundImpact,
  activeCause,
  sponsorName,
  locale = 'es',
  hideFundAmountWhenZero = false,
}: FundImpactTickerProps) {
  const av = useAnimatedScalar(totalVotes, 500)
  const am = useAnimatedScalar(fundImpact, 500)
  const prevVotes = useRef(totalVotes)
  const pulse = totalVotes !== prevVotes.current
  useEffect(() => {
    prevVotes.current = totalVotes
  }, [totalVotes])

  const showVotesOnly =
    hideFundAmountWhenZero && (fundImpact <= 0 || !Number.isFinite(fundImpact))

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.012, 1] } : {}}
      transition={{ duration: 0.35 }}
      className="w-full rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-950/90 px-4 py-3 shadow-md shadow-emerald-900/20"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {showVotesOnly ? (
          <p className="text-sm leading-relaxed text-emerald-100/95 sm:text-base">
            <span className="mr-1.5" aria-hidden>
              🌍
            </span>
            <span className="font-semibold text-white">{formatInt(av, locale)}</span>
            <span className="text-emerald-200/90">
              {' '}
              {locale === 'es' ? 'votos' : 'votes'}
              {sponsorName ? (
                <>
                  <span className="text-emerald-100/70"> · </span>
                  <span className="text-emerald-100/85">
                    {locale === 'es' ? 'Patrocinado por' : 'Powered by'}{' '}
                  </span>
                  <span className="font-medium text-white">{sponsorName}</span>
                </>
              ) : (
                <>
                  <span className="text-emerald-100/70"> · </span>
                  <span className="font-medium text-white">{activeCause}</span>
                </>
              )}
            </span>
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-emerald-100/95 sm:text-base">
            <span className="mr-1.5" aria-hidden>
              🌍
            </span>
            <span className="font-semibold text-white">{formatInt(av, locale)}</span>
            <span className="text-emerald-200/90">
              {' '}
              {locale === 'es' ? 'votos →' : 'votes →'}{' '}
            </span>
            <span className="font-semibold text-emerald-300">{formatMoney(am, locale)}</span>
            <span className="text-emerald-100/85"> {locale === 'es' ? 'para' : 'for'} </span>
            <span className="font-medium text-white">{activeCause}</span>
          </p>
        )}
        {!showVotesOnly && sponsorName && (
          <p className="text-xs text-teal-200/80 sm:text-right">
            {locale === 'es' ? 'Patrocinado por' : 'Powered by'}{' '}
            <span className="font-semibold text-teal-100">{sponsorName}</span>
          </p>
        )}
      </div>
    </motion.div>
  )
}
