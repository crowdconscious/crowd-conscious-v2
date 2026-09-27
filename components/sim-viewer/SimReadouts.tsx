'use client'

type Props = {
  votedCount: number
  total: number
  meanConfidence: number | null
  divergence: number | null
}

function Readout({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-[5.5rem]">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 sm:text-[11px]">
        {label}
      </div>
      <div className="mt-0.5 font-semibold tabular-nums text-slate-100 text-xl sm:text-2xl">
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
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-6 sm:gap-10">
      <Readout label="Votos emitidos" value={`${votedCount}/${total}`} />
      <Readout
        label="Certeza media IA"
        value={meanConfidence === null ? '—' : meanConfidence.toFixed(1)}
      />
      <Readout
        label="Índice de divergencia"
        value={divergence === null ? '—' : String(divergence)}
      />
    </div>
  )
}
