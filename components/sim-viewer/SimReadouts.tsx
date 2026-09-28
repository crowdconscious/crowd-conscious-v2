'use client'

import { DIVERGENCE_UNAVAILABLE_HINT } from '@/lib/sim-viewer/legacy'

type Props = {
  votedCount: number
  total: number
  meanConfidence: number | null
  divergence: number | null
  compact?: boolean
  /** Capture 9:16 / 1:1 — single horizontal row, larger type. */
  singleRow?: boolean
  /** Phone-legible scale for capture presets. */
  phoneScale?: boolean
  /** Narrow viewport — denser single row. */
  mobileLayout?: boolean
  /** Show the "Sin índice…" line (after reveal when score is null). */
  showUnavailableHint?: boolean
}

function Readout({
  label,
  value,
  compact,
  phoneScale,
  inline,
}: {
  label: string
  value: string
  compact?: boolean
  phoneScale?: boolean
  inline?: boolean
}) {
  if (inline) {
    return (
      <div className="flex min-w-0 flex-1 items-baseline gap-1 overflow-hidden sm:gap-1.5">
        <span
          className={`shrink-0 uppercase tracking-wide text-slate-500 ${
            phoneScale ? 'text-xs' : 'text-[9px] sm:text-[10px]'
          }`}
        >
          {label}
        </span>
        <span
          className={`min-w-0 truncate font-semibold tabular-nums text-slate-100 ${
            phoneScale ? 'text-xl' : 'text-sm sm:text-lg'
          }`}
        >
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className="min-w-[4.5rem]">
      <div
        className={`uppercase tracking-wide text-slate-500 ${
          phoneScale
            ? 'text-xs'
            : compact
              ? 'text-[9px]'
              : 'text-[10px] sm:text-[11px]'
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 font-semibold tabular-nums text-slate-100 ${
          phoneScale
            ? 'text-2xl'
            : compact
              ? 'text-base sm:text-lg'
              : 'text-xl sm:text-2xl'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export function SimReadouts({
  votedCount,
  total,
  meanConfidence,
  divergence,
  compact = false,
  singleRow = false,
  phoneScale = false,
  mobileLayout = false,
  showUnavailableHint = false,
}: Props) {
  const inline = singleRow || mobileLayout
  const scale = phoneScale && !mobileLayout

  return (
    <div className="space-y-1">
      <div
        className={
          inline
            ? 'flex flex-nowrap items-baseline justify-between gap-2 overflow-hidden sm:gap-3'
            : `flex flex-wrap items-end ${compact ? 'gap-4 sm:gap-6' : 'gap-6 sm:gap-10'}`
        }
      >
        <Readout
          label={mobileLayout ? 'Votos' : 'Votos emitidos'}
          value={`${votedCount}/${total}`}
          compact={compact || mobileLayout}
          phoneScale={scale}
          inline={inline}
        />
        <Readout
          label={mobileLayout ? 'Certeza' : 'Certeza media IA'}
          value={meanConfidence === null ? '—' : meanConfidence.toFixed(1)}
          compact={compact || mobileLayout}
          phoneScale={scale}
          inline={inline}
        />
        <Readout
          label={mobileLayout ? 'Divergencia' : 'Índice de divergencia'}
          value={divergence === null ? '—' : String(divergence)}
          compact={compact || mobileLayout}
          phoneScale={scale}
          inline={inline}
        />
      </div>
      {showUnavailableHint && divergence === null ? (
        <p
          className={`truncate text-slate-500 ${mobileLayout ? 'text-[10px] leading-snug' : 'text-[11px]'}`}
          data-sim-divergence-hint="1"
        >
          {DIVERGENCE_UNAVAILABLE_HINT}
        </p>
      ) : null}
    </div>
  )
}
