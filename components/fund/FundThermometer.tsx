'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

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

/* ──────────────────────────────────────────────────────────────────────── */
/* CompactFundThermometer — 28px header pill                                */
/* ──────────────────────────────────────────────────────────────────────── */

interface CompactFundThermometerProps {
  /** Locale override; falls back to ES. */
  locale?: Locale
  /** Override the destination href; defaults to the canonical fund page. */
  href?: string
  className?: string
}

function formatMxnPrecise(amount: number, locale: Locale): string {
  return amount.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
    maximumFractionDigits: 0,
  })
}

/**
 * Header-grade fund pill: 28px tall, "$X,XXX MXN" with a pulsing 4-dot
 * indicator when balance > 0. Subscribes to conscious_fund realtime
 * inserts/updates so the number ticks up live during match-day donations,
 * with a 5s debounce so a burst of writes doesn't flicker the UI.
 *
 * Mobile: collapses to a single emerald dot that expands the full pill on
 * tap (state is purely local — re-collapses on next render of the parent).
 */
export function CompactFundThermometer({
  locale = 'es',
  href = '/predictions/fund',
  className = '',
}: CompactFundThermometerProps) {
  const [total, setTotal] = useState<number | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const r = await fetch('/api/fund/balance', { cache: 'no-store' })
        const d = (await r.json()) as { total_mxn?: number }
        if (!cancelled && typeof d.total_mxn === 'number') setTotal(d.total_mxn)
      } catch {
        /* noop — keep showing previous value */
      }
    }

    void load()

    const channel = supabaseClient
      .channel('compact-fund-thermometer')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conscious_fund' },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(load, 5000)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      void supabaseClient.removeChannel(channel)
    }
  }, [])

  const hasFunds = (total ?? 0) > 0
  const display = total == null ? '—' : `$${formatMxnPrecise(total, locale)} MXN`
  const ariaLabel =
    locale === 'es'
      ? `Fondo Consciente: ${display} recaudados`
      : `Conscious Fund: ${display} raised`

  return (
    <>
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`hidden md:inline-flex h-7 items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 hover:border-emerald-400/60 hover:text-emerald-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${className}`}
      >
        <PulseDots active={hasFunds} />
        <span className="tabular-nums">{display}</span>
      </Link>

      <div className="md:hidden">
        {mobileExpanded ? (
          <Link
            href={href}
            onClick={() => setMobileExpanded(false)}
            aria-label={ariaLabel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300"
          >
            <PulseDots active={hasFunds} />
            <span className="tabular-nums">{display}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            aria-label={ariaLabel}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
          >
            <span className="relative flex h-2.5 w-2.5">
              {hasFunds && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
          </button>
        )}
      </div>
    </>
  )
}

/** 4-dot pulse used inside the compact pill. */
function PulseDots({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-emerald-700'}`}
          animate={
            active
              ? { opacity: [0.35, 1, 0.35], scale: [0.85, 1.05, 0.85] }
              : { opacity: 0.4 }
          }
          transition={
            active
              ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }
              : undefined
          }
        />
      ))}
    </span>
  )
}
