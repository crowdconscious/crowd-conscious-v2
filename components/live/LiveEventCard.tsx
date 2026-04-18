'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ListChecks, Tv2, Users } from 'lucide-react'
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

export interface LiveEventCardStats {
  /** Total prediction markets created for this event. */
  markets?: number
  /** Resolved markets — useful as the "predicciones resueltas" headline stat. */
  resolved?: number
}

export function LiveEventCard({
  event,
  group,
  stats,
}: {
  event: LiveEventRow
  group: LiveEventCardGroup
  stats?: LiveEventCardStats
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
  const isLive = group === 'live'

  const dateStr = new Date(event.match_date).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const cover = event.cover_image_url?.trim()
  const flagA = event.team_a_flag?.trim() || null
  const flagB = event.team_b_flag?.trim() || null

  function renderFlag(value: string | null) {
    if (!value) {
      return (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
          <Tv2 className="h-5 w-5" aria-hidden />
        </span>
      )
    }
    if (value.startsWith('http://') || value.startsWith('https://')) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={value} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
    }
    return <span className="text-3xl leading-none">{value}</span>
  }

  const pillClass =
    event.status === 'completed'
      ? 'bg-gray-700/50 text-gray-400'
      : event.status === 'live'
        ? 'bg-red-500/20 text-red-400 animate-pulse'
        : 'bg-emerald-500/20 text-emerald-400'

  const pillLabel =
    event.status === 'completed'
      ? locale === 'es'
        ? 'Finalizado'
        : 'Completed'
      : event.status === 'live'
        ? locale === 'es'
          ? '● En Vivo'
          : '● Live'
        : locale === 'es'
          ? 'Próximamente'
          : 'Upcoming'

  return (
    <Link
      href={`/live/${event.id}`}
      className={cn(
        'group block overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-teal-500/40',
        isLive && 'border-red-500/30 ring-1 ring-red-500/20'
      )}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-40 w-full object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center gap-4 bg-gradient-to-br from-emerald-900/20 to-[#1a2029]">
          {renderFlag(flagA)}
          <span className="text-lg text-gray-600">vs</span>
          {renderFlag(flagB)}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white group-hover:text-teal-200">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{dateStr}</p>
          {group === 'live' && (
            <p className="mt-2 text-sm font-medium text-teal-300/95">
              {locale === 'es' ? 'Espectadores' : 'Viewers'}:{' '}
              <span className="tabular-nums text-white">{event.viewer_count.toLocaleString()}</span>
            </p>
          )}
          {group === 'upcoming' && event.status === 'scheduled' && (
            <p className="mt-2 font-mono text-sm text-teal-400/95">
              {locale === 'es' ? 'Comienza en' : 'Starts in'}{' '}
              <span className="font-semibold text-teal-200">{formatCountdown(remaining)}</span>
            </p>
          )}
          {group === 'past' && (
            <PastStatsRow event={event} stats={stats} locale={locale} />
          )}
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', pillClass)}>
          {pillLabel}
        </span>
      </div>
    </Link>
  )
}

function PastStatsRow({
  event,
  stats,
  locale,
}: {
  event: LiveEventRow
  stats?: LiveEventCardStats
  locale: string
}) {
  const es = locale === 'es'
  const votes = Number(event.total_votes_cast ?? 0)
  const viewers = Number(event.viewer_count ?? 0)
  const markets = stats?.markets ?? 0
  const resolved = stats?.resolved ?? 0

  if (votes === 0 && viewers === 0 && markets === 0) return null

  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
      {votes > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{votes.toLocaleString()}</span>
          <span>{es ? 'votos' : 'votes'}</span>
        </li>
      )}
      {markets > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{resolved > 0 ? resolved : markets}</span>
          <span>
            {resolved > 0
              ? es
                ? 'predicciones resueltas'
                : 'predictions resolved'
              : es
                ? 'predicciones'
                : 'predictions'}
          </span>
        </li>
      )}
      {viewers > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{viewers.toLocaleString()}</span>
          <span>{es ? 'espectadores' : 'viewers'}</span>
        </li>
      )}
    </ul>
  )
}
