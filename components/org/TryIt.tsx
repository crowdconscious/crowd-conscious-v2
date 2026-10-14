'use client'

import { useState } from 'react'
import { SplitBar, SplitLegend, type SegmentKey } from '@/components/org/SplitBar'
import { questionStats, segmentFor } from '@/lib/org/firmness'
import { TRY_IT_BASE } from '@/lib/org/demo-data'
import { mainSentence } from '@/lib/org/headline-copy'

type Locale = 'es' | 'en'

const C = {
  es: {
    q: '¿Recomendaría este servicio a un familiar?',
    yes: 'Sí',
    no: 'No',
    how: '¿Qué tan seguro está?',
    low: 'Nada seguro',
    high: 'Totalmente seguro',
    submit: 'Ver el resultado',
    again: 'Probar otra respuesta',
    yours: 'Su respuesta está resaltada',
    fict: 'Lectura ficticia de ejemplo · no guardamos su respuesta',
    phrase: 'que recomendaría el servicio',
    pick: 'Elija sí o no',
  },
  en: {
    q: 'Would you recommend this service to a relative?',
    yes: 'Yes',
    no: 'No',
    how: 'How sure are you?',
    low: 'Not sure at all',
    high: 'Completely sure',
    submit: 'See the result',
    again: 'Try another answer',
    yours: 'Your answer is highlighted',
    fict: 'Fictitious example reading · we do not store your answer',
    phrase: 'who would recommend the service',
    pick: 'Choose yes or no',
  },
} as const

export default function TryIt({ locale }: { locale: Locale }) {
  const c = C[locale]
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null)
  const [certainty, setCertainty] = useState(6)
  const [done, setDone] = useState(false)

  const counts = { yes: [...TRY_IT_BASE.yes], no: [...TRY_IT_BASE.no] }
  if (done && answer) counts[answer][certainty - 1] += 1
  const stats = questionStats(counts)
  const hl: SegmentKey | null = answer ? segmentFor(answer, certainty) : null

  function submit() {
    if (!answer) return
    setDone(true)
    fetch('/api/organizaciones/demo/try', { method: 'POST', keepalive: true }).catch(() => {})
  }

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5 sm:p-6">
      <p className="text-lg font-semibold text-white">«{c.q}»</p>
      {!done ? (
        <div className="mt-4 space-y-5">
          <div className="flex gap-3" role="radiogroup">
            {(['yes', 'no'] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={answer === a}
                onClick={() => setAnswer(a)}
                className={`min-h-[48px] flex-1 rounded-xl border text-base font-semibold ${
                  answer === a ? 'border-emerald-300 bg-emerald-400 text-[#0f1419]' : 'border-slate-500 text-slate-100 hover:border-emerald-300'
                }`}
              >
                {a === 'yes' ? c.yes : c.no}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="flex items-baseline justify-between text-sm text-slate-200">
              {c.how} <span className="text-2xl font-bold text-white">{certainty}</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              value={certainty}
              onChange={(e) => setCertainty(Number(e.target.value))}
              className="cc-range-slider mt-2 w-full"
              aria-valuetext={`${certainty} / 10`}
            />
            <span className="mt-1 flex justify-between text-xs text-slate-300">
              <span>1 · {c.low}</span>
              <span>10 · {c.high}</span>
            </span>
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!answer}
            className="min-h-[48px] w-full rounded-xl bg-emerald-400 font-semibold text-[#0f1419] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
          >
            {answer ? c.submit : c.pick}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xl font-bold text-white">{mainSentence(stats.pctYes, stats.pctFirmOfYes, c.phrase, locale)}</p>
          <SplitBar split={stats.split} locale={locale} highlight={hl} />
          <SplitLegend locale={locale} split={stats.split} />
          <p className="text-sm text-slate-300">
            {c.yours} · {c.fict}
          </p>
          <button type="button" onClick={() => setDone(false)} className="min-h-[44px] text-sm font-semibold text-emerald-300 hover:underline">
            {c.again}
          </button>
        </div>
      )}
    </div>
  )
}
