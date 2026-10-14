import { CertaintyHistogram, SplitBar, SplitLegend } from '@/components/org/SplitBar'
import type { ClientReading } from '@/lib/org/readings'
import type { ReasonGroup } from '@/lib/org/redact'
import { buildReportContent } from '@/lib/org/report-content'

/**
 * Responsive web version of the full report (directors open it on a phone).
 * Same words as the PDF (report-content.ts). Single column under 640px;
 * every container is min-w-0 so nothing overflows at 360px.
 */
export default function WebReport({
  reading,
  earlier,
  orgName,
  locale,
  demo,
  pdfHref,
}: {
  reading: ClientReading
  earlier: ClientReading | null
  orgName: string
  locale: 'es' | 'en'
  demo: boolean
  pdfHref: string
}) {
  const k = buildReportContent(reading, orgName, locale, earlier)
  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">{children}</p>
  )
  const Group = ({ title, g }: { title: string; g: ReasonGroup }) => (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{title}</p>
      {g.hidden ? (
        <p className="mt-2 text-sm italic text-slate-300">{k.hiddenNote(g.groupSize)}</p>
      ) : g.reasons.length ? (
        <ul className="mt-2 space-y-3">
          {g.reasons.map((r, i) => (
            <li key={i} className="border-l-2 border-emerald-400 pl-3">
              <p className="break-words italic text-slate-100">“{r.text}”</p>
              <p className="text-xs text-slate-300">{k.labels.certainty(r.certainty)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm italic text-slate-300">{k.labels.noneLeft}</p>
      )}
    </div>
  )

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 text-slate-100" lang={locale}>
      {demo ? <p className="mt-4 text-center text-xs font-semibold uppercase tracking-wider text-amber-200">{k.labels.demo}</p> : null}

      <header className="mt-6 rounded-3xl bg-[#0b1016] p-6 sm:p-10">
        <Eyebrow>{k.cover.eyebrow}</Eyebrow>
        <h1 className="mt-4 break-words text-3xl font-bold leading-tight text-white sm:text-5xl">{k.cover.title}</h1>
        <p className="mt-4 text-lg text-slate-200">{k.cover.sub}</p>
        {k.cover.dates ? <p className="mt-2 text-sm text-slate-300">{k.cover.dates}</p> : null}
        <a href={pdfHref} className="mt-6 inline-flex min-h-[48px] items-center rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#0f1419] hover:bg-emerald-300">
          {locale === 'es' ? 'Descargar PDF' : 'Download PDF'}
        </a>
      </header>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-white">{k.letter.title}</h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-200">
          {k.letter.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p>
            {k.letter.signoff}
            <br />
            <strong className="text-white">{k.letter.signature}</strong>
          </p>
        </div>
      </section>

      <section className="mt-12">
        <Eyebrow>{k.glanceLabel}</Eyebrow>
        {k.head ? (
          <>
            <p className="mt-3 break-words text-2xl font-bold leading-snug text-white sm:text-3xl">{k.head.main}</p>
            {k.head.sub ? <p className="mt-2 text-base text-slate-200">{k.head.sub}</p> : null}
          </>
        ) : null}
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {k.tiles.map((t) => (
            <div key={t.l} className="min-w-0">
              <dt className="sr-only">{t.l}</dt>
              <dd className="text-3xl font-bold text-white">{t.v}</dd>
              <dd aria-hidden className="text-xs text-slate-300">{t.l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-slate-300">{k.eachQ}</p>
        <div className="mt-3 space-y-5">
          {k.ordered.map((q) => (
            <div key={q.id} className="min-w-0">
              <SplitBar split={q.stats.split} locale={locale} height="h-8" label={`${k.numLabel(q)}. «${q.text[locale]}» · ${k.qLine(q)}`} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <SplitLegend locale={locale} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {k.insights.map((b) => (
            <div key={b.t} className="rounded-2xl border border-[#2d3748] border-l-4 border-l-emerald-400 bg-[#1a2029] p-4">
              <p className="font-semibold text-white">{b.t}</p>
              <p className="mt-1 text-sm text-slate-200">{b.b}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-300">{k.caveat}</p>
      </section>

      {k.deepDives.map((d) => (
        <section key={d.q.id} className="mt-14 border-t border-[#2d3748] pt-10">
          <Eyebrow>{d.eyebrow}</Eyebrow>
          <h2 className="mt-3 break-words text-2xl font-bold text-white">{d.title}</h2>
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {d.tiles.map((t) => (
              <div key={t.l} className="min-w-0">
                <dt className="sr-only">{t.l}</dt>
                <dd className="text-3xl font-bold text-white">{t.v}</dd>
                <dd aria-hidden className="text-xs text-slate-300">{t.l}</dd>
              </div>
            ))}
          </dl>
          {d.preliminary ? (
            <div className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-300/10 p-4">
              <p className="font-semibold text-amber-100">{d.preliminary.t}</p>
              <p className="mt-1 text-sm text-amber-50">{d.preliminary.b}</p>
            </div>
          ) : d.headline ? (
            <p className="mt-5 break-words text-xl font-bold leading-snug text-white">{d.headline}</p>
          ) : null}
          <div className="mt-5">
            <SplitBar split={d.q.stats.split} locale={locale} height="h-10" label={k.labels.fourGroups} />
            <div className="mt-2">
              <SplitLegend locale={locale} split={d.q.stats.split} />
            </div>
          </div>
          <div className="mt-6">
            <p className="font-semibold text-white">{k.labels.howSure}</p>
            <p className="text-xs text-slate-300">{k.labels.howSureSub}</p>
            <div className="mt-2">
              <CertaintyHistogram yes={d.q.counts.yes} no={d.q.counts.no} locale={locale} />
            </div>
          </div>
          <h3 className="mt-6 font-semibold text-white">{k.labels.seen}</h3>
          <div className="mt-2 space-y-2 text-base text-slate-200">
            {d.seen.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 sm:p-6">
            <h3 className="text-lg font-bold text-white">{k.labels.wordsTitle}</h3>
            <p className="mt-1 text-xs text-slate-300">{d.wordsIntro}</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <Group title={d.doubtTitle} g={d.q.reasons.doubt} />
              <Group title={d.noTitle} g={d.q.reasons.no} />
            </div>
            <p className="mt-4 text-xs text-slate-300">{k.labels.wordsFoot}</p>
          </div>
        </section>
      ))}

      <section className="mt-14 border-t border-[#2d3748] pt-10">
        <Eyebrow>{k.labels.talkEyebrow}</Eyebrow>
        <h2 className="mt-3 text-2xl font-bold text-white">{k.labels.talkTitle}</h2>
        <p className="mt-1 text-sm text-slate-300">{k.labels.talkSub}</p>
        <ol className="mt-5 space-y-4">
          {k.talk.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#0f1419]">{i + 1}</span>
              <div className="min-w-0">
                <p className="break-words font-semibold text-white">{t.t}</p>
                <p className="text-slate-200">{t.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 border-t border-[#2d3748] pt-10">
        <Eyebrow>{k.labels.methodEyebrow}</Eyebrow>
        <h2 className="mt-3 text-2xl font-bold text-white">{k.labels.methodTitle}</h2>
        <dl className="mt-5 space-y-4 rounded-2xl bg-[#0b1016] p-5">
          {k.method.map((m) => (
            <div key={m.t} className="sm:grid sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
              <dt className="font-semibold text-white">{m.t}</dt>
              <dd className="text-sm text-slate-200">{m.b}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-8 font-semibold text-white">{k.labels.tableTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-slate-300">
              <tr>{k.labels.tableCols.map((c) => <th key={c} className="py-2 pr-3 font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody className="text-slate-100">
              {reading.questions.map((q) => (
                <tr key={q.id} className="border-t border-[#2d3748]">
                  <td className="py-2 pr-3">{k.numLabel(q)}. {q.text[locale]}</td>
                  <td className="pr-3">{q.stats.responses}</td>
                  <td className="pr-3">{q.stats.pctYes}%</td>
                  <td className="pr-3">{q.stats.pctFirmOfYes}%</td>
                  <td className="pr-3">{q.stats.yesCertainty.toFixed(1)}</td>
                  <td>{q.stats.split.firmNo}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-14 rounded-3xl bg-[#0b1016] p-6 sm:p-10">
        <Eyebrow>{k.about.eyebrow}</Eyebrow>
        <p className="mt-3 text-2xl font-bold text-white">{k.about.title}</p>
        <p className="mt-3 text-slate-200">{k.about.body}</p>
        <p className="mt-4 font-semibold text-emerald-300">{k.about.url}</p>
      </footer>
    </article>
  )
}
