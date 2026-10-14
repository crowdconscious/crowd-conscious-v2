import { SplitBar, SplitLegend } from '@/components/org/SplitBar'
import { FIRM_THRESHOLD } from '@/lib/org/firmness'
import { readingHeadline } from '@/lib/org/headline-copy'
import { responseRate, type ClientReading } from '@/lib/org/readings'

type Locale = 'es' | 'en'

/**
 * "Resumen para direccion": one print-ready page the buyer forwards to whoever
 * holds the budget. Headline, split bars, three numbers, one methodology line.
 */
export default function ExecutiveSummary({
  reading: r,
  orgName,
  locale,
  demo,
  expiresAt,
  preview = false,
}: {
  reading: ClientReading
  orgName: string
  locale: Locale
  demo: boolean
  expiresAt?: string | null
  /** Landing preview: on phones hide the stats row so the first bar shows above the fade. */
  preview?: boolean
}) {
  const es = locale === 'es'
  const nf = (n: number) => n.toLocaleString(es ? 'es-MX' : 'en-US')
  const qs = r.questions.map((q) => ({ ...q, label: q.text[locale] }))
  const h = readingHeadline(r.questions, locale)
  const sample =
    r.sample.mode === 'all'
      ? es
        ? 'toda la base'
        : 'the whole base'
      : es
        ? `muestra aleatoria de ${nf(r.sample.n)} sorteada por Crowd Conscious`
        : `random sample of ${nf(r.sample.n)} drawn by Crowd Conscious`
  const vis = r.visibility === 'public' ? (es ? 'pública' : 'public') : es ? 'privada' : 'private'

  return (
    <div className="mx-auto max-w-[800px] overflow-hidden bg-white px-5 py-6 sm:px-8 sm:py-8 text-slate-900 print:max-w-none print:p-0 sm:my-8 sm:rounded-xl">
      <header className="flex items-start justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Crowd Conscious · {es ? 'Resumen para dirección' : 'Executive summary'}
          </p>
          <h1 className="mt-1 break-words text-2xl font-bold">{r.title[locale]}</h1>
          <p className="text-sm text-slate-700">
            {orgName} · {r.period[locale]}
          </p>
        </div>
        {demo ? (
          <span className="shrink-0 rounded border border-amber-700 px-2 py-1 text-xs font-bold uppercase text-amber-800">
            {es ? 'Ficticio' : 'Fictitious'}
          </span>
        ) : null}
      </header>

      {h ? (
        <section className="mt-5">
          <p className="break-words text-xl font-bold leading-snug sm:text-2xl">{h.main}</p>
          {h.sub ? <p className="mt-1 break-words text-base text-slate-800">{h.sub}</p> : null}
        </section>
      ) : null}

      <section className={`mt-5 ${preview ? 'hidden' : 'grid'} grid-cols-1 gap-3 text-center sm:grid sm:grid-cols-3`}>
        {[
          [es ? 'Invitados' : 'Invited', nf(r.invited)],
          [es ? 'Respuestas' : 'Responses', nf(r.responded)],
          [es ? 'Tasa de respuesta' : 'Response rate', `${responseRate(r)}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-slate-300 p-3">
            <p className="text-xs text-slate-700">{k}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 space-y-4">
        {qs.map((q, i) => (
          <div key={q.id}>
            <div className="mb-1 flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <span className="min-w-0 break-words font-semibold">
                {es ? 'P' : 'Q'}
                {i + 1}. «{q.label}»
              </span>
              <span className="shrink-0 text-slate-800">
                {q.stats.pctYes}% {es ? 'sí' : 'yes'} · {es ? 'certeza de los «sí»' : 'certainty of «yes»'} {q.stats.yesCertainty.toFixed(1)}
              </span>
            </div>
            <SplitBar split={q.stats.split} locale={locale} height="h-8" theme="light" />
          </div>
        ))}
        <SplitLegend locale={locale} theme="light" />
      </section>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-xs leading-relaxed text-slate-700">
        {es
          ? `Metodología: ${sample}; enlaces de un solo uso; visibilidad ${vis} decidida antes de abrir; «firme» = certeza ${FIRM_THRESHOLD}-10; reportamos tasa de respuesta, no margen de error. El cliente no editó estos resultados.`
          : `Methodology: ${sample}; single-use links; ${vis} visibility decided before opening; "firm" = certainty ${FIRM_THRESHOLD}-10; we report response rate, not a margin of error. The client did not edit these results.`}
        {expiresAt ? <span className="block">{es ? `Enlace privado, vence el ${expiresAt}.` : `Private link, expires ${expiresAt}.`}</span> : null}
      </footer>
    </div>
  )
}
