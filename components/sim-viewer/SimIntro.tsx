'use client'

/**
 * Intro / start overlay (Task 4c): choose Columnas or Mapa, then start.
 * Mode toggle lives INSIDE the overlay (synced with footer + ?mode).
 * Background stays readable so the chosen format previews behind.
 */

import { SIM_MARK_LABEL } from '@/components/sim-viewer/SimMark'
import type { SimViewMode } from '@/lib/sim-viewer/view-mode'

type Props = {
  visible: boolean
  mobileLayout?: boolean
  phoneScale?: boolean
  viewMode: SimViewMode
  onViewModeChange: (mode: SimViewMode) => void
  showMapToggle?: boolean
  onStart: () => void
  onExplore?: () => void
}

export function SimIntro({
  visible,
  mobileLayout = false,
  phoneScale = false,
  viewMode,
  onViewModeChange,
  showMapToggle = true,
  onStart,
  onExplore,
}: Props) {
  if (!visible) return null

  const compact = mobileLayout || phoneScale
  const segBtn =
    'min-h-[40px] flex-1 px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400'
  const segActive = 'bg-slate-100 text-slate-900'
  const segIdle = 'bg-transparent text-slate-200 hover:bg-slate-800/70'

  return (
    <div
      className="sim-intro absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0f14]/45 px-4"
      data-sim-intro="1"
      role="dialog"
      aria-label="Iniciar simulación"
    >
      <div
        className={`flex w-full max-w-sm flex-col items-center rounded-xl border border-slate-600/50 bg-[#0f1419]/88 px-4 py-5 text-center shadow-lg backdrop-blur-[1px] ${
          compact ? 'gap-3' : 'gap-3.5'
        }`}
      >
        <div
          className="rounded border border-dashed border-amber-400/70 px-3 py-1.5"
          data-sim-mark="true"
        >
          <div
            className={`font-bold uppercase tracking-[0.14em] text-amber-300 ${
              compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
            }`}
          >
            {SIM_MARK_LABEL}
          </div>
        </div>
        <p
          className={`max-w-xs text-balance text-slate-300 ${
            compact ? 'text-sm leading-snug' : 'text-base'
          }`}
        >
          {showMapToggle
            ? 'Elige el formato y luego inicia la simulación.'
            : 'Inicia la simulación cuando quieras.'}
        </p>

        {showMapToggle ? (
          <div
            className="flex w-full overflow-hidden rounded-md border border-slate-500"
            role="group"
            aria-label="Formato de simulación"
            data-sim-intro-mode="1"
          >
            <button
              type="button"
              className={`${segBtn} ${viewMode === 'columns' ? segActive : segIdle}`}
              aria-pressed={viewMode === 'columns'}
              onClick={() => onViewModeChange('columns')}
            >
              Columnas
            </button>
            <button
              type="button"
              className={`${segBtn} ${viewMode === 'map' ? segActive : segIdle}`}
              aria-pressed={viewMode === 'map'}
              onClick={() => onViewModeChange('map')}
            >
              Mapa
            </button>
          </div>
        ) : null}

        <button
          type="button"
          data-sim-intro-start="1"
          onClick={onStart}
          className={`w-full rounded-md bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
            compact ? 'min-h-[44px] px-5 text-sm' : 'min-h-[48px] px-6 text-base'
          }`}
        >
          Iniciar simulación
        </button>
        {onExplore ? (
          <button
            type="button"
            data-sim-intro-explore="1"
            onClick={onExplore}
            className={`w-full rounded-md border border-slate-500 bg-slate-800/70 font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              compact ? 'min-h-[40px] px-4 text-xs' : 'min-h-[42px] px-4 text-sm'
            }`}
          >
            Explorar personas
          </button>
        ) : null}
      </div>
    </div>
  )
}
