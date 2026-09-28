'use client'

type Props = {
  votedCount: number
  total: number
  meanConfidence: number | null
  divergence: number | null
  compact?: boolean
}

function Readout({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="min-w-[4.5rem]">
      <div
        className={`uppercase tracking-wide text-slate-500 ${
          compact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 font-semibold tabular-nums text-slate-100 ${
          compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
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
}: Props) {
  return (
    <div className={`flex flex-wrap items-end ${compact ? 'gap-4 sm:gap-6' : 'gap-6 sm:gap-10'}`}>
      <Readout
        label="Votos emitidos"
        value={`${votedCount}/${total}`}
        compact={compact}
      />
      <Readout
        label="Certeza media IA"
        value={meanConfidence === null ? '—' : meanConfidence.toFixed(1)}
        compact={compact}
      />
      <Readout
        label="Índice de divergencia"
        value={divergence === null ? '—' : String(divergence)}
        compact={compact}
      />
    </div>
  )
}
