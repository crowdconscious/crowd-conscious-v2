'use client'

import { SIM_MARK_LABEL } from '@/components/sim-viewer/SimMark'
import type { SimulationAspectRatio } from '@/types/simulation-replay'

type Props = {
  question: string
  divergence: number | null
  visible: boolean
  phoneScale?: boolean
  /** Affects logo / URL sizing across 16:9, 9:16, and 1:1 presets. */
  aspectRatio?: SimulationAspectRatio
}

/**
 * Capture-mode endcard: logo + question + divergence + crowdconscious.app.
 * Held 3s. Full-stage overlay so a crop still shows the SIMULACIÓN mark.
 * Logo + brighter URL so 9:16 clips feel postable (not sparse).
 */
export function SimEndcard({
  question,
  divergence,
  visible,
  phoneScale = false,
  aspectRatio = '16:9',
}: Props) {
  const isSquare = aspectRatio === '1:1'
  const logoSize = phoneScale ? 72 : isSquare ? 56 : 48
  const urlCls = phoneScale
    ? 'mt-12 text-2xl font-semibold tracking-wide text-slate-100 sm:text-3xl'
    : isSquare
      ? 'mt-10 text-xl font-semibold tracking-wide text-slate-100'
      : 'mt-10 text-lg font-semibold tracking-wide text-slate-100 sm:text-xl'

  return (
    <div
      className={`sim-endcard absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0f14] px-6 text-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      data-sim-endcard={visible ? '1' : '0'}
      aria-hidden={!visible}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-small.png"
        alt="Crowd Conscious"
        width={logoSize}
        height={logoSize}
        className="mb-5 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(148,163,184,0.25)]"
        data-sim-endcard-logo="1"
      />

      <div
        className={`mb-5 rounded border border-dashed border-amber-400/70 ${
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
      <div className={phoneScale ? 'mt-10' : 'mt-8'}>
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
      <p className={urlCls} data-sim-endcard-url="1">
        crowdconscious.app
      </p>
    </div>
  )
}
