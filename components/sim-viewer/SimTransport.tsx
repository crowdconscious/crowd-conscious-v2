'use client'

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
  /** Task 4 placeholder — Columnas | Mapa */
  viewMode?: 'columns' | 'map'
  onViewModeChange?: (mode: 'columns' | 'map') => void
  showMapToggle?: boolean
}

const SPEEDS: SimulationPlaybackSpeed[] = [1, 2, 4]
const RATIOS: SimulationAspectRatio[] = ['16:9', '9:16']

const btnBase =
  'inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
const btnPrimary = `${btnBase} bg-slate-100 text-slate-900 hover:bg-white`
const btnGhost = `${btnBase} border border-slate-600 bg-transparent text-slate-200 hover:border-slate-400 hover:bg-slate-800/60`
const segWrap = 'inline-flex overflow-hidden rounded-lg border border-slate-600'
const segBtn =
  'min-h-[40px] px-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 sm:px-3'
const segActive = 'bg-slate-100 text-slate-900 hover:bg-white'

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
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {playing ? (
        <button type="button" className={btnPrimary} onClick={onPause}>
          Pausar
        </button>
      ) : (
        <button type="button" className={btnPrimary} onClick={onPlay}>
          Iniciar simulación
        </button>
      )}
      <button type="button" className={btnGhost} onClick={onRestart}>
        Reiniciar
      </button>

      <div className={segWrap} role="group" aria-label="Velocidad">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            className={`${segBtn} ${speed === s ? segActive : ''}`}
            aria-pressed={speed === s}
            onClick={() => onSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>

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

      {showMapToggle && onViewModeChange ? (
        <div className={segWrap} role="group" aria-label="Vista">
          <button
            type="button"
            className={`${segBtn} ${viewMode === 'columns' ? segActive : ''}`}
            aria-pressed={viewMode === 'columns'}
            onClick={() => onViewModeChange('columns')}
          >
            Columnas
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
    </div>
  )
}
