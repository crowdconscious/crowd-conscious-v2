'use client'

import { useCallback, useMemo, useState } from 'react'
import { Gavel, Loader2, Trophy } from 'lucide-react'
import { cn } from '@/lib/design-system'
import type { LiveAuctionItemWithBids } from '@/lib/live/auction-types'
import { useLiveAuction } from '@/hooks/useLiveAuction'

function formatMoney(amount: number, currency: string, locale: 'es' | 'en'): string {
  try {
    return new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: currency || 'MXN',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

function statusLabel(status: string, locale: 'es' | 'en'): string {
  const map: Record<string, { es: string; en: string }> = {
    upcoming: { es: 'Próximamente', en: 'Upcoming' },
    bidding: { es: 'Abierta', en: 'Open' },
    sold: { es: 'Vendida', en: 'Sold' },
    ended: { es: 'Cerrada', en: 'Closed' },
    cancelled: { es: 'Cancelada', en: 'Cancelled' },
  }
  return map[status]?.[locale] ?? status
}

function ItemLeaderboard({
  item,
  locale,
}: {
  item: LiveAuctionItemWithBids
  locale: 'es' | 'en'
}) {
  if (item.top_bids.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {locale === 'es' ? 'Sin pujas aún.' : 'No bids yet.'}
      </p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {item.top_bids.slice(0, 5).map((b) => (
        <li
          key={`${b.user_id ?? b.anonymous_participant_id}-${b.rank}`}
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm',
            b.is_you ? 'bg-emerald-500/10 ring-1 ring-emerald-500/25' : 'bg-white/5'
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="w-5 shrink-0 text-center font-mono text-xs text-slate-500">
              {b.rank <= 3 ? ['🥇', '🥈', '🥉'][b.rank - 1] : b.rank}
            </span>
            {b.avatar_emoji ? (
              <span className="text-base">{b.avatar_emoji}</span>
            ) : null}
            <span className={cn('truncate', b.is_you ? 'text-emerald-200' : 'text-slate-200')}>
              {b.display_name}
              {b.is_you && (
                <span className="ml-1 text-xs text-emerald-400">
                  {locale === 'es' ? '(tú)' : '(you)'}
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-emerald-300">
            {formatMoney(b.bid_amount, item.currency, locale)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BidForm({
  item,
  locale,
  anonymousParticipantId,
  onRequiresAlias,
  onBidPlaced,
}: {
  item: LiveAuctionItemWithBids
  locale: 'es' | 'en'
  anonymousParticipantId: string | null
  onRequiresAlias?: () => void
  onBidPlaced: () => void
}) {
  const minBid = (item.highest_bid ?? 0) + 1
  const [amount, setAmount] = useState(
    item.my_bid != null && item.my_bid >= minBid ? String(item.my_bid) : String(minBid)
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = useCallback(async () => {
    setErr(null)
    const parsed = parseFloat(amount.replace(/,/g, ''))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErr(locale === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount')
      return
    }

    setBusy(true)
    try {
      const res = await fetch('/api/live/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_item_id: item.id,
          bid_amount: parsed,
          anonymous_participant_id: anonymousParticipantId ?? undefined,
        }),
      })
      const json = (await res.json()) as { error?: string; min_bid?: number }
      if (res.status === 401) {
        onRequiresAlias?.()
        setErr(locale === 'es' ? 'Elige un alias para pujar' : 'Choose an alias to bid')
        return
      }
      if (!res.ok) {
        if (json.min_bid != null) setAmount(String(json.min_bid))
        throw new Error(json.error ?? 'Bid failed')
      }
      onBidPlaced()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }, [amount, item.id, anonymousParticipantId, locale, onRequiresAlias, onBidPlaced])

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs text-slate-400">
        {locale === 'es' ? 'Tu puja' : 'Your bid'}
        {item.highest_bid != null && (
          <span className="ml-1 text-slate-500">
            ({locale === 'es' ? 'mín.' : 'min'} {formatMoney(minBid, item.currency, locale)})
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={minBid}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-base text-white tabular-nums focus:border-emerald-500/50 focus:outline-none"
          aria-label={locale === 'es' ? 'Monto de puja' : 'Bid amount'}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Gavel className="h-4 w-4" />
          )}
          {locale === 'es' ? 'Pujar' : 'Bid'}
        </button>
      </div>
      {item.my_bid != null && (
        <p className="text-xs text-slate-500">
          {locale === 'es' ? 'Tu puja actual:' : 'Your current bid:'}{' '}
          <span className="font-medium text-emerald-400">
            {formatMoney(item.my_bid, item.currency, locale)}
          </span>
        </p>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
      <p className="text-[11px] leading-snug text-slate-600">
        {locale === 'es'
          ? 'Sin pago en la app. El ganador se confirma en el leaderboard; el cobro es fuera de plataforma.'
          : 'No in-app payment. Winner is shown on the leaderboard; payment is handled off-platform.'}
      </p>
    </div>
  )
}

function AuctionItemCard({
  item,
  locale,
  anonymousParticipantId,
  onRequiresAlias,
  onBidPlaced,
  highlight,
}: {
  item: LiveAuctionItemWithBids
  locale: 'es' | 'en'
  anonymousParticipantId: string | null
  onRequiresAlias?: () => void
  onBidPlaced: () => void
  highlight?: boolean
}) {
  const isOpen = item.status === 'bidding'

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-[#1a2029] shadow-lg shadow-black/20',
        highlight ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-white/10'
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="h-40 w-full object-cover sm:h-auto sm:w-36 sm:shrink-0"
          />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-slate-800/80 sm:h-auto sm:w-36">
            <Gavel className="h-8 w-8 text-slate-600" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-white">{item.title}</h3>
              {item.description && (
                <p className="mt-1 text-sm text-slate-400 line-clamp-2">{item.description}</p>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase',
                isOpen
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : item.status === 'sold'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-slate-700/80 text-slate-400'
              )}
            >
              {statusLabel(item.status, locale)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {item.highest_bid != null && (
              <span className="text-slate-300">
                {locale === 'es' ? 'Puja alta:' : 'High bid:'}{' '}
                <strong className="text-emerald-300">
                  {formatMoney(item.highest_bid, item.currency, locale)}
                </strong>
              </span>
            )}
            {item.winning_bid_amount != null && item.status === 'sold' && (
              <span className="text-amber-300">
                {locale === 'es' ? 'Ganadora:' : 'Winning:'}{' '}
                {formatMoney(Number(item.winning_bid_amount), item.currency, locale)}
              </span>
            )}
            <span className="text-slate-500">
              {item.bid_count} {locale === 'es' ? 'pujas' : 'bids'}
            </span>
          </div>

          {isOpen && (
            <BidForm
              item={item}
              locale={locale}
              anonymousParticipantId={anonymousParticipantId}
              onRequiresAlias={onRequiresAlias}
              onBidPlaced={onBidPlaced}
            />
          )}

          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Trophy className="h-3.5 w-3.5" />
              {locale === 'es' ? 'Top pujadores' : 'Top bidders'}
            </p>
            <ItemLeaderboard item={item} locale={locale} />
          </div>
        </div>
      </div>
    </article>
  )
}

export interface LiveAuctionPanelProps {
  eventId: string
  locale?: 'es' | 'en'
  currentUserId?: string | null
  anonymousParticipantId?: string | null
  onRequiresAlias?: () => void
}

export function LiveAuctionPanel({
  eventId,
  locale = 'es',
  currentUserId = null,
  anonymousParticipantId = null,
  onRequiresAlias,
}: LiveAuctionPanelProps) {
  const { items, activeItem, isLoading, error, refetch } = useLiveAuction(
    eventId,
    currentUserId,
    anonymousParticipantId
  )

  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      bidding: 0,
      upcoming: 1,
      sold: 2,
      ended: 3,
      cancelled: 4,
    }
    return [...items].sort(
      (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.sort_order - b.sort_order
    )
  }, [items])

  if (isLoading && items.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/10 bg-[#1a2029]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {error.message}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
        {locale === 'es'
          ? 'Las piezas de la subasta aparecerán aquí cuando el organizador las publique.'
          : 'Auction pieces will appear here when the organizer publishes them.'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">
          {locale === 'es' ? 'Subasta en vivo' : 'Live auction'}
        </h2>
        {activeItem && (
          <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            {locale === 'es' ? 'Puja abierta' : 'Bidding open'}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {sorted.map((item) => (
          <AuctionItemCard
            key={item.id}
            item={item}
            locale={locale}
            anonymousParticipantId={anonymousParticipantId}
            onRequiresAlias={onRequiresAlias}
            onBidPlaced={() => void refetch(true)}
            highlight={item.id === activeItem?.id}
          />
        ))}
      </div>
    </div>
  )
}
