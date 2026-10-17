/**
 * Contraste IA for org readings: AI yes/no prediction (locked before the
 * field opened) vs what the client's people said. Presentational only.
 * Rendered ONLY in member surfaces for CLOSED readings (dashboard + web report);
 * the survey and share links never get the data (lib/org/readings withoutContraste).
 *
 * Contrast: grey text is slate-300 (#cbd5e1) on #1a2029 / #0f1419 (≥ 10:1);
 * the violet/emerald labels are -200/-300 shades (≥ 7:1). Bars stack on phones.
 */
import { fmtLockedAt, orgGap, orgGapLine, orgProvenance, ORG_EXPLAINER, type QuestionContraste } from '@/lib/contraste-ia/org-core'

type Locale = 'es' | 'en'
type Q = { id: string; text: { es: string; en: string }; stats: { pctYes: number; responses: number }; contraste?: QuestionContraste | null }

const T = {
  es: { eyebrow: 'Contraste IA', ai: 'IA (antes de abrir)', people: 'Su gente', pts: 'pts', none: 'Esta lectura se abrió sin una predicción de IA bloqueada, así que no hay contraste que mostrar. Lo decimos abiertamente en lugar de calcularla después de conocer las respuestas.', title: 'Lo que la IA esperaba vs lo que dijo su gente', late: 'tardía', q: 'Pregunta' },
  en: { eyebrow: 'AI Contrast', ai: 'AI (before opening)', people: 'Your people', pts: 'pts', none: 'This reading opened without a locked AI prediction, so there is no contrast to show. We say so openly rather than computing one after seeing the answers.', title: 'What the AI expected vs what your people said', late: 'late', q: 'Question' },
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: 'ai' | 'people' }) {
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem] items-center gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_3rem]">
      <span className={`truncate text-xs font-medium ${tone === 'ai' ? 'text-violet-200' : 'text-emerald-200'}`}>{label}</span>
      <div className="h-3 overflow-hidden rounded bg-white/10" aria-hidden>
        <div className={`h-3 rounded ${tone === 'ai' ? 'bg-violet-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <span className="text-right text-sm font-semibold tabular-nums text-white">{pct}%</span>
    </div>
  )
}

/** Compact block for one question (dashboard card and report). */
export function ContrasteRow({ q, locale }: { q: Q; locale: Locale }) {
  const c = q.contraste
  if (!c) return null
  const t = T[locale]
  const ai = Math.round(c.aiYes * 100)
  const gap = orgGap(c.aiYes, q.stats.pctYes)
  return (
    <div className="mt-4 min-w-0 rounded-xl border border-violet-300/25 bg-[#0f1419] p-3 sm:p-4" aria-label={`${t.eyebrow}: ${orgGapLine(c.aiYes, q.stats.pctYes, locale)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-200">
          {t.eyebrow}
          {c.status === 'late' ? <span className="ml-2 rounded bg-amber-300/15 px-1.5 py-0.5 normal-case tracking-normal text-amber-100">{t.late}</span> : null}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${Math.abs(gap) >= 10 ? 'bg-amber-300/15 text-amber-100' : 'bg-white/10 text-slate-100'}`}>
          {gap > 0 ? '+' : ''}
          {gap} {t.pts}
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        <Bar label={`${t.ai} ±${Math.round(c.spread * 100)}`} pct={ai} tone="ai" />
        <Bar label={t.people} pct={q.stats.pctYes} tone="people" />
      </div>
      <p className="mt-2 break-words text-sm text-slate-100">{orgGapLine(c.aiYes, q.stats.pctYes, locale)}</p>
      <p className="mt-1 break-words text-xs leading-relaxed text-slate-300">{orgProvenance(c, locale, (iso) => fmtLockedAt(iso, locale))}</p>
    </div>
  )
}

export function ContrasteExplainer({ locale }: { locale: Locale }) {
  const e = ORG_EXPLAINER[locale]
  return (
    <div className="rounded-xl border border-violet-300/25 bg-violet-400/[0.07] p-4">
      <p className="font-semibold text-white">{e.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-200">{e.body}</p>
    </div>
  )
}

/** Full section for the web report: explainer + one row per question (or the honest "no lock" note). */
export function ContrasteSection({ questions, locale }: { questions: Q[]; locale: Locale }) {
  const t = T[locale]
  const any = questions.some((q) => q.contraste)
  return (
    <section className="mt-14 border-t border-[#2d3748] pt-10" aria-labelledby="contraste-ia-title">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">{t.eyebrow}</p>
      <h2 id="contraste-ia-title" className="mt-3 break-words text-2xl font-bold text-white">{t.title}</h2>
      {any ? (
        <>
          <div className="mt-5">
            <ContrasteExplainer locale={locale} />
          </div>
          {questions.map((q, i) =>
            q.contraste ? (
              <div key={q.id} className="mt-6">
                <p className="text-xs font-semibold text-slate-300">
                  {t.q} {i + 1}
                </p>
                <p className="mt-1 break-words font-semibold text-white">«{q.text[locale]}»</p>
                <ContrasteRow q={q} locale={locale} />
              </div>
            ) : null,
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-300">{t.none}</p>
      )}
    </section>
  )
}
