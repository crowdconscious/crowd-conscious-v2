'use client'

import { SIM_MARK_LABEL } from '@/components/sim-viewer/SimMark'

type Props = {
  question: string
  divergence: number | null
  visible: boolean
  phoneScale?: boolean
}

/**
 * Capture-mode endcard: question + divergence + crowdconscious.app, held 3s.
 * Full-stage overlay so a crop still shows the SIMULACIÓN mark.
 */
export function SimEndcard({
  question,
  divergence,
  visible,
  phoneScale = false,
}: Props) {
  return (
    <div
      className={`sim-endcard absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0f14] px-6 text-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      data-sim-endcard={visible ? '1' : '0'}
      aria-hidden={!visible}
    >
      <div
        className={`mb-6 rounded border border-dashed border-amber-400/70 ${
          phoneScale ? 'px-3 py-2' : 'px-3 py-1.5'
        }`}
        data-sim-mark="true"
      >
        <div
          className={`font-bold uppercase tracking-[0.14em] text-amber-300 ${
            phoneScale ? 'text-xs sm:text-sm' : 'text-[11px]'
          }`}
        >
          {SIM_MARK_LABEL}
        </div>
      </div>
      <p
        className={`max-w-2xl text-balance font-semibold leading-snug text-emerald-300 ${
          phoneScale
            ? 'text-3xl leading-tight sm:text-4xl'
            : 'text-xl sm:text-2xl md:text-3xl'
        }`}
      >
        {question}
      </p>
      <div className={phoneScale ? 'mt-12' : 'mt-8'}>
        <div
          className={`uppercase tracking-[0.18em] text-slate-500 ${
            phoneScale ? 'text-sm' : 'text-[11px]'
          }`}
        >
          Índice de divergencia
        </div>
        <div
          className={`mt-2 font-mono font-semibold tabular-nums text-amber-200 ${
            phoneScale ? 'text-7xl sm:text-8xl' : 'text-5xl sm:text-6xl'
          }`}
        >
          {divergence === null ? '—' : divergence}
        </div>
      </div>
      <p
        className={`font-medium tracking-wide text-slate-400 ${
          phoneScale ? 'mt-14 text-lg sm:text-xl' : 'mt-10 text-sm sm:text-base'
        }`}
      >
        crowdconscious.app
      </p>
    </div>
  )
}
