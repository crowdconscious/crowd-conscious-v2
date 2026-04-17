'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

type Locale = 'es' | 'en'

interface FundThermometerProps {
  /** Current balance in MXN. When omitted the component fetches it from /api/fund/balance. */
  current?: number
  /** Goal in MXN. When omitted the component reads it from /api/fund/balance. */
  goal?: number
  /** ISO 4217 currency code; only MXN is supported visually for now. */
  currency?: 'MXN'
  /** Compact = footer / inline placement; full = landing / fund page. */
  variant?: 'compact' | 'full'
  /** Optional href; when provided wraps the bar in a link to the fund page. */
  href?: string
  /** Locale override; falls back to ES. */
  locale?: Locale
  className?: string
}

const COPY = {
  es: {
    raised: 'recaudados',
    goal: 'Meta',
    seedExplainer: 'El Fondo se activa con cada patrocinio y voto.',
    cta: 'Ver Fondo Consciente',
  },
  en: {
    raised: 'raised',
    goal: 'Goal',
    seedExplainer: 'The Fund grows with every sponsorship and vote.',
    cta: 'See the Conscious Fund',
  },
} as const

function formatMxn(amount: number, locale: Locale): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: 1 })}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: 1 })}K`
  }
  return `$${amount.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', { maximumFractionDigits: 0 })}`
}

export function FundThermometer({
  current,
  goal,
  currency = 'MXN',
  variant = 'full',
  href,
  locale = 'es',
  className = '',
}: FundThermometerProps) {
  const t = COPY[locale]
  const needsFetch = current == null || goal == null
  const [fetched, setFetched] = useState<{ total: number; goal: number } | null>(null)

  useEffect(() => {
    if (!needsFetch) return
    let cancelled = false
    fetch('/api/fund/balance', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { total_mxn?: number; goal_mxn?: number }) => {
        if (cancelled) return
        if (typeof d.total_mxn === 'number' && typeof d.goal_mxn === 'number') {
          setFetched({ total: d.total_mxn, goal: d.goal_mxn })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [needsFetch])

  const total = current ?? fetched?.total ?? 0
  const target = goal ?? fetched?.goal ?? 100_000
  const pct = target > 0 ? Math.min(100, (total / target) * 100) : 0
  const hasFunds = total > 0

  const compact = variant === 'compact'

  const body = (
    <div
      className={`group rounded-xl border border-emerald-500/20 bg-[#1a2029] ${
        compact ? 'p-3' : 'p-4 md:p-5'
      } transition-colors hover:border-emerald-500/40 ${className}`}
    >
      <div className={`flex items-baseline justify-between gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="min-w-0">
          <p className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {formatMxn(total, locale)} {currency}
          </p>
          <p className={`text-emerald-400/80 ${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-wider`}>
            {t.raised}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>{t.goal}</p>
          <p className={`font-medium text-gray-200 ${compact ? 'text-xs' : 'text-sm'}`}>
            {formatMxn(target, locale)} {currency}
          </p>
        </div>
      </div>

      <div
        className={`relative w-full overflow-hidden rounded-full bg-gray-800/70 ${
          compact ? 'h-2' : 'h-3'
        }`}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatMxn(total, locale)} ${currency} ${t.raised}`}
      >
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        {hasFunds && (
          <motion.div
            className="absolute left-0 top-0 h-full w-full rounded-full bg-emerald-300/15"
            animate={{ opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {!compact && !hasFunds && (
        <p className="mt-3 text-xs text-gray-500">{t.seedExplainer}</p>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-xl">
        {body}
        {!compact && (
          <p className="mt-2 text-xs font-medium text-emerald-400 hover:text-emerald-300">
            {t.cta} →
          </p>
        )}
      </Link>
    )
  }

  return body
}

export default FundThermometer
