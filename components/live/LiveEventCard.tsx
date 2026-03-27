'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Database } from '@/types/database'
import { getLiveEventTitle } from '@/lib/live-event-title'
import { useLocale } from '@/lib/i18n/useLocale'
import { cn } from '@/lib/design-system'

type LiveEventRow = Database['public']['Tables']['live_events']['Row']

export type LiveEventCardGroup = 'live' | 'upcoming' | 'past'

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n)
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function statusBadge(
  status: LiveEventRow['status'],
  locale: string
): { label: string; className: string } {
  switch (status) {
    case 'live':
      return {
        label: locale === 'es' ? 'En vivo' : 'Live',
        className: 'bg-red-600/90 text-white border-red-500/50',
      }
    case 'scheduled':
      return {
        label: locale === 'es' ? 'Programado' : 'Scheduled',
        className: 'bg-slate-700/90 text-slate-200 border-white/10',
      }
    case 'completed':
      return {
        label: locale === 'es' ? 'Finalizado' : 'Completed',
        className: 'bg-teal-900/60 text-teal-100 border-teal-600/30',
      }
    case 'cancelled':
      return {
        label: locale === 'es' ? 'Cancelado' : 'Cancelled',
        className: 'bg-slate-800 text-slate-400 border-white/10',
      }
    default:
      return { label: status, className: 'bg-slate-800 text-slate-300' }
  }
}

export function LiveEventCard({
  event,
  group,
}: {
  event: LiveEventRow
  group: LiveEventCardGroup
}) {
  const locale = useLocale()
  const title = getLiveEventTitle(event, locale)
  const [now, setNow] = useState(() => Date.now())
  const target = useMemo(() => new Date(event.match_date).getTime(), [event.match_date])

  useEffect(() => {
    if (group !== 'upcoming') return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [group])

  const remaining = Math.max(0, target - now)
  const badge = statusBadge(event.status, locale)
  const isLive = group === 'live'

  const dateStr = new Date(event.match_date).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Link
      href={`/live/${event.id}`}
      className={cn(
        'group block rounded-2xl border p-4 transition-all hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-900/20',
        isLive
          ? 'border-red-500/40 bg-gradient-to-br from-red-950/40 to-slate-950 ring-1 ring-red-500/30'
          : 'border-white/10 bg-slate-950/80'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-white group-hover:text-teal-200">{title}</h3>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
            badge.className,
            isLive && 'animate-pulse'
          )}
        >
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
          )}
          {badge.label}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-400">{dateStr}</p>

      {group === 'live' && (
        <p className="mt-3 text-sm font-medium text-teal-300/95">
          {locale === 'es' ? 'Espectadores' : 'Viewers'}:{' '}
          <span className="tabular-nums text-white">{event.viewer_count.toLocaleString()}</span>
        </p>
      )}

      {group === 'upcoming' && event.status === 'scheduled' && (
        <p className="mt-3 font-mono text-sm text-teal-400/95">
          {locale === 'es' ? 'Comienza en' : 'Starts in'}{' '}
          <span className="font-semibold text-teal-200">{formatCountdown(remaining)}</span>
        </p>
      )}
    </Link>
  )
}
