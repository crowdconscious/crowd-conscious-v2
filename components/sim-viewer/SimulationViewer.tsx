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
import { fitLetterbox } from '@/lib/sim-viewer/letterbox'
import { SimCanvas } from '@/components/sim-viewer/SimCanvas'
import { SimReasoningFeed } from '@/components/sim-viewer/SimReasoningFeed'
import { SimTransport } from '@/components/sim-viewer/SimTransport'
import { SimReadouts } from '@/components/sim-viewer/SimReadouts'
import { SimEndcard } from '@/components/sim-viewer/SimEndcard'
import { PersonaInspector } from '@/components/sim-viewer/PersonaInspector'
import {
  useCaptureChrome,
  useCaptureControlsVisibility,
} from '@/components/sim-viewer/useCaptureChrome'

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
  const urlPersona = searchParams.get('persona')
  const [internalCapture, setInternalCapture] = useState(
    () => urlCapture || captureModeProp === true
  )
  // URL + optimistic toggle are source of truth; prop seeds first paint.
  const captureMode = urlCapture || internalCapture

  const [internalAspect, setInternalAspect] =
    useState<SimulationAspectRatio>('16:9')
  const [internalViewMode, setInternalViewMode] = useState<'columns' | 'map'>(
    'columns'
  )
  const [internalPersona, setInternalPersona] = useState<string | null>(
    () => selectedPersonaKey ?? urlPersona ?? null
  )

  const aspectRatio = aspectRatioProp ?? internalAspect
  const viewMode = viewModeProp ?? internalViewMode
  const activePersonaKey =
    selectedPersonaKey !== undefined ? selectedPersonaKey : internalPersona

  const setAspect = (r: SimulationAspectRatio) => {
    onAspectRatioChange?.(r)
    if (aspectRatioProp === undefined) setInternalAspect(r)
  }
  const setViewMode = (m: 'columns' | 'map') => {
    onViewModeChange?.(m)
    if (viewModeProp === undefined) setInternalViewMode(m)
  }

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

  useCaptureChrome(captureMode)
  const { controlsVisible, onPointerActivity } =
    useCaptureControlsVisibility(captureMode)

  const isPortrait = aspectRatio === '9:16'
  const isSquare = aspectRatio === '1:1'
  /** Phone-legible scale for vertical / square capture frames. */
  const phoneScale = captureMode && (isPortrait || isSquare)
  const feedCap = phoneScale ? 4 : isPortrait ? 10 : 16

  const playback = useSimulationPlayback({
    data,
    autoplay: !activePersonaKey,
    captureMode,
    feedCap,
  })

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

  // Pause while inspector is open; resume on close (spec behaviour).
  useEffect(() => {
    if (activePersonaKey) {
      pausedByInspectorRef.current = true
      playback.pause()
      return
    }
    if (pausedByInspectorRef.current) {
      pausedByInspectorRef.current = false
      playback.play()
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

  const hasMapCoordinates = useMemo(
    () =>
      data.votes.some(
        (v) =>
          typeof v.persona.centroidLat === 'number' &&
          typeof v.persona.centroidLng === 'number'
      ),
    [data.votes]
  )

  const shellRef = useRef<HTMLDivElement>(null)
  const [stagePx, setStagePx] = useState<{ width: number; height: number } | null>(
    null
  )

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      setStagePx(fitLetterbox(w, h, aspectRatio))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspectRatio, captureMode])

  // Letterbox: surround is neutral; stage is exact aspect.
  const stageStyle: CSSProperties = stagePx
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

  return (
    <div
      ref={shellRef}
      className={`sim-viewer flex h-dvh max-h-dvh w-full flex-col items-center justify-center overflow-hidden text-slate-100 ${
        captureMode ? 'sim-viewer--capture bg-black p-0' : 'bg-[#0a0f14] p-1 sm:p-2'
      }`}
      data-capture={captureMode ? '1' : '0'}
      data-view-mode={viewMode}
      data-persona={activePersonaKey ?? undefined}
      data-aspect={aspectRatio}
      data-phone-scale={phoneScale ? '1' : '0'}
      data-beat={playback.beat}
      data-voted={String(playback.votedCount)}
      onPointerMove={onPointerActivity}
      onPointerDown={onPointerActivity}
    >
      {/* Neutral letterbox surround — what you record is the stage only */}
      <div
        className={`sim-viewer-stage relative flex min-h-0 flex-col overflow-hidden bg-[#0f1419] ${
          captureMode
            ? 'rounded-none border-0 shadow-none'
            : 'rounded-xl border border-slate-700/70 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]'
        }`}
        style={stageStyle}
      >
        {/* Fixture banner — keep even in capture (may be small) */}
        {data.isFixture ? (
          <div
            className={`shrink-0 border-b border-amber-500/30 bg-amber-500/10 text-center leading-tight text-amber-200 ${
              phoneScale
                ? 'px-2 py-0.5 text-[10px]'
                : 'px-2 py-1 text-[10px] sm:text-[11px]'
            }`}
            role="status"
          >
            Datos de ejemplo (fixture) — no son resultados reales de un Pulse.
          </div>
        ) : null}

        {/* Header — hidden under endcard overlay when that beat is active */}
        <header
          className={`relative z-10 shrink-0 border-b border-slate-800/80 ${
            phoneScale ? 'px-4 py-3' : 'px-3 py-1.5 sm:px-4 sm:py-2'
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
                phoneScale ? 'h-7 w-7' : 'h-5 w-5 sm:h-6 sm:w-6'
              }`}
            />
            <p
              className={`min-w-0 truncate text-slate-500 ${
                phoneScale ? 'text-xs' : 'text-[10px] sm:text-[11px]'
              }`}
            >
              {metaLine}
            </p>
          </div>
          <h1
            className={`mt-1 text-balance font-semibold leading-snug tracking-tight text-emerald-300 ${
              phoneScale
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
            phoneScale
              ? 'flex-col gap-2.5 p-2.5'
              : isPortrait
                ? 'flex-col gap-2 p-2'
                : 'flex-row gap-2 p-2 sm:gap-3 sm:p-3'
          }`}
        >
          <div
            className={`flex h-full min-h-0 min-w-0 flex-col ${
              phoneScale
                ? 'min-h-0 flex-[1.55]'
                : isPortrait || isSquare
                  ? 'min-h-0 flex-[1.2]'
                  : 'min-h-0 flex-[1.6]'
            }`}
          >
            {viewMode === 'map' && hasMapCoordinates ? (
              <div
                className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-600 bg-[#121820] p-4 text-center text-xs text-slate-400"
                data-sim-map-hook="1"
              >
                <p>
                  Vista mapa (Task 4) — el reloj de reproducción se conserva al
                  cambiar de modo.
                </p>
                <p className="max-w-xs text-[11px] text-slate-500">
                  Hook Task 5: al montar el mapa, pasar{' '}
                  <code className="text-slate-400">onPersonaActivate</code> y{' '}
                  <code className="text-slate-400">selectedPersonaKey</code>{' '}
                  a cada punto AGEB (misma selección que columnas).
                </p>
                <span className="sr-only" data-on-persona-activate="ready">
                  ready
                </span>
              </div>
            ) : viewMode === 'map' && !hasMapCoordinates ? (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-[#121820] p-4 text-center text-xs text-slate-400"
                data-sim-map-unavailable="1"
              >
                <p>Mapa no disponible — esta corrida no tiene coordenadas AGEB.</p>
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
                compact={isPortrait && !phoneScale}
                phoneScale={phoneScale}
                selectedPersonaKey={activePersonaKey}
                onDotActivate={onPersonaActivateFromView}
              />
            )}
          </div>
          <div
            className={`flex h-full min-h-0 min-w-0 flex-col ${
              phoneScale
                ? 'min-h-0 flex-[0.75]'
                : isPortrait || isSquare
                  ? 'min-h-0 flex-[0.9]'
                  : 'w-[min(32%,320px)] shrink-0'
            }`}
          >
            <SimReasoningFeed
              votes={playback.feedVotes}
              optionsById={optionsById}
              compact={isPortrait && !phoneScale}
              phoneScale={phoneScale}
            />
          </div>
        </div>

        {/* Footer — transport fades in capture; readouts stay (hidden under endcard) */}
        <footer
          className={`sim-viewer-chrome shrink-0 border-t border-slate-800/80 ${
            phoneScale
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
              onPlay={playback.play}
              onPause={playback.pause}
              onRestart={playback.restart}
              onSpeed={playback.setSpeed}
              onAspectRatio={setAspect}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showMapToggle={
                hasMapCoordinates &&
                (Boolean(onViewModeChange) || viewModeProp !== undefined)
              }
              compact
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
          />
        </footer>

        {/* Full-stage endcard — covers chrome so the clip needs no edit */}
        <SimEndcard
          question={data.pulse.question}
          divergence={playback.displayedDivergence}
          visible={showEndcard}
          phoneScale={phoneScale}
          aspectRatio={aspectRatio}
          captureMode={captureMode}
          onRestart={playback.restart}
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
