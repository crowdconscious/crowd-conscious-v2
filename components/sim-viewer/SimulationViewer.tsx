'use client'

import { useMemo, useState } from 'react'
import type {
  SimulationAspectRatio,
  SimulationReplayPayload,
  SimulationViewerExtensionSlots,
} from '@/types/simulation-replay'
import { useSimulationPlayback } from '@/hooks/useSimulationPlayback'
import { SimCanvas } from '@/components/sim-viewer/SimCanvas'
import { SimReasoningFeed } from '@/components/sim-viewer/SimReasoningFeed'
import { SimTransport } from '@/components/sim-viewer/SimTransport'
import { SimReadouts } from '@/components/sim-viewer/SimReadouts'

export type SimulationViewerProps = {
  data: SimulationReplayPayload
  /** Pulse ordinal for the header line, e.g. 14. */
  pulseNumber?: number | null
} & SimulationViewerExtensionSlots

/**
 * Frame-locked viewer for demos / screen recordings.
 *
 * 16:9 and 9:16 stages are sized to fit the viewport (no page scroll).
 * Header + canvas/feed + transport/readouts all live inside the stage.
 */
export default function SimulationViewer({
  data,
  pulseNumber = null,
  viewMode: viewModeProp,
  onViewModeChange,
  selectedPersonaKey,
  onPersonaSelect,
  captureMode = false,
  aspectRatio: aspectRatioProp,
  onAspectRatioChange,
}: SimulationViewerProps) {
  const [internalAspect, setInternalAspect] =
    useState<SimulationAspectRatio>('16:9')
  const [internalViewMode, setInternalViewMode] = useState<'columns' | 'map'>(
    'columns'
  )

  const aspectRatio = aspectRatioProp ?? internalAspect
  const viewMode = viewModeProp ?? internalViewMode

  const setAspect = (r: SimulationAspectRatio) => {
    onAspectRatioChange?.(r)
    if (aspectRatioProp === undefined) setInternalAspect(r)
  }
  const setViewMode = (m: 'columns' | 'map') => {
    onViewModeChange?.(m)
    if (viewModeProp === undefined) setInternalViewMode(m)
  }

  const playback = useSimulationPlayback({ data, autoplay: true })

  const optionsById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of data.pulse.options) map.set(o.id, o.label)
    return map
  }, [data.pulse.options])

  const location =
    data.pulse.locationLabel ??
    data.votes[0]?.persona.alcaldia ??
    'CDMX'

  const metaLine = [
    pulseNumber != null ? `Pulse #${pulseNumber}` : 'Pulse',
    location,
    `panel sintético ${data.run.personaCount} agentes`,
  ].join(' · ')

  const isPortrait = aspectRatio === '9:16'
  const isSquare = aspectRatio === '1:1'

  // Stage fills the viewport without scrolling. Aspect is enforced via
  // max-width/max-height so 1920×1080 and 1280×720 both show the full UI.
  const stageSizeClass = isPortrait
    ? 'h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] w-auto max-w-[min(100%,calc((100dvh-0.5rem)*9/16))] aspect-[9/16]'
    : isSquare
      ? 'h-[calc(100dvh-0.5rem)] max-h-[calc(100dvh-0.5rem)] w-auto max-w-[min(100%,calc(100dvh-0.5rem))] aspect-square'
      : 'w-[min(100%,calc((100dvh-0.5rem)*16/9))] max-w-full aspect-video max-h-[calc(100dvh-0.5rem)]'

  return (
    <div
      className={`sim-viewer flex h-dvh max-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#0a0f14] text-slate-100 ${
        captureMode ? 'p-0' : 'p-1 sm:p-2'
      }`}
      data-capture={captureMode ? '1' : '0'}
      data-view-mode={viewMode}
      data-persona={selectedPersonaKey ?? undefined}
      data-aspect={aspectRatio}
    >
      <div
        className={`sim-viewer-stage relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-[#0f1419] shadow-[0_0_0_1px_rgba(16,185,129,0.08)] ${stageSizeClass}`}
      >
        {/* Fixture banner — inside the stage so a crop still shows it */}
        {data.isFixture ? (
          <div
            className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-2 py-1 text-center text-[10px] leading-tight text-amber-200 sm:text-[11px]"
            role="status"
          >
            Datos de ejemplo (fixture) — no son resultados reales de un Pulse.
          </div>
        ) : null}

        {/* Header — compact so the canvas stays dominant */}
        <header className="relative z-10 shrink-0 border-b border-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-small.png"
              alt="Crowd Conscious"
              width={22}
              height={22}
              className="h-5 w-5 shrink-0 rounded-full sm:h-6 sm:w-6"
            />
            <p className="min-w-0 truncate text-[10px] text-slate-500 sm:text-[11px]">
              {metaLine}
            </p>
          </div>
          <h1
            className={`mt-0.5 text-balance font-semibold leading-snug tracking-tight text-emerald-300 ${
              isPortrait
                ? 'text-sm sm:text-base'
                : 'text-base sm:text-lg md:text-xl lg:text-2xl'
            }`}
          >
            {data.pulse.question}
          </h1>
        </header>

        {/* Body: canvas dominates; feed matches canvas height */}
        <div
          className={`flex h-full min-h-0 flex-1 items-stretch gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3 ${
            isPortrait ? 'flex-col' : 'flex-row'
          }`}
        >
          <div
            className={`flex h-full min-h-0 min-w-0 flex-col ${
              isPortrait ? 'min-h-0 flex-[1.35]' : 'min-h-0 flex-[1.6]'
            }`}
          >
            {viewMode === 'map' ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-600 bg-[#121820] p-4 text-center text-xs text-slate-400">
                Vista mapa (Task 4) — el reloj de reproducción se conserva al
                cambiar de modo.
              </div>
            ) : (
              <SimCanvas
                data={data}
                beat={playback.beat}
                votedCount={playback.votedCount}
                lastLandedIndex={
                  playback.votedCount > 0 ? playback.votedCount - 1 : null
                }
                compact={isPortrait}
                onDotActivate={(key) => onPersonaSelect?.(key)}
              />
            )}
          </div>
          <div
            className={`flex h-full min-h-0 min-w-0 flex-col ${
              isPortrait
                ? 'min-h-0 flex-1'
                : 'w-[min(32%,320px)] shrink-0'
            }`}
          >
            <SimReasoningFeed
              votes={playback.feedVotes}
              optionsById={optionsById}
              compact={isPortrait}
            />
          </div>
        </div>

        {/* Footer — always visible inside the frame */}
        <footer
          className={`sim-viewer-chrome shrink-0 space-y-1.5 border-t border-slate-800/80 px-2 py-1.5 sm:space-y-2 sm:px-3 sm:py-2 ${
            captureMode ? 'transition-opacity' : ''
          }`}
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
              Boolean(onViewModeChange) || viewModeProp !== undefined
            }
            compact
          />
          <SimReadouts
            votedCount={playback.votedCount}
            total={data.run.personaCount}
            meanConfidence={playback.meanConfidence}
            divergence={playback.displayedDivergence}
            compact
          />
        </footer>
      </div>
    </div>
  )
}
