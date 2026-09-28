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
  /**
   * Capture mode: keep the endcard clean for recording. Click / R dismisses.
   * Normal mode: show Ver de nuevo + Explorar personas.
   */
  captureMode?: boolean
  onRestart?: () => void
  /** Leave endcard → paused scrubbable view where dots are clickable. */
  onExplore?: () => void
  /** Capture: any click / R key returns from the endcard. */
  onCaptureDismiss?: () => void
}

/**
 * Endcard: logo + question + divergence + crowdconscious.app.
 * Capture mode holds a clean frame for recording; normal mode offers
 * restart / explore actions so the owner is never stuck on the index.
 */
export function SimEndcard({
  question,
  divergence,
  visible,
  phoneScale = false,
  aspectRatio = '16:9',
  captureMode = false,
  onRestart,
  onExplore,
  onCaptureDismiss,
}: Props) {
  const isPortrait = aspectRatio === '9:16'
  const isSquare = aspectRatio === '1:1'

  // Keep the stack inside the letterboxed stage — portrait is the tightest.
  const logoSize = phoneScale ? (isPortrait ? 64 : 72) : isSquare ? 72 : 64

  const urlCls = phoneScale
    ? isPortrait
      ? 'mt-5 text-2xl font-semibold tracking-wide text-white'
      : 'mt-6 text-3xl font-semibold tracking-wide text-white'
    : isSquare
      ? 'mt-8 text-2xl font-semibold tracking-wide text-white'
      : 'mt-8 text-2xl font-semibold tracking-wide text-white sm:text-3xl'

  return (
    <div
      className={`sim-endcard absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0f14] text-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      } ${phoneScale && isPortrait ? 'px-5 py-5' : 'px-6'}`}
      data-sim-endcard={visible ? '1' : '0'}
      data-capture={captureMode ? '1' : '0'}
      aria-hidden={!visible}
      role={visible && captureMode ? 'button' : undefined}
      tabIndex={visible && captureMode ? 0 : undefined}
      onClick={
        visible && captureMode
          ? () => {
              onCaptureDismiss?.()
            }
          : undefined
      }
      onKeyDown={
        visible && captureMode
          ? (e) => {
              if (e.key === 'r' || e.key === 'R' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onCaptureDismiss?.()
              }
            }
          : undefined
      }
      aria-label={
        visible && captureMode
          ? 'Fin de la simulación. Pulsa R o haz clic para continuar.'
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo%20white.png"
        alt="Crowd Conscious"
        width={logoSize}
        height={logoSize}
        className={`shrink-0 ${phoneScale && isPortrait ? 'mb-3' : 'mb-4'}`}
        data-sim-endcard-logo="1"
      />

      <div
        className={`rounded border border-dashed border-amber-400/70 ${
          phoneScale && isPortrait ? 'mb-3 px-3 py-1.5' : 'mb-4 px-3 py-1.5'
        }`}
        data-sim-mark="true"
      >
        <div
          className={`font-bold uppercase tracking-[0.14em] text-amber-300 ${
            phoneScale ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'
          }`}
        >
          {SIM_MARK_LABEL}
        </div>
      </div>
      <p
        className={`max-w-2xl text-balance font-semibold leading-snug text-emerald-300 ${
          phoneScale
            ? isPortrait
              ? 'text-2xl leading-tight'
              : 'text-3xl leading-tight'
            : 'text-xl sm:text-2xl md:text-3xl'
        }`}
      >
        {question}
      </p>
      <div className={phoneScale && isPortrait ? 'mt-5' : 'mt-6'}>
        <div
          className={`uppercase tracking-[0.18em] text-slate-500 ${
            phoneScale ? 'text-sm' : 'text-[11px]'
          }`}
        >
          Índice de divergencia
        </div>
        <div
          className={`mt-1.5 font-mono font-semibold tabular-nums text-amber-200 ${
            phoneScale
              ? isPortrait
                ? 'text-6xl'
                : 'text-7xl'
              : 'text-5xl sm:text-6xl'
          }`}
        >
          {divergence === null ? '—' : divergence}
        </div>
      </div>
      <p className={urlCls} data-sim-endcard-url="1">
        crowdconscious.app
      </p>

      {!captureMode && visible ? (
        <div
          className={`flex flex-wrap items-center justify-center gap-3 ${
            phoneScale && isPortrait ? 'mt-5' : 'mt-8'
          }`}
          data-sim-endcard-actions="1"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRestart?.()
            }}
            className="rounded-md border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:border-amber-300 hover:bg-amber-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Ver de nuevo
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onExplore?.()
            }}
            className="rounded-md border border-slate-500 bg-slate-800/80 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-400 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Explorar personas
          </button>
        </div>
      ) : null}
    </div>
  )
}
