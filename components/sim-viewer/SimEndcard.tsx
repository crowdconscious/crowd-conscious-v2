'use client'

import { SIM_MARK_LABEL } from '@/components/sim-viewer/SimMark'

type Props = {
  question: string
  divergence: number | null
  visible: boolean
}

/**
 * Capture-mode endcard: question + divergence + crowdconscious.app, held 3s.
 * Rendered inside the stage so a crop still shows the SIMULACIÓN mark.
 */
export function SimEndcard({ question, divergence, visible }: Props) {
  return (
    <div
      className={`sim-endcard absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0f14]/96 px-6 text-center backdrop-blur-sm transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      data-sim-endcard={visible ? '1' : '0'}
      aria-hidden={!visible}
    >
      <div
        className="mb-6 rounded border border-dashed border-amber-400/70 px-3 py-1.5"
        data-sim-mark="true"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
          {SIM_MARK_LABEL}
        </div>
      </div>
      <p className="max-w-2xl text-balance text-xl font-semibold leading-snug text-emerald-300 sm:text-2xl md:text-3xl">
        {question}
      </p>
      <div className="mt-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          Índice de divergencia
        </div>
        <div className="mt-1 font-mono text-5xl font-semibold tabular-nums text-amber-200 sm:text-6xl">
          {divergence === null ? '—' : divergence}
        </div>
      </div>
      <p className="mt-10 text-sm font-medium tracking-wide text-slate-400 sm:text-base">
        crowdconscious.app
      </p>
    </div>
  )
}
