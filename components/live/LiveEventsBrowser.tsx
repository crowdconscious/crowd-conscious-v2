'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Archive,
  Clapperboard,
  Eye,
  EyeOff,
  Gavel,
  Landmark,
  LayoutGrid,
  MapPin,
  Megaphone,
  Sparkles,
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
  /** Reveals per-card archive controls. */
  isAdmin?: boolean
  /** True when the parent fetched archived rows (admin `?showArchived=1`). */
  showArchived?: boolean
}

export function LiveEventsBrowser({
  locale,
  liveNow,
  upcoming,
  past,
  stats,
  isAdmin = false,
  showArchived = false,
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

      {isAdmin && (
        <AdminMaintenanceBar locale={locale} showArchived={showArchived} />
      )}

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

        {totalFiltered === 0 && active === 'auctions' && (
          <AuctionsComingSoon locale={locale} onClearFilter={() => setActive('all')} />
        )}

        {totalFiltered === 0 && active !== 'auctions' && (
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
                <LiveEventCard key={e.id} event={e} group="live" stats={stats[e.id]} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        )}

        {filtered.upcoming.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 text-base font-semibold text-teal-300">{t.upcoming}</h3>
            <div className="flex flex-col gap-4">
              {filtered.upcoming.map((e) => (
                <LiveEventCard key={e.id} event={e} group="upcoming" stats={stats[e.id]} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        )}

        {filtered.past.length > 0 && (
          <div>
            <h3 className="mb-4 text-base font-semibold text-slate-400">{t.past}</h3>
            <div className="flex flex-col gap-4">
              {filtered.past.map((e) => (
                <LiveEventCard key={e.id} event={e} group="past" stats={stats[e.id]} isAdmin={isAdmin} />
              ))}
            </div>
          </div>
        )}
      </section>

      <LiveB2BCTA locale={locale} variant="inline" />
    </>
  )
}

function AdminMaintenanceBar({
  locale,
  showArchived,
}: {
  locale: 'es' | 'en'
  showArchived: boolean
}) {
  const es = locale === 'es'
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [days, setDays] = useState(60)

  const t = {
    title: es ? 'Mantenimiento (admin)' : 'Maintenance (admin)',
    subtitle: es
      ? 'Estos controles solo son visibles para administradores.'
      : 'These controls are only visible to admins.',
    showArchived: es ? 'Mostrar archivados' : 'Show archived',
    hideArchived: es ? 'Ocultar archivados' : 'Hide archived',
    sweepLabel: es ? 'Archivar terminados/cancelados con más de' : 'Archive completed/cancelled older than',
    days: es ? 'días' : 'days',
    sweep: es ? 'Ejecutar' : 'Run',
    confirm: (n: number) =>
      es
        ? `¿Archivar todos los eventos terminados o cancelados con más de ${n} días? Se pueden restaurar individualmente.`
        : `Archive every completed/cancelled event older than ${n} days? Individual rows can be restored.`,
    done: (n: number) =>
      es ? `Listo. ${n} evento(s) archivado(s).` : `Done. Archived ${n} event(s).`,
    nothing: es ? 'No había nada que archivar.' : 'Nothing to archive.',
  }

  async function runSweep() {
    if (busy) return
    if (!window.confirm(t.confirm(days))) return
    setBusy(true)
    try {
      const res = await fetch('/api/predictions/admin/archive-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'live_event_completed', days }),
      })
      const json = (await res.json()) as { count?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Sweep failed')
      window.alert((json.count ?? 0) > 0 ? t.done(json.count ?? 0) : t.nothing)
      router.refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Sweep failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleHref = showArchived ? '/live' : '/live?showArchived=1'

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
        <Archive className="h-4 w-4" aria-hidden />
        {t.title}
      </span>
      <span className="hidden text-xs text-slate-400 sm:inline">{t.subtitle}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Link
          href={toggleHref}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/10 bg-[#1a2029] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-amber-400/40 hover:text-amber-200"
        >
          {showArchived ? (
            <>
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              {t.hideArchived}
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {t.showArchived}
            </>
          )}
        </Link>
        <span className="text-xs text-slate-400">{t.sweepLabel}</span>
        <input
          type="number"
          min={0}
          max={3650}
          step={1}
          value={days}
          onChange={(e) => setDays(Math.max(0, Math.min(3650, Number(e.target.value) || 0)))}
          className="h-9 w-16 rounded-md border border-white/10 bg-[#1a2029] px-2 text-center text-sm text-white focus:border-amber-400/40 focus:outline-none"
        />
        <span className="text-xs text-slate-400">{t.days}</span>
        <button
          type="button"
          onClick={runSweep}
          disabled={busy}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          {busy ? '…' : t.sweep}
        </button>
      </div>
    </div>
  )
}

function AuctionsComingSoon({
  locale,
  onClearFilter,
}: {
  locale: 'es' | 'en'
  onClearFilter: () => void
}) {
  const es = locale === 'es'
  const t = {
    badge: es ? 'Próximamente' : 'Coming soon',
    heading: es ? 'Subastas Conscientes en vivo' : 'Conscious live auctions',
    body: es
      ? 'Lugares Conscientes pondrán productos a subasta y la comunidad votará el descuento (20%, 30% o 50%). Mezcal, arte, gastronomía, moda, experiencias únicas — el público decide qué se descuenta.'
      : 'Conscious Locations will auction products and the community will vote on the discount (20%, 30%, or 50%). Mezcal, art, food, fashion, unique experiences — the audience decides what gets the discount.',
    bullets: [
      {
        Icon: Gavel,
        title: es ? 'Subasta inversa' : 'Reverse auction',
        text: es
          ? 'Tres niveles de descuento, la comunidad vota cuál se aplica.'
          : 'Three discount tiers, the community votes which one applies.',
      },
      {
        Icon: MapPin,
        title: es ? 'Lugares Conscientes' : 'Conscious Locations',
        text: es
          ? 'Cada producto está conectado a un lugar certificado.'
          : 'Each item is tied to a certified Conscious Location.',
      },
      {
        Icon: Sparkles,
        title: es ? 'Reclama tu descuento' : 'Claim your discount',
        text: es
          ? 'Código de canje al cerrar la subasta. Cupos limitados.'
          : 'Redemption code when the auction closes. Limited spots.',
      },
    ],
    locationsCta: es ? 'Ver Lugares Conscientes' : 'See Conscious Locations',
    pulseCta: es ? 'Quiero subastar mi marca' : 'I want to auction my brand',
    clear: es ? 'Volver a todos los eventos' : 'Back to all events',
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#1a2029] to-[#1a2029] shadow-lg shadow-emerald-900/10">
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <Gavel className="h-7 w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t.badge}
            </span>
            <h3 className="mt-3 text-xl font-bold text-white sm:text-2xl">{t.heading}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{t.body}</p>
          </div>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {t.bullets.map(({ Icon, title, text }) => (
            <li
              key={title}
              className="rounded-xl border border-emerald-500/15 bg-[#0f1419]/60 p-4"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="mt-2 text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/locations"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            {t.locationsCta}
          </Link>
          <Link
            href="/pulse"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
          >
            {t.pulseCta}
          </Link>
          <button
            type="button"
            onClick={onClearFilter}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 transition hover:text-slate-200"
          >
            {t.clear}
          </button>
        </div>
      </div>
    </div>
  )
}
