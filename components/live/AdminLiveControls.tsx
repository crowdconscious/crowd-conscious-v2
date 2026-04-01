'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronUp, Shield, Loader2 } from 'lucide-react'
import type { Database } from '@/types/database'
import type { MarketWithOutcomes } from '@/hooks/useLiveMarkets'
import { LogoUpload } from '@/components/ui/LogoUpload'
type LiveEventRow = Database['public']['Tables']['live_events']['Row']

type DurationChoice = '5' | '10' | '15' | 'halftime' | 'fulltime'

type TemplateId =
  | 'goal_30'
  | 'red_card'
  | 'next_goal'
  | 'ht_score'
  | 'custom'

const TEMPLATES: {
  id: TemplateId
  label: string
  title: string
  outcomes: string[]
  binaryEn?: boolean
}[] = [
  {
    id: 'goal_30',
    label: '¿Gol antes del minuto 30?',
    title: '¿Gol antes del minuto 30?',
    outcomes: ['Sí', 'No'],
  },
  {
    id: 'red_card',
    label: '¿Tarjeta roja en este tiempo?',
    title: '¿Tarjeta roja en este tiempo?',
    outcomes: ['Sí', 'No'],
  },
  {
    id: 'next_goal',
    label: '¿Quién anota el siguiente gol?',
    title: '¿Quién anota el siguiente gol?',
    outcomes: ['Equipo A', 'Equipo B', 'Ninguno'],
  },
  {
    id: 'ht_score',
    label: 'Marcador al medio tiempo',
    title: 'Marcador al medio tiempo',
    outcomes: ['0-0', '1-0', '0-1', '2-0', '0-2', '1-1', '2-1', '1-2', '3+'],
  },
]

function timeLeftLabel(resolutionDate: string): string {
  const ms = new Date(resolutionDate).getTime() - Date.now()
  if (ms <= 0) return '0:00'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export interface AdminLiveControlsProps {
  eventId: string
  event: LiveEventRow
  activeMarkets: MarketWithOutcomes[]
  resolvedMarkets: MarketWithOutcomes[]
  viewerCount: number
  onUpdated?: () => void
  locale?: 'en' | 'es'
}

export function AdminLiveControls({
  eventId,
  event,
  activeMarkets,
  resolvedMarkets,
  viewerCount,
  onUpdated,
  locale = 'es',
}: AdminLiveControlsProps) {
  const [minimized, setMinimized] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<TemplateId>('goal_30')
  const [customTitle, setCustomTitle] = useState('')
  const [customOutcomes, setCustomOutcomes] = useState('Sí, No')
  const [nextGoalPlayers, setNextGoalPlayers] = useState('Equipo A, Equipo B, Ninguno')
  const [duration, setDuration] = useState<DurationChoice>('10')
  const [sponsorLabel, setSponsorLabel] = useState('')
  const [resolvePick, setResolvePick] = useState<Record<string, string>>({})
  const [, setTick] = useState(0)
  const [coverImageUrl, setCoverImageUrl] = useState(event.cover_image_url ?? '')
  const [teamAName, setTeamAName] = useState(event.team_a_name ?? '')
  const [teamAFlag, setTeamAFlag] = useState(event.team_a_flag ?? '')
  const [teamBName, setTeamBName] = useState(event.team_b_name ?? '')
  const [teamBFlag, setTeamBFlag] = useState(event.team_b_flag ?? '')

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setCoverImageUrl(event.cover_image_url ?? '')
    setTeamAName(event.team_a_name ?? '')
    setTeamAFlag(event.team_a_flag ?? '')
    setTeamBName(event.team_b_name ?? '')
    setTeamBFlag(event.team_b_flag ?? '')
  }, [
    event.id,
    event.cover_image_url,
    event.team_a_name,
    event.team_a_flag,
    event.team_b_name,
    event.team_b_flag,
  ])

  const t = useMemo(
    () => ({
      panel: locale === 'es' ? 'Control en vivo' : 'Live control',
      event: locale === 'es' ? 'Evento' : 'Event',
      goLive: locale === 'es' ? 'Ir en vivo' : 'Go live',
      endEvent: locale === 'es' ? 'Finalizar evento' : 'End event',
      schedule: locale === 'es' ? 'Programado' : 'Scheduled',
      create: locale === 'es' ? 'Crear' : 'Create',
      resolve: locale === 'es' ? 'Resolver' : 'Resolve',
      sponsor: locale === 'es' ? 'Patrocinador (opc.)' : 'Sponsor (opt.)',
      duration: locale === 'es' ? 'Duración' : 'Duration',
      template: locale === 'es' ? 'Plantilla' : 'Template',
      custom: locale === 'es' ? 'Personalizado' : 'Custom',
      title: locale === 'es' ? 'Título' : 'Title',
      outcomes: locale === 'es' ? 'Resultados (coma)' : 'Outcomes (comma)',
      playersHint: locale === 'es' ? 'Nombres separados por coma' : 'Comma-separated names',
      stats: locale === 'es' ? 'Estadísticas' : 'Stats',
      viewers: locale === 'es' ? 'Espectadores' : 'Viewers',
      votes: locale === 'es' ? 'Votos (evento)' : 'Event votes',
      markets: locale === 'es' ? 'Mercados creados / resueltos' : 'Markets created / resolved',
      active: locale === 'es' ? 'Activos' : 'Active',
      branding: locale === 'es' ? 'Marca del evento' : 'Event branding',
      coverUrl: locale === 'es' ? 'Imagen de portada' : 'Cover image',
      saveBranding: locale === 'es' ? 'Guardar marca' : 'Save branding',
      teamA: locale === 'es' ? 'Equipo A' : 'Team A',
      teamB: locale === 'es' ? 'Equipo B' : 'Team B',
      flagHint: locale === 'es' ? 'Emoji o URL de imagen' : 'Emoji or image URL',
    }),
    [locale]
  )

  const patchEvent = useCallback(
    async (payload: Record<string, unknown>, busyKey: string = 'event') => {
      setBusy(busyKey)
      try {
        const res = await fetch(`/api/live/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Update failed')
        onUpdated?.()
      } finally {
        setBusy(null)
      }
    },
    [eventId, onUpdated]
  )

  const createMarket = useCallback(async () => {
    let title = ''
    let outcomes: string[] = []

    if (templateId === 'custom') {
      title = customTitle.trim()
      outcomes = customOutcomes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    } else if (templateId === 'next_goal') {
      const tpl = TEMPLATES.find((x) => x.id === 'next_goal')!
      title = tpl.title
      outcomes = nextGoalPlayers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (outcomes.length < 2) {
        alert(locale === 'es' ? 'Añade al menos 2 opciones' : 'Add at least 2 options')
        return
      }
    } else {
      const tpl = TEMPLATES.find((x) => x.id === templateId)!
      title = tpl.title
      outcomes = tpl.outcomes
    }

    if (!title || outcomes.length < 2) {
      alert(locale === 'es' ? 'Título y resultados inválidos' : 'Invalid title or outcomes')
      return
    }

    const body: Record<string, unknown> = {
      live_event_id: eventId,
      title,
      outcomes,
      sponsor_label: sponsorLabel.trim() || undefined,
    }

    if (duration === '5') body.expires_in_minutes = 5
    else if (duration === '10') body.expires_in_minutes = 10
    else if (duration === '15') body.expires_in_minutes = 15
    else if (duration === 'halftime') body.duration_preset = 'halftime'
    else if (duration === 'fulltime') body.duration_preset = 'fulltime'

    setBusy('create')
    try {
      const res = await fetch('/api/live/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Create failed')
      onUpdated?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }, [
    templateId,
    customTitle,
    customOutcomes,
    nextGoalPlayers,
    duration,
    sponsorLabel,
    eventId,
    onUpdated,
    locale,
  ])

  const resolveMarket = useCallback(
    async (marketId: string) => {
      const winning = resolvePick[marketId]
      if (!winning) {
        alert(locale === 'es' ? 'Elige resultado ganador' : 'Pick winning outcome')
        return
      }
      setBusy(`resolve-${marketId}`)
      try {
        const res = await fetch('/api/live/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market_id: marketId, winning_outcome_id: winning }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Resolve failed')
        onUpdated?.()
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Error')
      } finally {
        setBusy(null)
      }
    },
    [resolvePick, onUpdated, locale]
  )

  const marketsCreated = activeMarkets.length + resolvedMarkets.length
  const marketsResolved = resolvedMarkets.length

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-teal-500/40 bg-slate-950/95 text-teal-300 shadow-xl shadow-black/50 backdrop-blur md:bottom-4"
        title={t.panel}
      >
        <Shield className="h-5 w-5" />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed z-50 flex flex-col overflow-hidden border border-white/15 bg-slate-950/95 shadow-2xl shadow-black/60 backdrop-blur-md max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[min(88dvh,720px)] max-md:w-full max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 md:bottom-4 md:right-4 md:max-h-[min(80vh,640px)] md:w-[min(100vw-2rem,420px)] md:rounded-2xl"
    >
        <button
          type="button"
          onClick={() => setMinimized(true)}
          className="flex min-h-[44px] shrink-0 items-center justify-between border-b border-white/10 px-3 py-2 text-left text-sm font-semibold text-white"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-400" />
            {t.panel}
          </span>
          <ChevronUp className="h-4 w-4 text-slate-400" />
        </button>

        <div className="max-md:pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4 overflow-y-auto px-3 py-3 text-sm text-slate-200">
          <section>
            <h3 className="mb-2 font-semibold text-teal-300">{t.event}</h3>
            <div className="flex flex-wrap gap-2">
              {event.status === 'scheduled' && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => patchEvent({ status: 'live' })}
                  className="min-h-[44px] rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {busy === 'event' ? <Loader2 className="h-3 w-3 animate-spin" /> : t.goLive}
                </button>
              )}
              {(event.status === 'live' || event.status === 'scheduled') && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    if (confirm(locale === 'es' ? '¿Finalizar evento?' : 'End this event?')) {
                      void patchEvent({ status: 'completed' })
                    }
                  }}
                  className="min-h-[44px] rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-50"
                >
                  {t.endEvent}
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {t.schedule}: <span className="text-slate-300">{event.status}</span>
            </p>
          </section>

          <section className="border-t border-white/10 pt-3">
            <h3 className="mb-2 font-semibold text-teal-300">{t.branding}</h3>
            <div className="mb-2">
              <span className="mb-1 block text-sm text-slate-400">{t.coverUrl}</span>
              <LogoUpload
                currentLogoUrl={coverImageUrl.trim() || null}
                onUpload={(url) => setCoverImageUrl(url)}
                label={locale === 'es' ? 'Sube imagen de portada' : 'Upload cover image'}
                hint={locale === 'es' ? 'PNG, JPG, WebP · máx. 2MB' : 'PNG, JPG, WebP · max 2MB'}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400">
                  {t.teamA} · {t.flagHint}
                </span>
                <input
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  placeholder={locale === 'es' ? 'Nombre' : 'Name'}
                />
                <input
                  value={teamAFlag}
                  onChange={(e) => setTeamAFlag(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  placeholder="🇲🇽"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">
                  {t.teamB} · {t.flagHint}
                </span>
                <input
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  placeholder={locale === 'es' ? 'Nombre' : 'Name'}
                />
                <input
                  value={teamBFlag}
                  onChange={(e) => setTeamBFlag(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  placeholder="🇩🇪"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                patchEvent(
                  {
                    cover_image_url: coverImageUrl.trim() || null,
                    team_a_name: teamAName.trim() || null,
                    team_a_flag: teamAFlag.trim() || null,
                    team_b_name: teamBName.trim() || null,
                    team_b_flag: teamBFlag.trim() || null,
                  },
                  'branding'
                )
              }
              className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-teal-500/40 bg-teal-950/40 px-4 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-900/40 disabled:opacity-50"
            >
              {busy === 'branding' ? <Loader2 className="h-4 w-4 animate-spin" /> : t.saveBranding}
            </button>
          </section>

          <section className="border-t border-white/10 pt-3">
            <h3 className="mb-2 font-semibold text-teal-300">{t.template}</h3>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as TemplateId)}
              className="mb-2 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-slate-100"
            >
              {TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.label}
                </option>
              ))}
              <option value="custom">{t.custom}</option>
            </select>

            {templateId === 'next_goal' && (
              <label className="mb-2 block">
                <span className="text-sm text-slate-400">{t.playersHint}</span>
                <input
                  value={nextGoalPlayers}
                  onChange={(e) => setNextGoalPlayers(e.target.value)}
                  className="mt-1 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                />
              </label>
            )}

            {templateId === 'custom' && (
              <>
                <label className="mb-1 block">
                  {t.title}
                  <input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  {t.outcomes}
                  <input
                    value={customOutcomes}
                    onChange={(e) => setCustomOutcomes(e.target.value)}
                    className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
                  />
                </label>
              </>
            )}

            <label className="mt-2 block">
              {t.duration}
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as DurationChoice)}
                className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
              >
                <option value="5">5 min</option>
                <option value="10">10 min</option>
                <option value="15">15 min</option>
                <option value="halftime">{locale === 'es' ? 'Hasta medio tiempo' : 'Until halftime'}</option>
                <option value="fulltime">{locale === 'es' ? 'Hasta el final' : 'Until full time'}</option>
              </select>
            </label>

            <label className="mt-2 block">
              {t.sponsor}
              <input
                value={sponsorLabel}
                onChange={(e) => setSponsorLabel(e.target.value)}
                className="mt-0.5 min-h-[44px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm"
              />
            </label>

            <button
              type="button"
              disabled={busy !== null}
              onClick={createMarket}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {busy === 'create' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t.create}
            </button>
          </section>

          <section className="border-t border-white/10 pt-3">
            <h3 className="mb-2 font-semibold text-teal-300">{t.active}</h3>
            {activeMarkets.length === 0 && <p className="text-slate-500">{locale === 'es' ? 'Ninguno' : 'None'}</p>}
            <ul className="space-y-2">
              {activeMarkets.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/10 bg-black/30 p-2">
                  <p className="font-medium text-slate-100 line-clamp-2">{m.title}</p>
                  <p className="text-sm text-slate-400">
                    ⏱ {timeLeftLabel(m.resolution_date)} · {locale === 'es' ? 'Votos' : 'Votes'}:{' '}
                    {m.total_votes ?? m.engagement_count ?? 0}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <select
                      value={resolvePick[m.id] ?? ''}
                      onChange={(e) =>
                        setResolvePick((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="max-w-[200px] min-h-[44px] flex-1 rounded border border-white/10 bg-black/50 px-2 py-1 text-sm"
                    >
                      <option value="">{locale === 'es' ? 'Ganador…' : 'Winner…'}</option>
                      {m.outcomes.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => resolveMarket(m.id)}
                      className="min-h-[44px] rounded bg-amber-600/90 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {t.resolve}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-white/10 pt-3">
            <h3 className="mb-1 font-semibold text-teal-300">{t.stats}</h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>
                {t.viewers}: <span className="text-slate-200">{viewerCount}</span>
              </li>
              <li>
                {t.votes}: <span className="text-slate-200">{event.total_votes_cast}</span>
              </li>
              <li>
                {t.markets}:{' '}
                <span className="text-slate-200">
                  {marketsCreated} / {marketsResolved}
                </span>
              </li>
            </ul>
          </section>
        </div>
    </motion.div>
  )
}
