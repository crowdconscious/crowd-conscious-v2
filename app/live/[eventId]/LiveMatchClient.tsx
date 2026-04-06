'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, ChevronDown, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { getLiveEventTitle } from '@/lib/live-event-title'
import { getEventTypeLabel } from '@/lib/live-event-copy'
import { getMarketText } from '@/lib/i18n/market-translations'
import { useLocale } from '@/lib/i18n/useLocale'
import { toDisplayPercentRounded } from '@/lib/probability-utils'
import { cn } from '@/lib/design-system'
import { useLiveEvent } from '@/hooks/useLiveEvent'
import { useLiveMarkets } from '@/hooks/useLiveMarkets'
import { useLiveLeaderboard } from '@/hooks/useLiveLeaderboard'
import { usePresence } from '@/hooks/usePresence'
import { StreamEmbed } from '@/components/live/StreamEmbed'
import { FundImpactTicker } from '@/components/live/FundImpactTicker'
import { LiveVotingPanel } from '@/components/live/LiveVotingPanel'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { ViewerCount } from '@/components/live/ViewerCount'
import { AdminLiveControls } from '@/components/live/AdminLiveControls'
import { LiveConnectionBanner } from '@/components/live/LiveConnectionBanner'
import { AliasEntry, type AliasParticipantJoined } from '@/components/live/AliasEntry'
import { LiveComments } from '@/components/live/LiveComments'

export function LiveMatchClient({ eventId }: { eventId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const locale = useLocale()
  const [user, setUser] = useState<User | null>(null)
  const [lbOpen, setLbOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [leadingCauseName, setLeadingCauseName] = useState<string | null>(null)
  const [gateReady, setGateReady] = useState(false)
  const [aliasParticipant, setAliasParticipant] = useState<AliasParticipantJoined | null>(null)
  const [showAliasModal, setShowAliasModal] = useState(false)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false)
      return
    }
    void supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(data?.user_type === 'admin'))
  }, [user?.id, supabase])

  useEffect(() => {
    void fetch('/api/live/fund-context', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ leadingCause?: { name?: string } | null }>)
      .then((d) => {
        if (d.leadingCause?.name) setLeadingCauseName(d.leadingCause.name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    async function gate() {
      const { data: auth } = await supabase.auth.getUser()
      if (cancelled) return
      if (auth.user) {
        setAliasParticipant(null)
        setShowAliasModal(false)
        setGateReady(true)
        return
      }
      try {
        const res = await fetch('/api/live/anonymous-session', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const json = (await res.json()) as {
          participant?: {
            id: string
            session_id: string
            alias: string
            avatar_emoji: string | null
          } | null
        }
        if (cancelled) return
        const p = json.participant
        if (p?.id && p.session_id) {
          setAliasParticipant({
            id: p.id,
            alias: p.alias,
            emoji: p.avatar_emoji ?? '🎯',
            sessionId: p.session_id,
          })
          setShowAliasModal(false)
        } else {
          setAliasParticipant(null)
          setShowAliasModal(true)
        }
      } catch {
        if (!cancelled) {
          setShowAliasModal(true)
        }
      } finally {
        if (!cancelled) setGateReady(true)
      }
    }
    void gate()
    return () => {
      cancelled = true
    }
  }, [supabase, user?.id])

  const { event, isLoading: evLoading, error: evError, refetch: refetchEvent } = useLiveEvent(eventId)
  const {
    allMarkets,
    activeMarkets,
    resolvedMarkets,
    isLoading: mkLoading,
    refetch: refetchMarkets,
  } = useLiveMarkets(eventId)
  const {
    rankings,
    currentUserEntry,
    isLoading: lbLoading,
    error: lbError,
  } = useLiveLeaderboard(eventId, user?.id ?? null, aliasParticipant?.id ?? null)
  const { viewerCount, isConnected, showConnectionWarning, browserOffline } = usePresence(
    eventId,
    user?.id ?? null,
    aliasParticipant?.sessionId ?? null,
    aliasParticipant?.alias ?? null
  )

  const onRequiresAlias = useCallback(() => {
    setShowAliasModal(true)
  }, [])

  const onAliasJoined = useCallback((p: AliasParticipantJoined) => {
    setAliasParticipant(p)
    setShowAliasModal(false)
  }, [])

  const commentDisplayName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string } | undefined
    return (
      meta?.full_name?.trim() ||
      user?.email?.split('@')[0] ||
      aliasParticipant?.alias ||
      (locale === 'es' ? 'Invitado' : 'Guest')
    )
  }, [user, aliasParticipant, locale])

  const title = event ? getLiveEventTitle(event, locale) : ''
  const copyLocale = locale === 'es' ? 'es' : 'en'
  const eventTypeLabel = event ? getEventTypeLabel(event.event_type, copyLocale) : null
  const status = event?.status
  const isLive = status === 'live'
  const isScheduled = status === 'scheduled'
  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled'

  const share = useCallback(async () => {
    if (!event) return
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const t = getLiveEventTitle(event, locale)
    const text =
      locale === 'es'
        ? 'Mira mis resultados en Conscious Live'
        : 'Check out my Conscious Live results'
    try {
      if (navigator.share) {
        await navigator.share({ title: t, text, url })
      } else {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  }, [event, locale])

  const refreshAfterAdmin = useCallback(() => {
    void refetchEvent()
    void refetchMarkets()
  }, [refetchEvent, refetchMarkets])

  const fundImpact = Number(event?.total_fund_impact ?? 0)
  /** `live_events.total_votes_cast` is updated on resolve; sum market rows for accurate live count. */
  const votesFromMarkets = useMemo(
    () => allMarkets.reduce((s, m) => s + (Number(m.total_votes) || 0), 0),
    [allMarkets]
  )
  const votesCast = Math.max(votesFromMarkets, event?.total_votes_cast ?? 0)

  if (!gateReady && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (evLoading && !event) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-10 w-40 rounded bg-slate-800" />
          <div className="aspect-video rounded-xl bg-slate-800" />
          <div className="h-24 rounded-xl bg-slate-800" />
        </div>
      </div>
    )
  }

  if (evError || !event) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-16 text-center">
        <p className="text-slate-400">
          {locale === 'es' ? 'Evento no encontrado.' : 'Event not found.'}
        </p>
        <Link href="/live" className="mt-4 inline-block text-teal-400 hover:underline">
          ← {locale === 'es' ? 'Volver a eventos' : 'Back to events'}
        </Link>
      </div>
    )
  }

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-[#0f1419] px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <header className="mb-8 flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
            <Link href="/live" className="inline-flex items-center gap-2 text-slate-400 hover:text-teal-400">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="flex-1 text-xl font-bold text-white">{title}</h1>
          </header>
          <p className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-6 text-center text-slate-300">
            {locale === 'es' ? 'Este evento fue cancelado.' : 'This event was cancelled.'}
          </p>
        </div>
      </div>
    )
  }

  const streamLive = isLive
  const embedReplay = isCompleted && !!(event.youtube_video_id || event.youtube_url)

  const isSoccerMatch = event.event_type === 'soccer_match'

  function teamFlagEl(value: string | null) {
    if (!value) return <span className="text-2xl leading-none">🏟️</span>
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return (
        <img src={value} alt="" className="h-8 w-8 shrink-0 rounded object-cover ring-1 ring-white/10" />
      )
    }
    return <span className="text-2xl leading-none">{value}</span>
  }

  const header = (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-[#1a2029] shadow-lg shadow-black/20">
      {event.cover_image_url && (
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <header className="relative z-10 flex flex-wrap items-center gap-3 p-4">
        <Link
          href="/live"
          className="inline-flex items-center gap-2 rounded-lg text-slate-400 transition hover:text-teal-400"
          aria-label={locale === 'es' ? 'Volver' : 'Back'}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          {isSoccerMatch ? (
            <>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {teamFlagEl(event.team_a_flag)}
                  <span className="truncate font-bold text-white sm:text-lg">
                    {event.team_a_name ?? '—'}
                  </span>
                </div>
                <span className="text-slate-500">vs</span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-bold text-white sm:text-lg">
                    {event.team_b_name ?? '—'}
                  </span>
                  {teamFlagEl(event.team_b_flag)}
                </div>
              </div>
              <p className="mt-1 truncate text-sm text-slate-400">{title}</p>
            </>
          ) : (
            <div>
              {eventTypeLabel && (
                <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/95">
                  {eventTypeLabel.header}
                </span>
              )}
              <h1 className="mt-0.5 truncate text-xl font-bold leading-tight text-white sm:text-2xl">{title}</h1>
            </div>
          )}
        </div>
        {streamLive && (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold uppercase text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {locale === 'es' ? 'En vivo' : 'Live'}
          </span>
        )}
        <div className="md:hidden">
          <ViewerCount count={viewerCount} isConnected={isConnected} locale={locale === 'es' ? 'es' : 'en'} />
        </div>
      </header>
    </div>
  )

  const ticker = (
    <FundImpactTicker
      totalVotes={votesCast}
      fundImpact={fundImpact}
      activeCause={
        leadingCauseName ??
        (locale === 'es' ? 'causa líder del Fondo Consciente' : 'leading Conscious Fund cause')
      }
      sponsorName={event.sponsor_name ?? undefined}
      locale={copyLocale}
      hideFundAmountWhenZero
    />
  )

  const stream = (
    <StreamEmbed
      youtubeVideoId={event.youtube_video_id}
      youtubeUrl={event.youtube_url}
      isLive={streamLive}
      matchDate={event.match_date}
      embedReplay={embedReplay}
      isScheduled={isScheduled}
      isCompleted={isCompleted}
      eventTitle={event.title}
      endedAt={event.ended_at ?? null}
      locale={locale === 'es' ? 'es' : 'en'}
    />
  )

  const connectionBanner = (
    <LiveConnectionBanner
      show={showConnectionWarning}
      browserOffline={browserOffline}
      locale={locale === 'es' ? 'es' : 'en'}
    />
  )

  const scheduledBanner =
    isScheduled &&
    eventTypeLabel && (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 text-center text-sm text-emerald-100/95">
        {locale === 'es'
          ? `Las predicciones se abrirán cuando ${eventTypeLabel.action}.`
          : `Predictions will open when ${eventTypeLabel.action}.`}
      </div>
    )

  const votingPanel = (
    <LiveVotingPanel
      activeMarkets={activeMarkets}
      resolvedMarkets={resolvedMarkets}
      currentUserId={user?.id ?? ''}
      eventId={eventId}
      onRequiresAlias={onRequiresAlias}
      isAdmin={isAdmin}
      locale={copyLocale}
      eventType={event.event_type}
    />
  )

  const liveChat = (
    <LiveComments
      eventId={eventId}
      locale={locale === 'es' ? 'es' : 'en'}
      displayName={commentDisplayName}
    />
  )

  const leaderboardBlock = (
    <div className="space-y-2">
      {lbError && (
        <p className="text-sm text-red-400">
          {locale === 'es' ? 'No se pudo cargar el leaderboard.' : 'Could not load leaderboard.'}
        </p>
      )}
      {!lbLoading && !lbError && (
        <LiveLeaderboard
          rankings={rankings}
          currentUserId={user?.id ?? ''}
          currentAnonymousParticipantId={aliasParticipant?.id ?? null}
          currentUserEntry={currentUserEntry}
          locale={copyLocale}
          eventType={event.event_type}
        />
      )}
    </div>
  )

  if (isCompleted) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0f1419]">
        {showAliasModal && !user && (
          <AliasEntry eventId={eventId} onJoined={onAliasJoined} />
        )}
        {connectionBanner}
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {header}

          <div className="mb-6 space-y-4">
            <h2 className="text-lg font-semibold text-teal-300">
              {locale === 'es' ? 'Resultados finales' : 'Final results'}
            </h2>
            {leaderboardBlock}
          </div>

          <div className="mb-6 space-y-4">
            {stream}
            {ticker}
          </div>

          <div className="mb-6">{liveChat}</div>

          <div className="mb-6">
            <h3 className="mb-3 text-base font-semibold text-white">
              {locale === 'es' ? 'Mercados resueltos' : 'Resolved markets'}
            </h3>
            <div className="space-y-3">
              {resolvedMarkets.length === 0 && !mkLoading && (
                <p className="text-sm text-slate-500">{locale === 'es' ? 'Sin datos.' : 'No data.'}</p>
              )}
              {resolvedMarkets.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3"
                >
                  <p className="font-medium text-white">
                    {getMarketText(
                      {
                        title: m.title,
                        description: m.description,
                        resolution_criteria: m.resolution_criteria,
                        translations: (m as { translations?: unknown }).translations as Parameters<
                          typeof getMarketText
                        >[0]['translations'],
                      },
                      'title',
                      locale
                    )}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {m.outcomes.map((o) => (
                      <li
                        key={o.id}
                        className={cn(
                          'flex justify-between gap-2',
                          o.is_winner === true && 'font-semibold text-emerald-400'
                        )}
                      >
                        <span>{o.label}</span>
                        <span className="tabular-nums text-slate-400">
                          {toDisplayPercentRounded(o.probability)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/50 px-4 py-3 text-sm font-semibold text-teal-100 transition hover:bg-teal-900/50 sm:w-auto sm:px-8"
          >
            <Share2 className="h-4 w-4" />
            {locale === 'es' ? 'Compartir tus resultados' : 'Share your results'}
          </button>

          {isAdmin && (
            <AdminLiveControls
              eventId={eventId}
              event={event}
              activeMarkets={activeMarkets}
              resolvedMarkets={resolvedMarkets}
              viewerCount={viewerCount}
              onUpdated={refreshAfterAdmin}
              locale={locale === 'es' ? 'es' : 'en'}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419]">
      {showAliasModal && !user && (
        <AliasEntry eventId={eventId} onJoined={onAliasJoined} />
      )}
      {connectionBanner}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {header}

        {scheduledBanner}

        {isLive && activeMarkets.length === 0 && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200/95">
            {locale === 'es'
              ? 'Evento en vivo — las predicciones pueden aparecer en cualquier momento.'
              : 'Event is live — predictions may appear any moment.'}
          </div>
        )}

        {/* Mobile: vertical stack */}
        <div className="flex flex-col gap-6 md:hidden">
          {stream}
          {ticker}
          {votingPanel}
          {liveChat}
          <div>
            <button
              type="button"
              onClick={() => setLbOpen((o) => !o)}
              className="mb-2 flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-left text-sm font-semibold text-white"
            >
              {locale === 'es' ? 'Leaderboard' : 'Leaderboard'}
              <ChevronDown className={cn('h-4 w-4 transition', lbOpen && 'rotate-180')} />
            </button>
            <div className={cn(!lbOpen && 'hidden')}>{leaderboardBlock}</div>
          </div>
        </div>

        {/* Desktop: two columns */}
        <div className="hidden gap-8 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            {stream}
            {ticker}
          </div>
          <div className="max-h-[calc(100vh-120px)] space-y-4 overflow-y-auto pr-1">
            <div className="hidden md:block">
              <ViewerCount count={viewerCount} isConnected={isConnected} locale={locale === 'es' ? 'es' : 'en'} />
            </div>
            {votingPanel}
            {liveChat}
            {leaderboardBlock}
          </div>
        </div>

        {isAdmin && (
          <AdminLiveControls
            eventId={eventId}
            event={event}
            activeMarkets={activeMarkets}
            resolvedMarkets={resolvedMarkets}
            viewerCount={viewerCount}
            onUpdated={refreshAfterAdmin}
            locale={locale === 'es' ? 'es' : 'en'}
          />
        )}
      </div>
    </div>
  )
}
