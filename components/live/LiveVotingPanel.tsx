'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import type { MarketWithOutcomes } from '@/hooks/useLiveMarkets'
import { MicroMarketCard } from '@/components/live/MicroMarketCard'
import { cn } from '@/lib/design-system'

export interface LiveVotingPanelProps {
  activeMarkets: MarketWithOutcomes[]
  resolvedMarkets: MarketWithOutcomes[]
  currentUserId: string
  isAdmin?: boolean
  locale?: 'en' | 'es'
}

type VoteResult = {
  outcome_id: string
  is_correct: boolean | null
}

async function fetchMyVote(marketId: string): Promise<VoteResult | null> {
  const res = await fetch(`/api/predictions/markets/${marketId}/my-vote`, { cache: 'no-store' })
  if (!res.ok) return null
  const json = await res.json()
  const v = json.vote as { outcome_id: string; is_correct: boolean | null } | null
  if (!v) return null
  return { outcome_id: v.outcome_id, is_correct: v.is_correct }
}

function RecentResolvedRow({
  market,
  locale,
}: {
  market: MarketWithOutcomes
  locale: 'en' | 'es'
}) {
  const [mine, setMine] = useState<VoteResult | null>(null)
  useEffect(() => {
    let c = false
    void fetchMyVote(market.id).then((r) => {
      if (!c) setMine(r)
    })
    return () => {
      c = true
    }
  }, [market.id])

  const winner = market.outcomes.find((o) => o.is_winner === true)

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <p className="font-medium text-white line-clamp-2">{market.title}</p>
      <p className="mt-1 text-sm text-slate-400">
        {winner
          ? `${locale === 'es' ? 'Ganador' : 'Winner'}: ${winner.label}`
          : locale === 'es'
            ? 'Resuelto'
            : 'Resolved'}
        {mine && mine.is_correct !== null && (
          <span
            className={cn(
              'ml-2 font-semibold',
              mine.is_correct ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {mine.is_correct
              ? locale === 'es'
                ? '✓ Acertaste'
                : '✓ Correct'
              : locale === 'es'
                ? '✗ No acertaste'
                : '✗ Miss'}
          </span>
        )}
      </p>
    </div>
  )
}

export function LiveVotingPanel({
  activeMarkets,
  resolvedMarkets,
  currentUserId,
  isAdmin = false,
  locale = 'es',
}: LiveVotingPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const prevIdsRef = useRef<string>('')
  const [pulse, setPulse] = useState(false)
  const [openRecent, setOpenRecent] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)

  const sortedActive = useMemo(
    () => [...activeMarkets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [activeMarkets]
  )

  const recentThree = useMemo(() => resolvedMarkets.slice(0, 3), [resolvedMarkets])

  const idKey = sortedActive.map((m) => m.id).join(',')

  useEffect(() => {
    if (!idKey) {
      prevIdsRef.current = ''
      return
    }
    const prev = prevIdsRef.current
    if (prev && idKey !== prev) {
      const prevSet = new Set(prev.split(',').filter(Boolean))
      const nowIds = idKey.split(',').filter(Boolean)
      const added = nowIds.some((id) => !prevSet.has(id))
      if (added) {
        setPulse(true)
        const t = setTimeout(() => setPulse(false), 4000)
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' })
        })
        prevIdsRef.current = idKey
        return () => clearTimeout(t)
      }
    }
    prevIdsRef.current = idKey
  }, [idKey])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || sortedActive.length <= 1) return
    const onScroll = () => {
      const firstCard = el.querySelector<HTMLElement>('[data-live-market-slide]')
      const slideW = firstCard?.offsetWidth ?? el.clientWidth
      const gap = 16
      const step = slideW + gap
      if (step <= 0) return
      const idx = Math.round(el.scrollLeft / step)
      setActiveSlide(Math.min(sortedActive.length - 1, Math.max(0, idx)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [sortedActive.length])

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (touchStartX.current == null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      const el = scrollRef.current
      if (!el || sortedActive.length <= 1) return
      if (Math.abs(dx) < 56) return
      const firstCard = el.querySelector<HTMLElement>('[data-live-market-slide]')
      const slideW = firstCard?.offsetWidth ?? el.clientWidth
      const gap = 16
      const step = slideW + gap
      el.scrollBy({ left: dx < 0 ? step : -step, behavior: 'smooth' })
    },
    [sortedActive.length]
  )

  const onVoteSuccess = useCallback(() => {
    /* parent realtime will refresh outcomes */
  }, [])

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {pulse && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{
              opacity: 1,
              y: 0,
              x: [0, -5, 5, -4, 4, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
              x: { duration: 0.45, ease: 'easeInOut' },
            }}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-300" />
            {locale === 'es' ? '¡Nueva predicción disponible!' : 'New prediction available!'}
          </motion.div>
        )}
      </AnimatePresence>

      {sortedActive.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-slate-900/40 px-4 py-10 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
            ⚽
          </div>
          <p className="text-base font-medium text-slate-200">
            {locale === 'es'
              ? 'Aún no hay micro-mercados activos'
              : 'No active micro-markets yet'}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
            {locale === 'es'
              ? 'Cuando el partido esté en vivo, aquí aparecerán predicciones rápidas. ¡Vuelve pronto!'
              : 'When the match is live, quick predictions will show up here. Check back soon!'}
          </p>
          {isAdmin && (
            <p className="mt-4 text-sm text-amber-200/90">
              {locale === 'es'
                ? 'Crea un mercado desde el panel de control (abajo a la derecha).'
                : 'Create a market from the control panel (bottom-right).'}
            </p>
          )}
        </div>
      ) : sortedActive.length === 1 ? (
        <MicroMarketCard
          market={sortedActive[0]}
          outcomes={sortedActive[0].outcomes}
          currentUserId={currentUserId}
          onVoteSuccess={onVoteSuccess}
        />
      ) : (
        <div>
          <div
            ref={scrollRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-webkit-overflow-scrolling:touch] scrollbar-hide"
          >
            {sortedActive.map((m) => (
              <div
                key={m.id}
                data-live-market-slide
                className="w-[min(100%,420px)] shrink-0 snap-center"
              >
                <MicroMarketCard
                  market={m}
                  outcomes={m.outcomes}
                  currentUserId={currentUserId}
                  onVoteSuccess={onVoteSuccess}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-2">
            {sortedActive.map((_, j) => (
              <button
                key={j}
                type="button"
                aria-label={locale === 'es' ? `Mercado ${j + 1}` : `Market ${j + 1}`}
                onClick={() => {
                  const el = scrollRef.current
                  if (!el) return
                  const first = el.querySelector<HTMLElement>('[data-live-market-slide]')
                  const slideW = first?.offsetWidth ?? el.clientWidth
                  const gap = 16
                  el.scrollTo({ left: j * (slideW + gap), behavior: 'smooth' })
                }}
                className={cn(
                  'min-h-[44px] min-w-[44px] rounded-full p-2 transition-colors',
                  j === activeSlide ? 'text-emerald-400' : 'text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'mx-auto block h-2 w-2 rounded-full transition-colors',
                    j === activeSlide ? 'bg-emerald-400' : 'bg-slate-600'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {recentThree.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60">
          <button
            type="button"
            onClick={() => setOpenRecent((o) => !o)}
            className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-200"
          >
            {locale === 'es' ? 'Resultados recientes' : 'Recent results'}
            <ChevronDown className={cn('h-4 w-4 transition', openRecent && 'rotate-180')} />
          </button>
          {openRecent && (
            <div className="space-y-2 border-t border-white/5 px-4 pb-4 pt-2">
              {recentThree.map((m) => (
                <RecentResolvedRow key={m.id} market={m} locale={locale} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
