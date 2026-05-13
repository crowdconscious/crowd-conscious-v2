'use client'

import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type Props = {
  locale: CitizenSignalsLocale
  stage: number
  cosignCount: number
}

const STAGE1 = Number(process.env.NEXT_PUBLIC_SIGNALS_STAGE1 ?? '50')
const STAGE2 = Number(process.env.NEXT_PUBLIC_SIGNALS_STAGE2 ?? '200')

export default function TimelineRail({ locale, stage, cosignCount }: Props) {
  const t = getCitizenSignalsCopy(locale)

  const toStage1 = Math.min(100, Math.round((cosignCount / STAGE1) * 100))
  const toStage2 = Math.min(
    100,
    Math.round((Math.max(cosignCount - STAGE1, 0) / Math.max(STAGE2 - STAGE1, 1)) * 100)
  )

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#11161f] p-5 text-xs">
      <p className="font-semibold uppercase tracking-wide text-slate-500">
        {locale === 'es' ? 'Línea de tiempo' : 'Timeline'}
      </p>

      <ol className="mt-3 space-y-3">
        <StageRow
          active={stage >= 0}
          done={stage > 0}
          label={t.stages.stage0.label}
          help={t.stages.stage0.help(STAGE1, STAGE2)}
          progress={stage === 0 ? toStage1 : 100}
        />
        <StageRow
          active={stage >= 1}
          done={stage > 1}
          label={t.stages.stage1.label}
          help={t.stages.stage1.help}
          progress={stage === 1 ? toStage2 : stage >= 2 ? 100 : 0}
        />
        <StageRow
          active={stage >= 2}
          done={stage >= 2}
          label={t.stages.stage2.label}
          help={t.stages.stage2.help}
          progress={stage >= 2 ? 100 : 0}
        />
      </ol>
    </div>
  )
}

function StageRow({
  active,
  done,
  label,
  help,
  progress,
}: {
  active: boolean
  done: boolean
  label: string
  help: string
  progress: number
}) {
  const dotClass = done
    ? 'bg-emerald-400 border-emerald-400'
    : active
      ? 'border-emerald-400 bg-emerald-400/20'
      : 'border-slate-600 bg-transparent'
  const textClass = active ? 'text-white' : 'text-slate-500'

  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-1 inline-flex h-3 w-3 shrink-0 rounded-full border ${dotClass}`}
        aria-hidden
      />
      <div className="flex-1">
        <p className={`font-semibold ${textClass}`}>{label}</p>
        <p className={`mt-0.5 ${active ? 'text-slate-400' : 'text-slate-600'}`}>
          {help}
        </p>
        {active && !done && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1e2531]">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
        )}
      </div>
    </li>
  )
}
