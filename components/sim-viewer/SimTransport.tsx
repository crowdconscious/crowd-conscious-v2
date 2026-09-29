'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type {
  SimulationAspectRatio,
  SimulationPlaybackSpeed,
} from '@/types/simulation-replay'

type Props = {
  playing: boolean
  speed: SimulationPlaybackSpeed
  aspectRatio: SimulationAspectRatio
  onPlay: () => void
  onPause: () => void
  onRestart: () => void
  onSpeed: (s: SimulationPlaybackSpeed) => void
  onAspectRatio: (r: SimulationAspectRatio) => void
  viewMode?: 'columns' | 'map'
  onViewModeChange?: (mode: 'columns' | 'map') => void
  showMapToggle?: boolean
  compact?: boolean
  captureMode?: boolean
  onCaptureModeChange?: (on: boolean) => void
  /** When true, hide the capture toggle (already in capture URL). */
  hideCaptureToggle?: boolean
  /**
   * Narrow / in-app layout: one compact row (play, restart, speed).
   * Aspect + capture tuck into a "⋯" menu (admin/recording tools).
   */
  mobileLayout?: boolean
}

const SPEEDS: Array<{ value: SimulationPlaybackSpeed; label: string }> = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
  { value: 'cinematic', label: 'Cinemático' },
]

const MOBILE_SPEEDS: Array<{ value: SimulationPlaybackSpeed; label: string }> = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
]

const RATIOS: SimulationAspectRatio[] = ['16:9', '9:16', '1:1']

export function SimTransport({
  playing,
  speed,
  aspectRatio,
  onPlay,
  onPause,
  onRestart,
  onSpeed,
  onAspectRatio,
  viewMode = 'columns',
  onViewModeChange,
  showMapToggle = false,
  compact = false,
  captureMode = false,
  onCaptureModeChange,
  hideCaptureToggle = false,
  mobileLayout = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreWrapRef = useRef<HTMLDivElement>(null)
  const moreMenuId = useId()

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!moreWrapRef.current?.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const btnBase = mobileLayout
    ? 'inline-flex min-h-[36px] items-center justify-center rounded-md px-2.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
    : compact
      ? 'inline-flex min-h-[32px] items-center justify-center rounded-md px-2.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
      : 'inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
  const btnPrimary = `${btnBase} bg-slate-100 text-slate-900 hover:bg-white`
  const btnGhost = `${btnBase} border border-slate-600 bg-transparent text-slate-200 hover:border-slate-400 hover:bg-slate-800/60`
  const segWrap = 'inline-flex overflow-hidden rounded-md border border-slate-600'
  const segBtn = mobileLayout || compact
    ? 'min-h-[36px] px-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
    : 'min-h-[40px] px-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:px-3'
  const segActive = 'bg-slate-100 text-slate-900 hover:bg-white'

  const speedOptions = mobileLayout ? MOBILE_SPEEDS : SPEEDS
  // If cinematic was selected then user went mobile, keep a way to show it active.
  const showCinematicInRow =
    !mobileLayout || speed === 'cinematic'

  const adminTools = (
    <>
      <div className={segWrap} role="group" aria-label="Proporción">
        {RATIOS.map((r) => (
          <button
            key={r}
            type="button"
            className={`${segBtn} ${aspectRatio === r ? segActive : ''}`}
            aria-pressed={aspectRatio === r}
            onClick={() => onAspectRatio(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {!hideCaptureToggle && onCaptureModeChange ? (
        <button
          type="button"
          className={`${btnGhost} ${captureMode ? 'border-amber-400/60 text-amber-200' : ''}`}
          aria-pressed={captureMode}
          onClick={() => onCaptureModeChange(!captureMode)}
        >
          Modo captura
        </button>
      ) : null}

      {mobileLayout ? (
        <button
          type="button"
          className={`${btnGhost} ${speed === 'cinematic' ? 'border-amber-400/60 text-amber-200' : ''}`}
          aria-pressed={speed === 'cinematic'}
          onClick={() => {
            onSpeed('cinematic')
            setMoreOpen(false)
          }}
        >
          Cinemático
        </button>
      ) : null}
    </>
  )

  return (
    <div
      className={
        mobileLayout
          ? 'flex flex-nowrap items-center gap-1.5 overflow-x-auto'
          : 'flex flex-wrap items-center gap-1.5 sm:gap-2'
      }
    >
      {playing ? (
        <button type="button" className={btnPrimary} onClick={onPause}>
          Pausar
        </button>
      ) : (
        <button type="button" className={btnPrimary} onClick={onPlay}>
          {mobileLayout ? 'Iniciar' : 'Iniciar simulación'}
        </button>
      )}
      <button type="button" className={btnGhost} onClick={onRestart}>
        Reiniciar
      </button>

      <div className={segWrap} role="group" aria-label="Velocidad">
        {speedOptions.map(({ value, label }) => (
          <button
            key={String(value)}
            type="button"
            className={`${segBtn} ${speed === value ? segActive : ''}`}
            aria-pressed={speed === value}
            onClick={() => onSpeed(value)}
          >
            {label}
          </button>
        ))}
        {showCinematicInRow && mobileLayout && speed === 'cinematic' ? (
          <button
            type="button"
            className={`${segBtn} ${segActive}`}
            aria-pressed
            onClick={() => onSpeed('cinematic')}
          >
            Cin.
          </button>
        ) : null}
      </div>

      {showMapToggle && onViewModeChange ? (
        <div className={segWrap} role="group" aria-label="Vista">
          <button
            type="button"
            className={`${segBtn} ${viewMode === 'columns' ? segActive : ''}`}
            aria-pressed={viewMode === 'columns'}
            onClick={() => onViewModeChange('columns')}
          >
            {mobileLayout ? 'Col.' : 'Columnas'}
          </button>
          <button
            type="button"
            className={`${segBtn} ${viewMode === 'map' ? segActive : ''}`}
            aria-pressed={viewMode === 'map'}
            onClick={() => onViewModeChange('map')}
          >
            Mapa
          </button>
        </div>
      ) : null}

      {mobileLayout ? (
        <div className="relative ml-auto shrink-0" ref={moreWrapRef}>
          <button
            type="button"
            className={btnGhost}
            aria-expanded={moreOpen}
            aria-controls={moreMenuId}
            aria-label="Más opciones"
            onClick={() => setMoreOpen((o) => !o)}
          >
            ⋯
          </button>
          {moreOpen ? (
            <div
              id={moreMenuId}
              role="menu"
              className="absolute bottom-full right-0 z-30 mb-1.5 flex min-w-[11rem] flex-col gap-1.5 rounded-lg border border-slate-600 bg-[#121820] p-2 shadow-xl"
            >
              {adminTools}
            </div>
          ) : null}
        </div>
      ) : (
        <>{adminTools}</>
      )}
    </div>
  )
}
