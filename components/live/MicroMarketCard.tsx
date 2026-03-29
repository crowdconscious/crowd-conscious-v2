'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'
import { getMarketText, getOutcomeLabel } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import { cn } from '@/lib/design-system'

type PredictionMarket = Database['public']['Tables']['prediction_markets']['Row'] & {
  /** JSONB column from DB (see migration 139); omitted from generated Row for Json compatibility */
  translations?: {
    en?: { title?: string; description?: string; resolution_criteria?: string }
    [key: string]: Record<string, string> | undefined
  } | null
}
type MarketOutcome = Database['public']['Tables']['market_outcomes']['Row'] & {
  translations?: { en?: { label?: string }; [key: string]: { label?: string } | undefined } | null
}

type MyVote = {
  outcome_id: string
  confidence: number
  xp_earned: number
  is_correct: boolean | null
  bonus_xp: number
}

export interface MicroMarketCardProps {
  market: PredictionMarket
  outcomes: MarketOutcome[]
  currentUserId: string
  onVoteSuccess?: () => void
}

function toMs(iso: string): number {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function MicroMarketCard({
  market,
  outcomes,
  currentUserId,
  onVoteSuccess,
}: MicroMarketCardProps) {
  const locale = useLocale()
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(5)
  const [myVote, setMyVote] = useState<MyVote | null>(null)
  const [loadingVote, setLoadingVote] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const allowAnonymousVote =
    market.live_event_id != null || market.is_micro_market === true

  const isResolved = market.status === 'resolved'
  const hasVoted = !!myVote && !isResolved

  const title = getMarketText(
    {
      title: market.title,
      description: market.description,
      resolution_criteria: market.resolution_criteria,
      translations: market.translations as {
        en?: { title?: string; description?: string; resolution_criteria?: string }
        [key: string]: Record<string, string> | undefined
      } | null,
    },
    'title',
    locale
  )

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingVote(true)
      try {
        const res = await fetch(`/api/predictions/markets/${market.id}/my-vote`, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          setMyVote(null)
          return
        }
        const json = await res.json()
        if (cancelled) return
        const v = json.vote as {
          outcome_id: string
          confidence: number
          xp_earned: number
          is_correct: boolean | null
          bonus_xp: number
          is_anonymous?: boolean
        } | null
        if (v) {
          setMyVote({
            outcome_id: v.outcome_id,
            confidence: v.confidence,
            xp_earned: v.xp_earned,
            is_correct: v.is_correct,
            bonus_xp: v.bonus_xp ?? 0,
          })
          setSelectedOutcomeId(v.outcome_id)
          setConfidence(v.confidence)
        } else {
          setMyVote(null)
        }
      } catch {
        if (!cancelled) setMyVote(null)
      } finally {
        if (!cancelled) setLoadingVote(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [market.id, currentUserId])

  const endMs = useMemo(() => toMs(market.resolution_date), [market.resolution_date])
  const timeRemainingSec = Math.max(0, Math.floor((endMs - now) / 1000))
  const isClosed = !isResolved && timeRemainingSec <= 0

  const handleVote = useCallback(async () => {
    if (!selectedOutcomeId || isSubmitting || isResolved || isClosed || hasVoted) return
    if (!currentUserId && !allowAnonymousVote) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/predictions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          market_id: market.id,
          outcome_id: selectedOutcomeId,
          confidence,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.alreadyVoted === true) {
        const rv = await fetch(`/api/predictions/markets/${market.id}/my-vote`, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const j = await rv.json().catch(() => ({}))
        const v = j.vote as {
          outcome_id: string
          confidence: number
          xp_earned: number
          is_correct: boolean | null
          bonus_xp: number
        } | null
        if (v) {
          setMyVote({
            outcome_id: v.outcome_id,
            confidence: v.confidence,
            xp_earned: v.xp_earned,
            is_correct: v.is_correct,
            bonus_xp: v.bonus_xp ?? 0,
          })
          setSelectedOutcomeId(v.outcome_id)
          setConfidence(v.confidence)
        } else {
          setErrorMsg(locale === 'es' ? 'Ya votaste en este mercado' : 'Already voted on this market')
        }
        onVoteSuccess?.()
        return
      }
      if (!res.ok) {
        setErrorMsg(typeof data.error === 'string' ? data.error : locale === 'es' ? 'No se pudo votar' : 'Vote failed')
        return
      }
      const xp =
        typeof data.xp_earned === 'number' ? data.xp_earned : data.isAnonymous ? 0 : 5
      setMyVote({
        outcome_id: selectedOutcomeId,
        confidence,
        xp_earned: xp,
        is_correct: null,
        bonus_xp: 0,
      })
      onVoteSuccess?.()
    } catch {
      setErrorMsg(locale === 'es' ? 'Error de red' : 'Network error')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    selectedOutcomeId,
    isSubmitting,
    isResolved,
    isClosed,
    hasVoted,
    market.id,
    confidence,
    onVoteSuccess,
    locale,
    currentUserId,
    allowAnonymousVote,
  ])

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const xpWon =
    myVote && isResolved && myVote.is_correct === true
      ? myVote.xp_earned + (myVote.bonus_xp ?? 0)
      : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a2029] p-4 text-sm shadow-xl shadow-black/30 sm:p-5"
    >
      {market.sponsor_label && (
        <div className="mb-3 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200/95">
          {market.sponsor_label}
        </div>
      )}

      <h3 className="text-lg font-bold leading-snug text-white sm:text-xl">{title}</h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
        <span aria-hidden>⏱</span>
        {isResolved ? (
          <span>{locale === 'es' ? 'Mercado resuelto' : 'Market resolved'}</span>
        ) : isClosed ? (
          <span className="text-amber-400">{locale === 'es' ? 'Mercado cerrado' : 'Market closed'}</span>
        ) : (
          <span>
            {fmtTime(timeRemainingSec)} {locale === 'es' ? 'restantes' : 'remaining'}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {outcomes.map((o) => {
          const label = getOutcomeLabel(o, locale)
          const pct = toDisplayPercentRounded(o.probability)
          const selected = selectedOutcomeId === o.id
          const winner = isResolved && o.is_winner === true
          const mine = myVote?.outcome_id === o.id

          return (
            <motion.button
              key={o.id}
              type="button"
              disabled={isResolved || isClosed || hasVoted || loadingVote}
              onClick={() => {
                setSelectedOutcomeId(o.id)
                setErrorMsg(null)
              }}
              animate={
                hasVoted && mine && !isResolved
                  ? { scale: [1, 1.07, 1] }
                  : {}
              }
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className={cn(
                'group relative flex min-h-[44px] flex-col overflow-hidden rounded-xl border px-3 py-3 text-left text-sm transition-transform active:scale-[0.98]',
                selected && !isResolved
                  ? 'border-emerald-400/80 bg-emerald-500/15 ring-1 ring-emerald-400/40'
                  : 'border-white/10 bg-white/5 hover:border-white/20',
                winner && 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-400/50',
                (isResolved || isClosed || hasVoted) && !winner && mine && 'opacity-60'
              )}
            >
              <span className="font-semibold text-white">{label}</span>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/40">
                <motion.div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400',
                    winner && 'from-emerald-400 to-teal-300'
                  )}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>
              <span className="mt-1 text-sm text-slate-400">{pct}%</span>
            </motion.button>
          )
        })}
      </div>

      {!isResolved && !isClosed && !hasVoted && selectedOutcomeId && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>{locale === 'es' ? 'Confianza' : 'Confidence'}</span>
            <span className="font-mono text-emerald-300">{confidence}/10</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="touch-range-input w-full cursor-pointer accent-emerald-500"
            aria-label={locale === 'es' ? 'Confianza' : 'Confidence'}
          />
          <div className="flex justify-between gap-0.5">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-2 flex-1 rounded-sm',
                  i < confidence ? 'bg-emerald-500' : 'bg-slate-700'
                )}
              />
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-3 rounded-lg border border-red-500/35 bg-red-950/50 px-3 py-2.5 text-sm text-red-300" role="alert">
          {errorMsg}
        </p>
      )}

      {!isResolved && !isClosed && !hasVoted && (
        <button
          type="button"
          disabled={!selectedOutcomeId || isSubmitting || loadingVote}
          onClick={handleVote}
          className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === 'es' ? 'Enviando…' : 'Sending…'}
            </>
          ) : (
            locale === 'es' ? 'Votar' : 'Vote'
          )}
        </button>
      )}

      {hasVoted && !isResolved && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Check className="h-5 w-5 shrink-0" />
            <span className="font-medium">{locale === 'es' ? '¡Voto registrado!' : 'Vote recorded!'}</span>
          </div>
          {!currentUserId && allowAnonymousVote && (
            <p className="text-sm leading-relaxed text-slate-400">
              {locale === 'es' ? (
                <>
                  Crea una cuenta para ganar XP y seguir tus predicciones.{' '}
                  <Link href="/signup" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                    Registrarse
                  </Link>
                </>
              ) : (
                <>
                  Sign up to earn XP and track your predictions.{' '}
                  <Link href="/signup" className="font-medium text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
                    Create account
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}

      {isResolved && myVote && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
          {myVote.is_correct === true && (
            <p className="text-center text-lg font-bold text-emerald-400">
              +{xpWon} XP
            </p>
          )}
          {myVote.is_correct === false && (
            <p className="text-center text-sm text-slate-400">
              {locale === 'es' ? 'Mejor suerte la próxima vez' : 'Better luck next time'}
            </p>
          )}
          {myVote.is_correct === null && (
            <p className="text-center text-sm text-slate-400">
              {locale === 'es' ? 'Esperando resultado…' : 'Awaiting result…'}
            </p>
          )}
        </div>
      )}
    </motion.div>
  )
}
