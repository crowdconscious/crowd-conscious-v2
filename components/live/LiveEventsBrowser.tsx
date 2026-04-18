'use client'

import { useMemo, useState } from 'react'
import {
  Clapperboard,
  Gavel,
  Landmark,
  LayoutGrid,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { LiveEventCard, type LiveEventCardStats } from './LiveEventCard'
import { LiveB2BCTA } from './LiveProductSections'
import { cn } from '@/lib/design-system'

type LiveEventRow = Database['public']['Tables']['live_events']['Row']

type CategoryId =
  | 'all'
  | 'soccer'
  | 'launches'
  | 'conferences'
  | 'entertainment'
  | 'auctions'

type Category = {
  id: CategoryId
  Icon: LucideIcon | ((p: { className?: string }) => React.ReactElement)
  title: { es: string; en: string }
  desc: { es: string; en: string }
  /** event_type values that belong to this category. `null` means "all". */
  eventTypes: readonly string[] | null
}

function SoccerBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10l4-3z" />
      <path d="M12 2v5" />
      <path d="M22 12l-6-2" />
      <path d="M12 22l2.5-4.5" />
      <path d="M2 12l6-2" />
      <path d="M12 22l-2.5-4.5" />
    </svg>
  )
}

const CATEGORIES: readonly Category[] = [
  {
    id: 'all',
    Icon: LayoutGrid,
    title: { es: 'Todos', en: 'All' },
    desc: {
      es: 'Todos los eventos en vivo programados, en curso y pasados.',
      en: 'Every live event — scheduled, in progress, and past.',
    },
    eventTypes: null,
  },
  {
    id: 'soccer',
    Icon: SoccerBallIcon,
    title: { es: 'Partidos de fútbol', en: 'Soccer matches' },
    desc: {
      es: 'Micro-predicciones durante cada partido. ¿Quién anota? ¿Gol antes del minuto 30?',
      en: 'Micro-predictions during each match. Who scores? Goal before minute 30?',
    },
    eventTypes: ['soccer_match'],
  },
  {
    id: 'launches',
    Icon: Megaphone,
    title: { es: 'Lanzamientos de marca', en: 'Brand launches' },
    desc: {
      es: 'Tu audiencia vota durante tu livestream. ¿Qué producto prefieren? Datos en tiempo real.',
      en: 'Your audience votes during your livestream. Which product do they prefer? Real-time data.',
    },
    eventTypes: ['product_launch'],
  },
  {
    id: 'conferences',
    Icon: Landmark,
    title: { es: 'Conferencias y debates', en: 'Conferences & debates' },
    desc: {
      es: 'Consulta ciudadana en vivo. Proyecta resultados en pantalla.',
      en: 'Live citizen consultation. Project results on screen.',
    },
    eventTypes: ['government_conference', 'community_event'],
  },
  {
    id: 'entertainment',
    Icon: Clapperboard,
    title: { es: 'Entretenimiento', en: 'Entertainment' },
    desc: {
      es: 'Estrenos, premios, conciertos. ¿Quién gana? La comunidad predice.',
      en: 'Premieres, awards, concerts. Who wins? The community predicts.',
    },
    eventTypes: ['entertainment'],
  },
  {
    id: 'auctions',
    Icon: Gavel,
    title: { es: 'Subastas en vivo', en: 'Live auctions' },
    desc: {
      es: 'Lugares Conscientes subastan productos exclusivos. La comunidad vota qué se descuenta.',
      en: 'Conscious Locations auction exclusive products. The community votes on discounts.',
    },
    eventTypes: ['live_auction'],
  },
] as const

function matchesCategory(event: LiveEventRow, cat: Category): boolean {
  if (!cat.eventTypes) return true
  return cat.eventTypes.includes(event.event_type)
}

export interface LiveEventsBrowserProps {
  locale: 'es' | 'en'
  liveNow: LiveEventRow[]
  upcoming: LiveEventRow[]
  past: LiveEventRow[]
  stats: Record<string, LiveEventCardStats>
}

export function LiveEventsBrowser({
  locale,
  liveNow,
  upcoming,
  past,
  stats,
}: LiveEventsBrowserProps) {
  const [active, setActive] = useState<CategoryId>('all')
  const es = locale === 'es'
  const L = (o: { es: string; en: string }) => (es ? o.es : o.en)

  const allEvents = useMemo(
    () => [...liveNow, ...upcoming, ...past],
    [liveNow, upcoming, past]
  )

  const countsByCategory = useMemo(() => {
    const out: Record<CategoryId, number> = {
      all: allEvents.length,
      soccer: 0,
      launches: 0,
      conferences: 0,
      entertainment: 0,
      auctions: 0,
    }
    for (const cat of CATEGORIES) {
      if (cat.id === 'all') continue
      out[cat.id] = allEvents.filter((e) => matchesCategory(e, cat)).length
    }
    return out
  }, [allEvents])

  const activeCat = CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0]

  const filtered = useMemo(() => {
    const filterList = (list: LiveEventRow[]) =>
      activeCat.eventTypes ? list.filter((e) => matchesCategory(e, activeCat)) : list
    return {
      live: filterList(liveNow),
      upcoming: filterList(upcoming),
      past: filterList(past),
    }
  }, [activeCat, liveNow, upcoming, past])

  const totalFiltered = filtered.live.length + filtered.upcoming.length + filtered.past.length

  const t = {
    eventsHeading: es ? 'Eventos' : 'Events',
    live: es ? 'En vivo ahora' : 'Live now',
    upcoming: es ? 'Próximos eventos' : 'Upcoming',
    past: es ? 'Eventos anteriores' : 'Past events',
    eventsSuffix: es ? 'eventos' : 'events',
    eventSuffix: es ? 'evento' : 'event',
    emptyCategory: es
      ? 'Aún no hay eventos en esta categoría.'
      : 'No events in this category yet.',
    emptyCta: es ? 'Ver todos los eventos' : 'See all events',
  }

  const eventCountLabel = (n: number) =>
    `${n.toLocaleString()} ${n === 1 ? t.eventSuffix : t.eventsSuffix}`

  return (
    <>
      <section className="px-1 pb-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.Icon
            const isActive = active === cat.id
            const count = countsByCategory[cat.id] ?? 0
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActive(cat.id)}
                aria-pressed={isActive}
                className={cn(
                  'group relative flex flex-col gap-2 rounded-xl border p-5 text-left transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50',
                  isActive
                    ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
                    : 'border-[#2d3748] bg-[#1a2029] hover:border-emerald-500/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-white/5 text-slate-400'
                    )}
                  >
                    {count}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{L(cat.title)}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{L(cat.desc)}</p>
                <p
                  className={cn(
                    'mt-1 text-xs font-medium uppercase tracking-wide',
                    isActive ? 'text-emerald-300' : 'text-slate-500'
                  )}
                >
                  {eventCountLabel(count)}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-4">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            {t.eventsHeading}
            {active !== 'all' && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                · {L(activeCat.title)}
              </span>
            )}
          </h2>
          {active !== 'all' && (
            <button
              type="button"
              onClick={() => setActive('all')}
              className="text-xs font-medium uppercase tracking-wider text-emerald-400 transition hover:text-emerald-300"
            >
              {es ? 'Limpiar filtro' : 'Clear filter'}
            </button>
          )}
        </div>

        {totalFiltered === 0 && (
          <div className="rounded-xl border border-dashed border-[#2d3748] bg-[#1a2029]/40 px-6 py-10 text-center">
            <p className="text-sm text-slate-400">{t.emptyCategory}</p>
            {active !== 'all' && (
              <button
                type="button"
                onClick={() => setActive('all')}
                className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/15"
              >
                {t.emptyCta}
              </button>
            )}
          </div>
        )}

        {filtered.live.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {t.live}
            </h3>
            <div className="flex flex-col gap-4">
              {filtered.live.map((e) => (
                <LiveEventCard key={e.id} event={e} group="live" stats={stats[e.id]} />
              ))}
            </div>
          </div>
        )}

        {filtered.upcoming.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 text-base font-semibold text-teal-300">{t.upcoming}</h3>
            <div className="flex flex-col gap-4">
              {filtered.upcoming.map((e) => (
                <LiveEventCard key={e.id} event={e} group="upcoming" stats={stats[e.id]} />
              ))}
            </div>
          </div>
        )}

        {filtered.past.length > 0 && (
          <div>
            <h3 className="mb-4 text-base font-semibold text-slate-400">{t.past}</h3>
            <div className="flex flex-col gap-4">
              {filtered.past.map((e) => (
                <LiveEventCard key={e.id} event={e} group="past" stats={stats[e.id]} />
              ))}
            </div>
          </div>
        )}
      </section>

      <LiveB2BCTA locale={locale} variant="inline" />
    </>
  )
}
