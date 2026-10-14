'use client'

import { useState } from 'react'

type A = { answer: boolean | null; certainty: number | null; reason: string }

const T = {
  es: {
    intro: 'Responda sí o no y diga qué tan seguro está, de 1 (nada) a 10 (totalmente). Es anónimo: no pedimos nombre, correo ni teléfono.',
    yes: 'Sí', no: 'No', cert: '¿Qué tan seguro está?', reason: '¿Por qué? (opcional, no escriba nombres ni datos personales)',
    send: 'Enviar respuestas', sending: 'Enviando…', done: 'Gracias. Su respuesta quedó registrada de forma anónima.',
    missing: 'Responda todas las preguntas y su certeza.', already: 'Ya respondió esta consulta desde este navegador.', closed: 'Esta consulta ya cerró.', error: 'No pudimos enviar. Intente de nuevo.',
  },
  en: {
    intro: 'Answer yes or no and say how sure you are, from 1 (not at all) to 10 (completely). Anonymous: we ask for no name, email or phone.',
    yes: 'Yes', no: 'No', cert: 'How sure are you?', reason: 'Why? (optional; no names or personal details)',
    send: 'Send answers', sending: 'Sending…', done: 'Thank you. Your answer was recorded anonymously.',
    missing: 'Answer every question and its certainty.', already: 'You already answered from this browser.', closed: 'This survey is closed.', error: 'Could not send. Please try again.',
  },
}

export default function SurveyForm({ token, locale, questions }: { token: string; locale: 'es' | 'en'; questions: { id: string; text: string }[] }) {
  const t = T[locale]
  const [a, setA] = useState<Record<string, A>>(Object.fromEntries(questions.map((q) => [q.id, { answer: null, certainty: null, reason: '' }])))
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const set = (id: string, p: Partial<A>) => setA((s) => ({ ...s, [id]: { ...s[id], ...p } }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (questions.some((q) => a[q.id].answer === null || a[q.id].certainty === null)) return setErr(t.missing)
    setErr(null)
    setState('sending')
    const res = await fetch(`/api/org/encuesta/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: questions.map((q) => ({ question_id: q.id, answer: a[q.id].answer, certainty: a[q.id].certainty, reason: a[q.id].reason || undefined })) }),
    })
    if (res.ok) return setState('done')
    const j = await res.json().catch(() => ({}))
    setState('idle')
    setErr(j.error === 'already_answered' ? t.already : j.error === 'closed' ? t.closed : t.error)
  }

  if (state === 'done') return <p className="mt-6 rounded-xl border border-emerald-400/50 bg-emerald-400/10 p-4 text-emerald-100" role="status">{t.done}</p>

  return (
    <form onSubmit={submit} className="mt-4 space-y-6">
      <p className="text-sm text-slate-300">{t.intro}</p>
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4">
          <legend className="sr-only">{q.text}</legend>
          <p className="text-base font-semibold text-white">{i + 1}. {q.text}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} type="button" aria-pressed={a[q.id].answer === v} onClick={() => set(q.id, { answer: v })}
                className={`min-h-[48px] rounded-xl border text-base font-semibold ${a[q.id].answer === v ? 'border-emerald-300 bg-emerald-400 text-[#0f1419]' : 'border-slate-500 text-slate-100'}`}>
                {v ? t.yes : t.no}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-300">{t.cert}</p>
          <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10" role="group" aria-label={t.cert}>
            {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => (
              <button key={n} type="button" aria-pressed={a[q.id].certainty === n} onClick={() => set(q.id, { certainty: n })}
                className={`min-h-[44px] rounded-lg border text-sm font-semibold ${a[q.id].certainty === n ? 'border-emerald-300 bg-emerald-400 text-[#0f1419]' : 'border-slate-600 text-slate-100'}`}>
                {n}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-sm text-slate-300">
            {t.reason}
            <textarea value={a[q.id].reason} onChange={(e) => set(q.id, { reason: e.target.value.slice(0, 1000) })} rows={2}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-[#0f1419] p-2 text-slate-100" />
          </label>
        </fieldset>
      ))}
      {err ? <p className="text-sm text-amber-200" role="alert">{err}</p> : null}
      <button type="submit" disabled={state === 'sending'} className="min-h-[48px] w-full rounded-xl bg-emerald-400 font-semibold text-[#0f1419] disabled:opacity-60">
        {state === 'sending' ? t.sending : t.send}
      </button>
    </form>
  )
}
