'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type {
  SimulationAspectRatio,
  SimulationReplayPayload,
  SimulationViewerExtensionSlots,
} from '@/types/simulation-replay'
import { useSimulationPlayback } from '@/hooks/useSimulationPlayback'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { fitLetterbox } from '@/lib/sim-viewer/letterbox'
import { SimCanvas } from '@/components/sim-viewer/SimCanvas'
import { SimMap } from '@/components/sim-viewer/SimMap'
import { SimReasoningFeed } from '@/components/sim-viewer/SimReasoningFeed'
import { SimTransport } from '@/components/sim-viewer/SimTransport'
import { SimReadouts } from '@/components/sim-viewer/SimReadouts'
import { SimEndcard } from '@/components/sim-viewer/SimEndcard'
import { SimIntro } from '@/components/sim-viewer/SimIntro'
import { PersonaInspector } from '@/components/sim-viewer/PersonaInspector'
import {
  useAppEmbedChrome,
  useCaptureChrome,
  useCaptureControlsVisibility,
} from '@/components/sim-viewer/useCaptureChrome'
import { agebGeoCodeSet } from '@/lib/sim-viewer/ageb-codes'
import {
  parseSimAutoplayParam,
  shouldSimAutoplay,
} from '@/lib/sim-viewer/autoplay'
import type { MapCamera } from '@/lib/sim-viewer/map-camera'
import { evaluateMapAvailability } from '@/lib/sim-viewer/map-availability'
import { isPersonaMappable } from '@/lib/sim-viewer/map-availability-ageb'
import {
  parseSimViewModeParam,
  simViewModeToParam,
  type SimViewMode,
} from '@/lib/sim-viewer/view-mode'

export type SimulationViewerProps = {
  data: SimulationReplayPayload
  /** Pulse ordinal for the header line, e.g. 14. */
  pulseNumber?: number | null
} & SimulationViewerExtensionSlots

const ASPECT_CSS: Record<SimulationAspectRatio, string> = {
  '16:9': '16 / 9',
  '9:16': '9 / 16',
  '1:1': '1 / 1',
}

/**
 * Frame-locked viewer for demos / screen recordings.
 *
 * Capture mode (?captura=1 / Modo captura): letterboxed stage at exact
 * 16:9 / 9:16 / 1:1, site chrome hidden, transport fades after 2s idle,
 * cinemático pacing + endcard.
 *
 * Mobile / ?src=app: portrait stage fill, compact transport, reasoning
 * stacked under the canvas; site nav hidden when opened from the app.
 */
export default function SimulationViewer({
  data,
  pulseNumber = null,
  viewMode: viewModeProp,
  onViewModeChange,
  selectedPersonaKey,
  onPersonaSelect,
  captureMode: captureModeProp,
  aspectRatio: aspectRatioProp,
  onAspectRatioChange,
}: SimulationViewerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlCapture = searchParams.get('captura') === '1'
  const fromApp = searchParams.get('src') === 'app'
  const urlPersona = searchParams.get('persona')
  const urlViewMode = parseSimViewModeParam(searchParams.get('mode'))
  const urlAutoplay = parseSimAutoplayParam(searchParams.get('autoplay'))
  const isNarrow = useMediaQuery('(max-width: 767px)')
  /** Stacked phone layout — also forced for in-app browser. */
  const mobileLayout = isNarrow || fromApp

  const [internalCapture, setInternalCapture] = useState(
    () => urlCapture || captureModeProp === true
  )
  // URL + optimistic toggle are source of truth; prop seeds first paint.
  const captureMode = urlCapture || internalCapture

  const aspectTouchedRef = useRef(false)
  const [internalAspect, setInternalAspect] = useState<SimulationAspectRatio>(
    () => (fromApp ? '9:16' : '16:9')
  )
  const [internalViewMode, setInternalViewMode] = useState<SimViewMode>(
    () => viewModeProp ?? urlViewMode ?? 'columns'
  )
  const [internalPersona, setInternalPersona] = useState<string | null>(
    () => selectedPersonaKey ?? urlPersona ?? null
  )
  const [feedCollapsed, setFeedCollapsed] = useState(true)
  const feedTouchedRef = useRef(false)

  const aspectRatio = aspectRatioProp ?? internalAspect
  const viewMode = viewModeProp ?? internalViewMode
  const activePersonaKey =
    selectedPersonaKey !== undefined ? selectedPersonaKey : internalPersona

  const autoplayOnMount = shouldSimAutoplay({
    autoplayParam: urlAutoplay,
    captureMode,
    personaSelected: Boolean(activePersonaKey),
  })
  /** Intro dismissed once the user starts, explores, or autoplay opts in. */
  const [introDismissed, setIntroDismissed] = useState(() => autoplayOnMount)

  const setAspect = (r: SimulationAspectRatio) => {
    aspectTouchedRef.current = true
    onAspectRatioChange?.(r)
    if (aspectRatioProp === undefined) setInternalAspect(r)
  }

  // Default to 9:16 on narrow / in-app unless the user (or prop) chose otherwise.
  useEffect(() => {
    if (aspectRatioProp !== undefined) return
    if (aspectTouchedRef.current) return
    if (mobileLayout) setInternalAspect('9:16')
  }, [mobileLayout, aspectRatioProp])

  const syncCaptureUrl = useCallback(
    (on: boolean) => {
      const params = new URLSearchParams(searchParams.toString())
      if (on) params.set('captura', '1')
      else params.delete('captura')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const syncPersonaUrl = useCallback(
    (key: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key) params.set('persona', key)
      else params.delete('persona')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const syncViewModeUrl = useCallback(
    (mode: SimViewMode) => {
      const params = new URLSearchParams(searchParams.toString())
      if (mode === 'map') params.set('mode', simViewModeToParam(mode))
      else params.delete('mode')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const setViewMode = (m: SimViewMode) => {
    onViewModeChange?.(m)
    if (viewModeProp === undefined) setInternalViewMode(m)
    syncViewModeUrl(m)
  }

  const setCaptureMode = (on: boolean) => {
    setInternalCapture(on)
    syncCaptureUrl(on)
  }

  // Keep internal state in sync if URL / props change externally.
  useEffect(() => {
    setInternalCapture(urlCapture || captureModeProp === true)
  }, [urlCapture, captureModeProp])

  useEffect(() => {
    if (selectedPersonaKey !== undefined) return
    if (urlPersona) setInternalPersona(urlPersona)
  }, [urlPersona, selectedPersonaKey])

  useEffect(() => {
    if (viewModeProp !== undefined) return
    if (urlViewMode) setInternalViewMode(urlViewMode)
  }, [urlViewMode, viewModeProp])

  useCaptureChrome(captureMode)
  useAppEmbedChrome(fromApp && !captureMode)
  const { controlsVisible, onPointerActivity } =
    useCaptureControlsVisibility(captureMode)

  const isPortrait = aspectRatio === '9:16'
  const isSquare = aspectRatio === '1:1'
  /** Phone-legible scale for vertical / square capture frames. */
  const phoneScale = captureMode && (isPortrait || isSquare)
  const feedCap = phoneScale ? 4 : mobileLayout ? 6 : isPortrait ? 10 : 16

  const playback = useSimulationPlayback({
    data,
    autoplay: autoplayOnMount,
    captureMode,
    feedCap,
  })

  const dismissIntro = useCallback(() => {
    setIntroDismissed(true)
  }, [])

  const handleStart = useCallback(() => {
    dismissIntro()
    playback.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play identity from hook
  }, [dismissIntro, playback.play])

  const handleExploreFromIntro = useCallback(() => {
    dismissIntro()
    playback.explore()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explore identity from hook
  }, [dismissIntro, playback.explore])

  const handleRestart = useCallback(() => {
    dismissIntro()
    playback.restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart identity from hook
  }, [dismissIntro, playback.restart])

  const handlePlay = useCallback(() => {
    dismissIntro()
    playback.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play identity from hook
  }, [dismissIntro, playback.play])

  const showIntro =
    !introDismissed &&
    !activePersonaKey &&
    !playback.playing &&
    playback.beat === 'populate' &&
    playback.votedCount === 0 &&
    !playback.reducedMotion

  /**
   * Map camera: full CDMX on intro / endcard / done; zoom to Cuau+MH once
   * the replay is running (including capture autoplay).
   */
  const mapCameraIntent: MapCamera =
    showIntro ||
    playback.beat === 'endcard' ||
    playback.beat === 'done'
      ? 'overview'
      : 'detail'

  // Auto-expand the reasoning drawer once the first vote lands (unless the
  // user already toggled it).
  useEffect(() => {
    if (!mobileLayout) return
    if (feedTouchedRef.current) return
    if (playback.feedVotes.length > 0) setFeedCollapsed(false)
  }, [mobileLayout, playback.feedVotes.length])
  const pausedByInspectorRef = useRef(false)

  const selectPersona = useCallback(
    (key: string | null) => {
      onPersonaSelect?.(key)
      if (selectedPersonaKey === undefined) setInternalPersona(key)
      syncPersonaUrl(key)
    },
    [onPersonaSelect, selectedPersonaKey, syncPersonaUrl]
  )

  /**
   * Task 5 click handler. In capture mode, ignore stray clicks — only a
   * ?persona= deep link may open the inspector (demo / clip hygiene).
   */
  const handleDotActivate = useCallback(
    (key: string) => {
      if (captureMode) return
      selectPersona(key)
    },
    [captureMode, selectPersona]
  )

  // Pause while inspector is open; resume on close only if still mid-replay.
  // After Explorar personas (beat === 'done') stay paused so dots stay clickable
  // and we don't restart() back into the endcard.
  useEffect(() => {
    if (activePersonaKey) {
      pausedByInspectorRef.current = true
      playback.pause()
      return
    }
    if (pausedByInspectorRef.current) {
      pausedByInspectorRef.current = false
      if (playback.beat !== 'done' && playback.beat !== 'endcard') {
        playback.play()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- drive off selection only
  }, [activePersonaKey])

  const optionsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of data.pulse.options) map.set(o.id, o.label)
    return map
  }, [data.pulse.options])

  const selectedVote = useMemo(() => {
    if (!activePersonaKey) return null
    return (
      data.votes.find((v) => v.persona.personaKey === activePersonaKey) ?? null
    )
  }, [activePersonaKey, data.votes])

  const location =
    data.pulse.locationLabel ??
    data.votes[0]?.persona.alcaldia ??
    'CDMX'

  const metaLine = [
    pulseNumber != null ? `Pulse #${pulseNumber}` : 'Pulse',
    location,
    `panel sintético ${data.run.personaCount} agentes`,
  ].join(' · ')

  const showEndcard = playback.beat === 'endcard'

  // Capture mode: R anywhere dismisses the endcard (in addition to click).
  useEffect(() => {
    if (!captureMode || !showEndcard) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        playback.explore()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- explore identity stable enough
  }, [captureMode, showEndcard, playback.explore])

  const agebCodes = useMemo(() => agebGeoCodeSet(), [])

  const mapAvailability = useMemo(
    () =>
      evaluateMapAvailability(
        data.votes.map((v) => v.persona),
        agebCodes,
      ),
    [data.votes, agebCodes],
  )

  const usingLocationFallback = useMemo(() => {
    if (data.votes.length === 0) return false
    let agebHits = 0
    for (const v of data.votes) {
      if (isPersonaMappable(v.persona, agebCodes)) agebHits += 1
    }
    // Fallback note when fewer than half the placeable votes have real AGEBs.
    return agebHits < data.votes.length * 0.5
  }, [data.votes, agebCodes])

  const runIncomplete =
    data.run.status === 'running' || data.run.status === 'pending'
  const runEmpty = data.votes.length === 0
  // Show Columnas/Mapa whenever we can place agents, OR while the run is
  // still in flight (empty votes) so the format choice is not gated on
  // AGEB SQL / completion.
  const showMapToggle =
    mapAvailability.available ||
    (runEmpty && (runIncomplete || data.run.personaCount > 0))

  // If map is requested but the run fails the placement gate, fall back to columns.
  // Keep map selected while pending (empty in-flight run) so the choice sticks.
  useEffect(() => {
    if (showMapToggle) return
    if (viewMode !== 'map') return
    setViewMode('columns')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gate only
  }, [showMapToggle, viewMode])

  const shellRef = useRef<HTMLDivElement>(null)
  const [stagePx, setStagePx] = useState<{ width: number; height: number } | null>(
    null
  )

  // Letterbox only for capture / desktop. Mobile fills the shell so the
  // canvas does not collapse into a thin 16:9 strip on tall phones.
  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => {
      if (mobileLayout && !captureMode) {
        setStagePx(null)
        return
      }
      const w = el.clientWidth
      const h = el.clientHeight
      setStagePx(fitLetterbox(w, h, aspectRatio))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspectRatio, captureMode, mobileLayout])

  // Letterbox: surround is neutral; stage is exact aspect.
  // Mobile non-capture: stage fills shell (CSS .sim-viewer--mobile).
  const stageStyle: CSSProperties =
    mobileLayout && !captureMode
      ? {
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
        }
      : stagePx
        ? {
            width: stagePx.width,
            height: stagePx.height,
            aspectRatio: ASPECT_CSS[aspectRatio],
          }
        : {
            aspectRatio: ASPECT_CSS[aspectRatio],
            width: isPortrait || isSquare ? 'auto' : '100%',
            height: isPortrait || isSquare ? '100%' : 'auto',
            maxWidth: '100%',
            maxHeight: '100%',
          }

  /** Shared activate hook for columns now; map (Task 4) should call the same. */
  const onPersonaActivateFromView = handleDotActivate

  const shellHeightCls =
    fromApp || captureMode || mobileLayout
      ? 'h-dvh max-h-dvh'
      : 'h-dvh max-h-dvh'

  return (
    <div
      ref={shellRef}
      className={`sim-viewer flex w-full flex-col items-center justify-center overflow-hidden text-slate-100 ${shellHeightCls} ${
        captureMode
          ? 'sim-viewer--capture bg-black p-0'
          : mobileLayout
            ? 'sim-viewer--mobile bg-[#0a0f14] p-0'
            : 'bg-[#0a0f14] p-1 sm:p-2'
      }`}
      data-capture={captureMode ? '1' : '0'}
      data-mobile={mobileLayout ? '1' : '0'}
      data-from-app={fromApp ? '1' : '0'}
      data-view-mode={viewMode}
      data-persona={activePersonaKey ?? undefined}
      data-aspect={aspectRatio}
      data-phone-scale={phoneScale ? '1' : '0'}
      data-beat={playback.beat}
      data-voted={String(playback.votedCount)}
      data-intro={showIntro ? '1' : '0'}
      data-autoplay={autoplayOnMount ? '1' : '0'}
      onPointerMove={onPointerActivity}
      onPointerDown={onPointerActivity}
    >
      {/* Neutral letterbox surround — what you record is the stage only */}
      <div
        className={`sim-viewer-stage relative flex min-h-0 flex-col overflow-hidden bg-[#0f1419] ${
          captureMode
            ? 'rounded-none border-0 shadow-none'
            : mobileLayout
              ? 'rounded-none border-0'
              : 'rounded-xl border border-slate-700/70 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
        }`}
        style={stageStyle}
      >
        {/* Fixture banner — keep even in capture (may be small) */}
        {data.isFixture ? (
          <div
            className={`shrink-0 border-b border-amber-500/30 bg-amber-500/10 text-center leading-tight text-amber-200 ${
              phoneScale || mobileLayout
                ? 'px-2 py-0.5 text-[10px]'
                : 'px-2 py-1 text-[10px] sm:text-[11px]'
            }`}
            role="status"
          >
            Datos de ejemplo (fixture) — no son resultados reales de un Pulse.
          </div>
        ) : null}

        {/* In-flight / empty run — admin deep-link from auto-run admin */}
        {!data.isFixture && (runIncomplete || runEmpty) ? (
          <div
            className={`shrink-0 border-b border-sky-500/30 bg-sky-500/10 text-center leading-tight text-sky-100 ${
              phoneScale || mobileLayout
                ? 'px-2 py-0.5 text-[10px]'
                : 'px-2 py-1 text-[10px] sm:text-[11px]'
            }`}
            role="status"
            data-sim-run-pending="1"
          >
            {runIncomplete
              ? runEmpty
                ? 'Simulación en curso — los votos del panel sintético aparecerán cuando termine la corrida.'
                : 'Simulación en curso — mostrando votos parciales; actualiza al terminar.'
              : 'Esta corrida aún no tiene votos guardados.'}
          </div>
        ) : null}

        {/* Header — hidden under endcard overlay when that beat is active */}
        <header
          className={`relative z-10 shrink-0 border-b border-slate-800/80 ${
            mobileLayout
              ? 'px-3 py-1.5'
              : phoneScale
                ? 'px-4 py-3'
                : 'px-3 py-1.5 sm:px-4 sm:py-2'
          }`}
        >
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-small.png"
              alt="Crowd Conscious"
              width={28}
              height={28}
              className={`shrink-0 rounded-full ${
                mobileLayout
                  ? 'h-5 w-5'
                  : phoneScale
                    ? 'h-7 w-7'
                    : 'h-5 w-5 sm:h-6 sm:w-6'
              }`}
            />
            <p
              className={`min-w-0 truncate text-slate-500 ${
                mobileLayout
                  ? 'text-[10px]'
                  : phoneScale
                    ? 'text-xs'
                    : 'text-[10px] sm:text-[11px]'
              }`}
            >
              {metaLine}
            </p>
          </div>
          <h1
            className={`mt-0.5 text-balance font-semibold leading-snug tracking-tight text-emerald-300 ${
              mobileLayout
                ? 'line-clamp-2 text-sm'
                : phoneScale
                  ? 'text-2xl leading-tight sm:text-3xl'
                  : isPortrait
                    ? 'text-sm sm:text-base'
                    : 'text-base sm:text-lg md:text-xl lg:text-2xl'
            }`}
          >
            {data.pulse.question}
          </h1>
        </header>

        {/* Body: canvas + reasoning */}
        <div
          className={`relative flex h-full min-h-0 flex-1 items-stretch overflow-hidden ${
            mobileLayout
              ? 'flex-col gap-1.5 p-1.5'
              : phoneScale
                ? 'flex-col gap-2.5 p-2.5'
                : isPortrait
                  ? 'flex-col gap-2 p-2'
                  : 'flex-row gap-2 p-2 sm:gap-3 sm:p-3'
          }`}
        >
          <div
            className={`flex min-h-0 min-w-0 flex-col ${
              mobileLayout
                ? viewMode === 'map'
                  ? 'min-h-[min(58dvh,28rem)] flex-[1.65]'
                  : 'min-h-[min(48dvh,22rem)] flex-[1.4]'
                : phoneScale
                  ? 'h-full min-h-0 flex-[1.55]'
                  : isPortrait || isSquare
                    ? 'h-full min-h-0 flex-[1.2]'
                    : 'h-full min-h-0 flex-[1.6]'
            }`}
          >
            {viewMode === 'map' && showMapToggle ? (
              <SimMap
                data={data}
                beat={playback.beat}
                votedCount={playback.votedCount}
                cameraIntent={mapCameraIntent}
                hideCameraControl={showIntro}
                compact={isPortrait && !phoneScale && !mobileLayout}
                phoneScale={phoneScale}
                mobileLayout={mobileLayout}
                selectedPersonaKey={activePersonaKey}
                onDotActivate={onPersonaActivateFromView}
                missingLocationCount={mapAvailability.missingLocation}
                usingLocationFallback={usingLocationFallback}
              />
            ) : viewMode === 'map' && !showMapToggle ? (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-[#121820] p-4 text-center text-xs text-slate-400"
                data-sim-map-unavailable="1"
              >
                <p>Mapa no disponible — esta corrida no tiene ubicaciones suficientes.</p>
                <button
                  type="button"
                  className="mt-1 rounded border border-slate-600 px-3 py-1 text-slate-200 hover:border-slate-400"
                  onClick={() => setViewMode('columns')}
                >
                  Volver a columnas
                </button>
              </div>
            ) : (
              <SimCanvas
                data={data}
                beat={playback.beat}
                votedCount={playback.votedCount}
                lastLandedIndex={
                  playback.votedCount > 0 ? playback.votedCount - 1 : null
                }
                compact={isPortrait && !phoneScale && !mobileLayout}
                phoneScale={phoneScale}
                mobileLayout={mobileLayout}
                selectedPersonaKey={activePersonaKey}
                onDotActivate={onPersonaActivateFromView}
              />
            )}
          </div>
          <div
            className={`flex min-h-0 min-w-0 flex-col ${
              mobileLayout
                ? feedCollapsed
                  ? 'shrink-0'
                  : 'sim-viewer-feed-mobile shrink-0'
                : phoneScale
                  ? 'h-full min-h-0 flex-[0.75]'
                  : isPortrait || isSquare
                    ? 'h-full min-h-0 flex-[0.9]'
                    : 'h-full w-[min(32%,320px)] shrink-0'
            }`}
          >
            {mobileLayout ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-700/60 bg-[#141a22]">
                <button
                  type="button"
                  className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-left"
                  aria-expanded={!feedCollapsed}
                  onClick={() => {
                    feedTouchedRef.current = true
                    setFeedCollapsed((c) => !c)
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    Razonamiento de los agentes
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {feedCollapsed ? 'Mostrar' : 'Ocultar'}
                  </span>
                </button>
                {!feedCollapsed ? (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <SimReasoningFeed
                      votes={playback.feedVotes}
                      optionsById={optionsById}
                      compact
                      phoneScale={false}
                      hideHeader
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <SimReasoningFeed
                votes={playback.feedVotes}
                optionsById={optionsById}
                compact={isPortrait && !phoneScale}
                phoneScale={phoneScale}
              />
            )}
          </div>

          {/* Intro overlays the canvas/feed only — header question + footer
              Columnas/Mapa toggle stay visible so the user can choose format. */}
          <SimIntro
            visible={showIntro}
            mobileLayout={mobileLayout}
            phoneScale={phoneScale}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showMapToggle={showMapToggle}
            onStart={handleStart}
            onExplore={handleExploreFromIntro}
          />
        </div>

        {/* Footer — transport fades in capture; readouts stay (hidden under endcard) */}
        <footer
          className={`sim-viewer-chrome shrink-0 border-t border-slate-800/80 ${
            mobileLayout
              ? fromApp
                ? 'space-y-1 px-2 py-1.5 pb-[max(0.375rem,calc(72px+env(safe-area-inset-bottom,0px)))]'
                : 'space-y-1 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]'
              : phoneScale
                ? 'space-y-2 px-3 py-2.5'
                : 'space-y-1.5 px-2 py-1.5 sm:space-y-2 sm:px-3 sm:py-2'
          }`}
        >
          <div
            className={`sim-viewer-transport transition-opacity duration-500 ${
              captureMode && (!controlsVisible || showEndcard)
                ? 'pointer-events-none opacity-0'
                : 'opacity-100'
            }`}
            aria-hidden={captureMode && (!controlsVisible || showEndcard)}
          >
            <SimTransport
              playing={playback.playing}
              speed={playback.speed}
              aspectRatio={aspectRatio}
              onPlay={handlePlay}
              onPause={playback.pause}
              onRestart={handleRestart}
              onSpeed={playback.setSpeed}
              onAspectRatio={setAspect}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showMapToggle={showMapToggle}
              compact
              mobileLayout={mobileLayout}
              captureMode={captureMode}
              onCaptureModeChange={setCaptureMode}
            />
          </div>
          <SimReadouts
            votedCount={playback.votedCount}
            total={data.run.personaCount}
            meanConfidence={playback.meanConfidence}
            divergence={playback.displayedDivergence}
            compact={!phoneScale}
            singleRow={phoneScale || (captureMode && (isPortrait || isSquare))}
            phoneScale={phoneScale}
            mobileLayout={mobileLayout}
            showUnavailableHint={
              playback.displayedDivergence === null &&
              (playback.beat === 'reveal' ||
                playback.beat === 'endcard' ||
                playback.beat === 'done')
            }
          />
        </footer>

        {/* Full-stage endcard — covers chrome so the clip needs no edit */}
        <SimEndcard
          question={data.pulse.question}
          divergence={playback.displayedDivergence}
          visible={showEndcard}
          phoneScale={phoneScale}
          mobileLayout={mobileLayout}
          aspectRatio={aspectRatio}
          captureMode={captureMode}
          onRestart={handleRestart}
          onExplore={playback.explore}
          onCaptureDismiss={playback.explore}
        />
      </div>

      <PersonaInspector
        vote={selectedVote}
        optionLabel={
          selectedVote
            ? (optionsById.get(selectedVote.optionId) ?? null)
            : null
        }
        open={Boolean(activePersonaKey && selectedVote)}
        onClose={() => selectPersona(null)}
      />
    </div>
  )
}
