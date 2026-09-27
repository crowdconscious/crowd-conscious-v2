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

const ASPECT_CLASS: Record<SimulationAspectRatio, string> = {
  '16:9': 'aspect-video max-w-6xl',
  '9:16': 'aspect-[9/16] max-w-md',
  '1:1': 'aspect-square max-w-2xl',
}

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

  const stageClass = captureMode
    ? ASPECT_CLASS[aspectRatio]
    : aspectRatio === '9:16'
      ? 'w-full max-w-md'
      : 'w-full max-w-6xl'

  const isPortrait = aspectRatio === '9:16'

  return (
    <div
      className={`sim-viewer mx-auto flex w-full flex-col gap-3 text-slate-100 ${stageClass}`}
      data-capture={captureMode ? '1' : '0'}
      data-view-mode={viewMode}
      data-persona={selectedPersonaKey ?? undefined}
    >
      {/* Fixture banner — never present fixture numbers as real results */}
      {data.isFixture ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200"
          role="status"
        >
          Datos de ejemplo (fixture) — no son resultados reales de un Pulse.
        </div>
      ) : null}

      {/* Stage — everything that must survive a crop lives inside here */}
      <div
        className={`sim-viewer-stage relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-[#0f1419] shadow-[0_0_0_1px_rgba(16,185,129,0.08)] ${
          isPortrait ? 'min-h-[640px]' : 'min-h-[520px]'
        }`}
      >
        {/* Header */}
        <header className="relative z-10 flex items-start justify-between gap-3 border-b border-slate-800/80 px-4 pb-3 pt-4 sm:px-5">
          <div className="min-w-0 flex-1 pr-4">
            <div className="mb-2 flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- small brand mark; avoid next/image layout shift in capture crops */}
              <img
                src="/images/logo-small.png"
                alt="Crowd Conscious"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full"
              />
              <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                {metaLine}
              </p>
            </div>
            <h1 className="text-balance text-xl font-semibold leading-snug tracking-tight text-emerald-300 sm:text-2xl md:text-3xl">
              {data.pulse.question}
            </h1>
          </div>
        </header>

        {/* Body: canvas + feed */}
        <div
          className={`flex min-h-0 flex-1 gap-0 p-3 sm:p-4 ${
            isPortrait ? 'flex-col' : 'flex-col lg:flex-row'
          }`}
        >
          <div className={`min-h-0 ${isPortrait ? 'h-[42%]' : 'flex-[1.4]'}`}>
            {viewMode === 'map' ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-600 bg-[#121820] p-6 text-center text-sm text-slate-400">
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
                onDotActivate={(key) => onPersonaSelect?.(key)}
              />
            )}
          </div>
          <div
            className={`min-h-0 ${
              isPortrait ? 'mt-3 h-[38%]' : 'mt-3 lg:ml-3 lg:mt-0 lg:w-[320px] lg:flex-none'
            }`}
          >
            <SimReasoningFeed
              votes={playback.feedVotes}
              optionsById={optionsById}
            />
          </div>
        </div>

        {/* Footer controls + readouts */}
        <footer
          className={`sim-viewer-chrome space-y-3 border-t border-slate-800/80 px-3 py-3 sm:px-4 ${
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
            showMapToggle={Boolean(onViewModeChange) || viewModeProp !== undefined}
          />
          <SimReadouts
            votedCount={playback.votedCount}
            total={data.run.personaCount}
            meanConfidence={playback.meanConfidence}
            divergence={playback.displayedDivergence}
          />
        </footer>
      </div>
    </div>
  )
}
