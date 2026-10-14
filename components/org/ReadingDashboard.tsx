'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Download, FileText, Globe, Lock, ShieldCheck, X } from 'lucide-react'
import { CertaintyHistogram, SplitBar, SplitLegend } from '@/components/org/SplitBar'
import { FIRM_THRESHOLD, MIN_GROUP, computeHeadline, orderByFirmYes } from '@/lib/org/firmness'
import { headlineSentence } from '@/lib/org/headline-copy'
import { questionTrend, responseRate, type ClientQuestion, type ClientReading } from '@/lib/org/readings'
import { PILOT_CREDIT_WINDOW_DAYS } from '@/lib/organizaciones/pricing'

type Locale = 'es' | 'en'

const C = {
  es: {
    readings: 'Lecturas',
    status: { design: 'En diseño', field: 'En campo', closed: 'Cerrada' },
    privateL: 'Privada',
    publicL: 'Pública',
    method: 'Metodología',
    invited: 'Invitados',
    responded: 'Respuestas',
    rate: 'Tasa de respuesta',
    respondedOf: (a: string, b: string) => `Respondieron ${a} de ${b}`,
    inField: (n: string, d: number) => `En campo · ${n} respuestas · cierra en ${d} días`,
    fieldLock: 'Los resultados se abren al cierre. Nadie, incluida su organización, los ve antes.',
    designNote: 'Esta lectura está en diseño. Todavía no hay invitaciones ni respuestas.',
    pctYes: '% sí',
    avg: 'certeza de los «sí»',
    orderNote: 'Ordenadas de menor a mayor firmeza.',
    showDist: 'Ver distribución',
    hideDist: 'Ocultar distribución',
    trendDelta: (dy: number, df: number, p: string) =>
      `${dy >= 0 ? '+' : ''}${dy} pts sí · ${df >= 0 ? '+' : ''}${df} pts firme vs ${p}`,
    modified: 'Pregunta modificada: sin comparación con el periodo anterior',
    whyDoubt: 'Por qué dudan quienes dijeron que sí',
    whyNo: 'Por qué dijeron que no',
    tooSmall: `Menos de ${MIN_GROUP} respuestas en este grupo; no mostramos razones para proteger el anonimato.`,
    noReasons: 'Sin razones escritas en este grupo.',
    certainty: 'certeza',
    redacted: 'Razones redactadas automáticamente: sin nombres, teléfonos, correos, números de identificación ni detalles médicos.',
    resumen: 'Resumen para dirección',
    pdf: 'Descargar PDF',
    quarterlyTitle: 'Medir esto cada trimestre',
    quarterlyBody: 'Escucha continua: 4 lecturas al año, $14,500 MXN + IVA al mes. 20% al Fondo Consciente (antes de IVA).',
    creditUntil: (d: string) => `El 100% de su piloto se abona si contrata antes del ${d}.`,
    seeEscucha: 'Ver Escucha continua',
    ficticio: 'Ficticio',
    q: 'Pregunta',
    drawer: {
      title: 'Metodología',
      population: 'Población',
      whole: 'Toda la base del cliente.',
      sample: (n: string, b: string, d: string) => `Muestra aleatoria de ${n} IDs de ${b}, sorteada por Crowd Conscious el ${d}.`,
      links: 'Cada invitación es un enlace de un solo uso. Crowd Conscious no recibe nombres, correos ni teléfonos, solo IDs anónimos.',
      field: 'Fechas de campo',
      visibility: 'Visibilidad',
      visibilityRec: (v: string, d: string) => `${v}, decidida y registrada el ${d}, antes de abrir la consulta. No puede cambiar.`,
      wording: 'Preguntas, tal como las vieron',
      firm: `«Firme» significa certeza de ${FIRM_THRESHOLD} a 10. «Tibio», de 1 a ${FIRM_THRESHOLD - 1}.`,
      closedPop: 'Lectura de población cerrada: reportamos tasa de respuesta, no margen de error.',
      nonResponse: 'Quien no responde puede pensar distinto; por eso la tasa de respuesta acompaña cada cifra.',
      noEdit: 'El cliente no editó estos resultados.',
      close: 'Cerrar',
    },
  },
  en: {
    readings: 'Readings',
    status: { design: 'In design', field: 'In field', closed: 'Closed' },
    privateL: 'Private',
    publicL: 'Public',
    method: 'Methodology',
    invited: 'Invited',
    responded: 'Responses',
    rate: 'Response rate',
    respondedOf: (a: string, b: string) => `${a} of ${b} responded`,
    inField: (n: string, d: number) => `In field · ${n} responses · closes in ${d} days`,
    fieldLock: 'Results open at close. Nobody, including your organization, sees them before.',
    designNote: 'This reading is in design. There are no invitations or responses yet.',
    pctYes: '% yes',
    avg: 'certainty of the «yes»',
    orderNote: 'Ordered from least to most firm.',
    showDist: 'Show distribution',
    hideDist: 'Hide distribution',
    trendDelta: (dy: number, df: number, p: string) =>
      `${dy >= 0 ? '+' : ''}${dy} pts yes · ${df >= 0 ? '+' : ''}${df} pts firm vs ${p}`,
    modified: 'Question modified: no comparison with the previous period',
    whyDoubt: 'Why those who said yes hesitate',
    whyNo: 'Why they said no',
    tooSmall: `Fewer than ${MIN_GROUP} responses in this group; we do not show reasons to protect anonymity.`,
    noReasons: 'No written reasons in this group.',
    certainty: 'certainty',
    redacted: 'Reasons are redacted automatically: no names, phones, emails, ID numbers or medical details. Shown in the original Spanish.',
    resumen: 'Executive summary',
    pdf: 'Download PDF',
    quarterlyTitle: 'Measure this every quarter',
    quarterlyBody: 'Continuous listening: 4 readings a year, $14,500 MXN + VAT per month. 20% to the Conscious Fund (before VAT).',
    creditUntil: (d: string) => `100% of your pilot is credited if you sign before ${d}.`,
    seeEscucha: 'See Continuous listening',
    ficticio: 'Fictitious',
    q: 'Question',
    drawer: {
      title: 'Methodology',
      population: 'Population',
      whole: "The client's whole base.",
      sample: (n: string, b: string, d: string) => `Random sample of ${n} IDs out of ${b}, drawn by Crowd Conscious on ${d}.`,
      links: 'Every invitation is a single-use link. Crowd Conscious never receives names, emails or phone numbers, only anonymous IDs.',
      field: 'Field dates',
      visibility: 'Visibility',
      visibilityRec: (v: string, d: string) => `${v}, decided and recorded on ${d}, before the consultation opened. It cannot change.`,
      wording: 'Questions, exactly as respondents saw them',
      firm: `"Firm" means certainty ${FIRM_THRESHOLD} to 10. "Tentative" means 1 to ${FIRM_THRESHOLD - 1}.`,
      closedPop: 'Closed-population reading: we report response rate, not a margin of error.',
      nonResponse: 'People who do not answer may think differently; that is why the response rate goes with every number.',
      noEdit: 'The client did not edit these results.',
      close: 'Close',
    },
  },
} as const

function fmtDate(iso: string, locale: Locale, withTime = false) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00-06:00` : iso)
  return d.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }) + (withTime ? ' (CDMX)' : '')
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'green' | 'slate' | 'amber' }) {
  const cls =
    tone === 'green' ? 'bg-emerald-400/15 text-emerald-200' : tone === 'amber' ? 'bg-amber-400/15 text-amber-200' : 'bg-slate-400/15 text-slate-200'
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>
}

function FictLabel({ show, text }: { show: boolean; text: string }) {
  if (!show) return null
  return <span className="rounded border border-amber-300/50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200">{text}</span>
}

export default function ReadingDashboard({
  orgName,
  readings,
  defaultId,
  locale,
  demo,
  resumenHrefs,
  pdfHrefs,
  escuchaHref,
  initialDrawerOpen = false,
}: {
  orgName: string
  /** Already passed through toClientReading on the server. */
  readings: ClientReading[]
  defaultId: string
  locale: Locale
  demo: boolean
  /** Per closed reading id, built on the server (share links are per reading). */
  resumenHrefs: Record<string, string>
  pdfHrefs: Record<string, string>
  escuchaHref: string
  /** Deep link `?metodologia=1` opens the methodology drawer. */
  initialDrawerOpen?: boolean
}) {
  const c = C[locale]
  const [selectedId, setSelectedId] = useState(defaultId)
  const [drawer, setDrawer] = useState(initialDrawerOpen)
  const [dist, setDist] = useState<Record<string, boolean>>({})
  const nf = (n: number) => n.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')
  const idx = Math.max(0, readings.findIndex((r) => r.id === selectedId))
  const r = readings[idx]
  const earlier = useMemo(() => readings.slice(idx + 1).find((x) => x.status === 'closed') ?? null, [readings, idx])

  const qs = r.questions.map((q) => ({ ...q, label: q.text[locale] }))
  const headline = headlineSentence(computeHeadline(qs.map((q) => ({ text: q.label, stats: q.stats }))), locale)
  const ordered = orderByFirmYes(qs)
  const rate = responseRate(r)
  const visLabel = r.visibility === 'public' ? c.publicL : c.privateL
  const creditEnd = new Date(new Date(`${r.fieldCloses}T12:00:00-06:00`).getTime() + PILOT_CREDIT_WINDOW_DAYS * 86400000)
  const showQuarterly = r.status === 'closed' && (r.product === 'pilot' || r.product === 'annual')
  const creditActive = r.product === 'pilot' && creditEnd.getTime() > Date.now()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <label htmlFor="reading-select" className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-300">
            {c.readings}
          </label>
          {/* Phones: a native select (never wider than the screen). Desktop: the list. */}
          <select
            id="reading-select"
            value={r.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="block w-full min-h-[48px] rounded-xl border border-[#2d3748] px-3 text-sm text-white lg:hidden"
          >
            {readings.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title[locale]} · {x.period[locale]} · {x.status === 'field' ? c.inField(nf(x.responded), x.closesInDays ?? 0) : c.status[x.status]}
              </option>
            ))}
          </select>
          <ul className="hidden space-y-2 lg:block">
            {readings.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(x.id)}
                  aria-current={x.id === r.id}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    x.id === r.id ? 'border-emerald-400/70 bg-emerald-400/10' : 'border-[#2d3748] bg-[#1a2029] hover:border-slate-400'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{x.title[locale]}</p>
                  <p className="mt-0.5 text-xs text-slate-300">
                    {x.period[locale]} · {x.visibility === 'public' ? c.publicL : c.privateL}
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    {x.status === 'field' ? c.inField(nf(x.responded), x.closesInDays ?? 0) : c.status[x.status]}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="min-w-0 space-y-5">
          {/* 1. Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-slate-300">{orgName}</p>
              <h1 className="break-words text-2xl font-bold text-white">{r.title[locale]}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-300">{r.period[locale]}</span>
                <Badge tone={r.status === 'closed' ? 'slate' : 'amber'}>{c.status[r.status]}</Badge>
                <Badge tone={r.visibility === 'public' ? 'green' : 'slate'}>
                  {r.visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {visLabel}
                </Badge>
                <FictLabel show={demo} text={c.ficticio} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-2 self-start rounded-lg border border-slate-500 px-4 text-sm font-semibold text-slate-100 hover:border-emerald-400"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> {c.method}
            </button>
          </div>

          {/* 2. Headline */}
          {r.status === 'closed' && headline ? (
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/[0.07] p-5 sm:p-6">
              <p className="break-words text-xl font-bold leading-snug text-white sm:text-3xl">{headline.main}</p>
              {headline.sub ? <p className="mt-2 break-words text-base text-slate-200">{headline.sub}</p> : null}
            </div>
          ) : null}

          {/* 3. Three numbers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              [c.invited, nf(r.invited)],
              [c.responded, nf(r.responded)],
              [c.rate, `${rate}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-3 sm:p-4">
                <p className="text-xs text-slate-300">{k}</p>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className="h-full bg-emerald-400" style={{ width: `${rate}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-300">{c.respondedOf(nf(r.responded), nf(r.invited))}</p>
          </div>

          {r.status === 'field' ? (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-300/[0.07] p-5 text-base text-amber-100">
              <p className="font-semibold">{c.inField(nf(r.responded), r.closesInDays ?? 0)}</p>
              <p className="mt-1">{c.fieldLock}</p>
            </div>
          ) : r.status === 'design' ? (
            <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5 text-slate-200">{c.designNote}</div>
          ) : null}

          {/* 4. Question cards, lowest firm-of-yes first; original numbers kept */}
          {ordered.length && r.status === 'closed' ? <p className="text-sm text-slate-300">{c.orderNote}</p> : null}
          {ordered.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={r.questions.findIndex((x) => x.id === q.id)}
              earlier={earlier}
              locale={locale}
              demo={demo}
              showDist={!!dist[q.id]}
              toggleDist={() => setDist((p) => ({ ...p, [q.id]: !p[q.id] }))}
            />
          ))}

          {/* 7. Actions */}
          {r.status === 'closed' && resumenHrefs[r.id] ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={resumenHrefs[r.id]}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-[#0f1419] hover:bg-emerald-300"
              >
                <FileText className="h-4 w-4" /> {c.resumen}
              </Link>
              {pdfHrefs[r.id] ? (
              <a
                href={pdfHrefs[r.id]}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-500 px-5 text-sm font-semibold text-slate-100 hover:border-emerald-400"
              >
                <Download className="h-4 w-4" /> {c.pdf}
              </a>
              ) : null}
            </div>
          ) : null}

          {showQuarterly ? (
            <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
              <p className="font-semibold text-white">{c.quarterlyTitle}</p>
              <p className="mt-1 text-sm text-slate-300">{c.quarterlyBody}</p>
              {creditActive ? <p className="mt-1 text-sm text-emerald-200">{c.creditUntil(fmtDate(creditEnd.toISOString(), locale))}</p> : null}
              <Link href={escuchaHref} className="mt-3 inline-block text-sm font-semibold text-emerald-300 hover:underline">
                {c.seeEscucha} →
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      {/* 6. Methodology drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={c.drawer.title} onClick={() => setDrawer(false)}>
          <div className="h-full w-full max-w-md overflow-y-auto border-l border-[#2d3748] bg-[#141a21] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{c.drawer.title}</h2>
              <button type="button" onClick={() => setDrawer(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10" aria-label={c.drawer.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {demo ? <p className="mt-2 text-sm text-amber-200">{locale === 'es' ? 'Demo · datos ficticios' : 'Demo · fictitious data'}</p> : null}
            <dl className="mt-5 space-y-5 text-sm leading-relaxed text-slate-200">
              <div>
                <dt className="font-semibold text-white">{c.drawer.population}</dt>
                <dd className="mt-1">
                  {r.sample.mode === 'all' ? c.drawer.whole : c.drawer.sample(nf(r.sample.n), nf(r.sample.base), fmtDate(r.sample.drawnAt, locale))}
                </dd>
                <dd className="mt-1">{c.drawer.links}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">{c.drawer.field}</dt>
                <dd className="mt-1">
                  {fmtDate(r.fieldOpens, locale)} – {fmtDate(r.fieldCloses, locale)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-white">{c.drawer.visibility}</dt>
                <dd className="mt-1">{c.drawer.visibilityRec(visLabel, fmtDate(r.visibilityLockedAt, locale, true))}</dd>
              </div>
              {r.questions.length ? (
                <div>
                  <dt className="font-semibold text-white">{c.drawer.wording}</dt>
                  <dd className="mt-1">
                    <ol className="list-decimal space-y-1 pl-5">
                      {r.questions.map((q) => (
                        <li key={q.id}>«{q.text.es}»</li>
                      ))}
                    </ol>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-white">{locale === 'es' ? 'Certeza' : 'Certainty'}</dt>
                <dd className="mt-1">{c.drawer.firm}</dd>
              </div>
              <div>
                <dd>{c.drawer.closedPop}</dd>
                <dd className="mt-1">{c.drawer.nonResponse}</dd>
                <dd className="mt-3 font-semibold text-emerald-200">{c.drawer.noEdit}</dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function QuestionCard({
  q,
  index,
  earlier,
  locale,
  demo,
  showDist,
  toggleDist,
}: {
  q: ClientQuestion & { label: string }
  index: number
  earlier: ClientReading | null
  locale: Locale
  demo: boolean
  showDist: boolean
  toggleDist: () => void
}) {
  const c = C[locale]
  const s = q.stats
  const trend = questionTrend(q, index, earlier)
  const doubt = q.reasons.doubt
  const no = q.reasons.no

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-300">
            {c.q} {index + 1}
          </p>
          <h3 className="mt-1 break-words text-lg font-semibold text-white">«{q.label}»</h3>
        </div>
        <FictLabel show={demo} text={c.ficticio} />
      </div>

      <div className="mt-4 grid gap-4 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_170px] md:items-center">
        <div className="space-y-2">
          <SplitBar split={s.split} locale={locale} />
          <SplitLegend locale={locale} split={s.split} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 md:block md:space-y-2 md:text-right">
          <p>
            <span className="text-2xl font-bold text-white">{s.pctYes}%</span> <span className="text-sm text-slate-300">{c.pctYes}</span>
          </p>
          <p>
            <span className="text-2xl font-bold text-emerald-300">{s.yesCertainty.toFixed(1)}</span>{' '}
            <span className="text-sm text-slate-300">{c.avg}</span>
          </p>
        </div>
      </div>

      {trend.kind === 'delta' ? (
        <p className="mt-3 text-sm text-slate-200">{c.trendDelta(trend.dYes, trend.dFirmYes, trend.prevPeriod[locale])}</p>
      ) : trend.kind === 'modified' ? (
        <p className="mt-3 text-sm text-slate-300">{c.modified}</p>
      ) : null}

      <button type="button" onClick={toggleDist} className="mt-3 inline-flex min-h-[40px] items-center gap-2 text-sm font-semibold text-emerald-300 hover:underline" aria-expanded={showDist}>
        <BarChart3 className="h-4 w-4" /> {showDist ? c.hideDist : c.showDist}
      </button>
      {showDist ? (
        <div className="mt-2">
          <CertaintyHistogram yes={q.counts.yes} no={q.counts.no} locale={locale} />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {[
          { title: c.whyDoubt, g: doubt },
          { title: c.whyNo, g: no },
        ].map(({ title, g }) => (
          <div key={title} className="min-w-0 rounded-xl bg-[#0f1419] p-4">
            <p className="text-sm font-semibold text-white">{title}</p>
            {g.hidden ? (
              <p className="mt-2 text-sm text-slate-300">{c.tooSmall}</p>
            ) : g.reasons.length === 0 ? (
              <p className="mt-2 text-sm text-slate-300">{c.noReasons}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {g.reasons.map((x, i) => (
                  <li key={i} className="break-words text-sm text-slate-200">
                    «{x.text}» <span className="whitespace-nowrap text-xs text-slate-300">· {c.certainty} {x.certainty}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-300">{c.redacted}</p>
    </article>
  )
}
