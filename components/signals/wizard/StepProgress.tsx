'use client'

import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

type Props = {
  locale: CitizenSignalsLocale
  steps: ReadonlyArray<string>
  currentStep: number
  onJumpTo?: (idx: number) => void
}

/**
 * Accessible wizard step indicator. Uses an ordered list with
 * `aria-current="step"` on the active item and an `aria-live="polite"`
 * status line so screen readers announce step transitions without
 * stealing focus.
 *
 * Visited steps remain clickable so the user can jump back; future
 * steps are disabled until the user advances normally (we want zod
 * validation to gate forward motion).
 */
export default function StepProgress({
  locale,
  steps,
  currentStep,
  onJumpTo,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const total = steps.length

  return (
    <div className="space-y-2">
      <p className="sr-only" aria-live="polite">
        {t.compose.wizard.stepLabel(currentStep + 1, total)} —{' '}
        {steps[currentStep]}
      </p>
      <ol
        aria-label={locale === 'es' ? 'Pasos del asistente' : 'Wizard steps'}
        className="flex flex-wrap items-center gap-2 text-xs sm:gap-3"
      >
        {steps.map((label, idx) => {
          const isActive = idx === currentStep
          const isVisited = idx < currentStep
          const interactive = isVisited && !!onJumpTo
          return (
            <li
              key={label}
              aria-current={isActive ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onJumpTo(idx)}
                className={`flex items-center gap-2 rounded-full border px-2.5 py-1 transition-colors ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                    : isVisited
                      ? 'border-slate-500 bg-slate-500/10 text-slate-200 hover:border-emerald-400/60'
                      : 'border-[#2d3748] text-slate-500'
                } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : isVisited
                        ? 'bg-slate-500 text-white'
                        : 'bg-[#1a212d] text-slate-500'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {idx < total - 1 && (
                <span
                  aria-hidden="true"
                  className={`hidden h-px w-4 sm:block ${
                    idx < currentStep ? 'bg-slate-500' : 'bg-[#2d3748]'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-slate-500 sm:hidden">
        {t.compose.wizard.stepLabel(currentStep + 1, total)} ·{' '}
        <span className="text-slate-300">{steps[currentStep]}</span>
      </p>
    </div>
  )
}
