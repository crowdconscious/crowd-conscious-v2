'use client'

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
      <div className="flex min-w-0 items-baseline gap-1.5 sm:gap-2">
        <span
          className={`shrink-0 uppercase tracking-wide text-slate-500 ${
            phoneScale ? 'text-xs' : 'text-[9px] sm:text-[10px]'
          }`}
        >
          {label}
        </span>
        <span
          className={`font-semibold tabular-nums text-slate-100 ${
            phoneScale ? 'text-xl' : 'text-base sm:text-lg'
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
}: Props) {
  return (
    <div
      className={
        singleRow
          ? 'flex flex-nowrap items-baseline justify-between gap-3 overflow-hidden'
          : `flex flex-wrap items-end ${compact ? 'gap-4 sm:gap-6' : 'gap-6 sm:gap-10'}`
      }
    >
      <Readout
        label="Votos emitidos"
        value={`${votedCount}/${total}`}
        compact={compact}
        phoneScale={phoneScale}
        inline={singleRow}
      />
      <Readout
        label="Certeza media IA"
        value={meanConfidence === null ? '—' : meanConfidence.toFixed(1)}
        compact={compact}
        phoneScale={phoneScale}
        inline={singleRow}
      />
      <Readout
        label="Índice de divergencia"
        value={divergence === null ? '—' : String(divergence)}
        compact={compact}
        phoneScale={phoneScale}
        inline={singleRow}
      />
    </div>
  )
}
