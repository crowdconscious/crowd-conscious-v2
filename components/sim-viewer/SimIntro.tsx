'use client'

/**
 * Intro / start overlay (Task 4c): choose Columnas or Mapa, then start.
 * Background shows the static columns/map preview (empty dots).
 */

import { SIM_MARK_LABEL } from '@/components/sim-viewer/SimMark'

type Props = {
  visible: boolean
  mobileLayout?: boolean
  phoneScale?: boolean
  onStart: () => void
  onExplore?: () => void
}

export function SimIntro({
  visible,
  mobileLayout = false,
  phoneScale = false,
  onStart,
  onExplore,
}: Props) {
  if (!visible) return null

  const compact = mobileLayout || phoneScale

  return (
    <div
      className="sim-intro absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0f14]/72 px-4 backdrop-blur-[2px]"
      data-sim-intro="1"
      role="dialog"
      aria-label="Iniciar simulación"
    >
      <div
        className={`flex w-full max-w-sm flex-col items-center text-center ${
          compact ? 'gap-3' : 'gap-4'
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
          Elige Columnas o Mapa, luego inicia la simulación.
        </p>
        <button
          type="button"
          data-sim-intro-start="1"
          onClick={onStart}
          className={`rounded-md bg-emerald-400 font-semibold text-slate-950 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
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
            className={`rounded-md border border-slate-500 bg-slate-800/70 font-medium text-slate-100 hover:border-slate-400 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
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
