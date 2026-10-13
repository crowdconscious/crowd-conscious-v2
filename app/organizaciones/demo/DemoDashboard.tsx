'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Download, Eye, Lock, Globe } from 'lucide-react'
import {
  DEMO_ORG,
  DEMO_READINGS,
  DEMO_SELLO_READING_ID,
  DEMO_WATERMARK,
  responseRate,
  type DemoLocale,
  type DemoReading,
} from '@/lib/organizaciones/demo-data'

const card = 'rounded-2xl border border-[#2d3748] bg-[#1a2029]'

const COPY = {
  es: {
    title: 'Tablero de cliente',
    readings: 'Lecturas',
    dashboard: 'Tablero',
    sello: 'Vista del Sello público',
    invited: 'Invitados',
    responded: 'Respuestas',
    rate: 'Tasa de respuesta',
    privateL: 'Privada',
    publicL: 'Pública',
    lockedOn: 'Visibilidad decidida y registrada el',
    sampleAll: 'Toda la base',
    sampleRandom: 'Muestra aleatoria sorteada por Crowd Conscious',
    openNote:
      'Consulta abierta: mientras está abierta, usted solo ve invitados, respuestas y la tasa de respuesta. Los resultados aparecen al cerrar.',
    yes: 'dijo que sí',
    avg: 'certeza promedio',
    dist: 'Distribución de certeza (1-10)',
    pdf: 'Descargar PDF de muestra',
    back: 'Volver a organizaciones',
    cta: 'Contratar piloto',
    badge: 'Calificado por sus usuarios',
    selloLatest: 'Última lectura publicada',
    selloNote:
      'Publicamos la última lectura, buena o mala. Si la organización retira el Sello, esta página lo indica públicamente.',
    selloUrl: 'crowdconscious.app/sello/',
    responses: 'respuestas',
  },
  en: {
    title: 'Client dashboard',
    readings: 'Readings',
    dashboard: 'Dashboard',
    sello: 'Public Seal preview',
    invited: 'Invited',
    responded: 'Responses',
    rate: 'Response rate',
    privateL: 'Private',
    publicL: 'Public',
    lockedOn: 'Visibility decided and recorded on',
    sampleAll: 'Whole base',
    sampleRandom: 'Random sample drawn by Crowd Conscious',
    openNote:
      'Consultation open: while it is open you only see invitees, responses and the response rate. Results appear when it closes.',
    yes: 'said yes',
    avg: 'average certainty',
    dist: 'Certainty distribution (1-10)',
    pdf: 'Download sample PDF',
    back: 'Back to organizations',
    cta: 'Buy the pilot',
    badge: 'Rated by its users',
    selloLatest: 'Latest published reading',
    selloNote:
      'We publish the latest reading, good or bad. If the organization withdraws the Seal, this page says so publicly.',
    selloUrl: 'crowdconscious.app/sello/',
    responses: 'responses',
  },
} as const

function Watermark({ locale }: { locale: DemoLocale }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
      <p className="-rotate-[24deg] select-none whitespace-nowrap text-6xl font-black uppercase tracking-widest text-white/[0.04] sm:text-8xl">
        {DEMO_WATERMARK[locale]}
      </p>
    </div>
  )
}

function Distribution({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex h-24 items-end gap-1">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`w-full rounded-t ${i >= 7 ? 'bg-emerald-400' : i >= 4 ? 'bg-emerald-400/60' : 'bg-amber-400/70'}`}
            style={{ height: `${(v / max) * 80}px` }}
            title={`${i + 1}: ${v}`}
          />
          <span className="text-[10px] text-slate-500">{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

function Visibility({ r, locale }: { r: DemoReading; locale: DemoLocale }) {
  const c = COPY[locale]
  const pub = r.visibility === 'public'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        pub ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/20 text-slate-300'
      }`}
    >
      {pub ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {pub ? c.publicL : c.privateL}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export default function DemoDashboard({ locale, initialView = 'dashboard' }: { locale: DemoLocale; initialView?: 'dashboard' | 'sello' }) {
  const c = COPY[locale]
  const [selectedId, setSelectedId] = useState(DEMO_SELLO_READING_ID)
  const [view, setView] = useState<'dashboard' | 'sello'>(initialView)
  const r = DEMO_READINGS.find((x) => x.id === selectedId) ?? DEMO_READINGS[0]
  const sello = DEMO_READINGS.find((x) => x.id === DEMO_SELLO_READING_ID)!
  const nf = (n: number) => n.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')

  return (
    <div className="relative min-h-screen bg-[#0f1419] text-slate-100">
      <Watermark locale={locale} />
      <div className="sticky top-20 z-20 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-amber-300 backdrop-blur">
        {DEMO_WATERMARK[locale]} · {DEMO_ORG.name}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/organizaciones" className="text-xs text-slate-500 hover:text-emerald-400">
              ← {c.back}
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{c.title}</h1>
            <p className="text-sm text-slate-400">{DEMO_ORG.name}</p>
          </div>
          <div className="flex rounded-xl border border-[#2d3748] bg-[#1a2029] p-1 text-sm">
            {(['dashboard', 'sello'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`min-h-[40px] rounded-lg px-4 font-medium transition-colors ${
                  view === v ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {v === 'dashboard' ? c.dashboard : c.sello}
              </button>
            ))}
          </div>
        </div>

        {view === 'dashboard' ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{c.readings}</p>
              <ul className="space-y-2">
                {DEMO_READINGS.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(x.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        x.id === r.id ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-[#2d3748] bg-[#1a2029] hover:border-slate-500'
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{x.title[locale]}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">{x.period[locale]}</span>
                        <Visibility r={x} locale={locale} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <main className="space-y-6">
              <div className={`${card} p-5`}>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{r.title[locale]}</h2>
                  <Visibility r={r} locale={locale} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {c.lockedOn} {r.visibilityLockedAt} · {r.sampleMode === 'all' ? c.sampleAll : c.sampleRandom}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label={c.invited} value={nf(r.invited)} />
                <Stat label={c.responded} value={nf(r.responded)} />
                <Stat label={c.rate} value={`${responseRate(r)}%`} />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full bg-emerald-400" style={{ width: `${responseRate(r)}%` }} />
              </div>

              {r.status === 'open' ? (
                <div className={`${card} border-amber-500/30 p-5 text-sm text-amber-200`}>{c.openNote}</div>
              ) : (
                <>
                  {r.questions.map((q, i) => (
                    <div key={q.id} className={`${card} p-5`}>
                      <p className="text-xs font-semibold text-slate-500">P{i + 1}</p>
                      <h3 className="mt-1 font-semibold text-white">{q.text[locale]}</h3>
                      <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr]">
                        <div className="space-y-3">
                          <div>
                            <p className="text-3xl font-bold text-white">{q.pct}%</p>
                            <p className="text-xs text-slate-400">{c.yes}</p>
                          </div>
                          <div>
                            <p className="text-3xl font-bold text-emerald-400">{q.avgCertainty.toFixed(1)}</p>
                            <p className="text-xs text-slate-400">{c.avg}</p>
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs text-slate-500">{c.dist}</p>
                          <Distribution values={q.distribution} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <a
                    href={`/api/organizaciones/demo/pdf?reading=${r.id}&lang=${locale}`}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <Download className="h-4 w-4" /> {c.pdf}
                  </a>
                </>
              )}
            </main>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-2xl">
            <p className="mb-2 flex items-center gap-1 text-xs text-slate-500">
              <Eye className="h-3 w-3" /> {c.selloUrl}
              {DEMO_ORG.slug}
            </p>
            <div className={`${card} overflow-hidden`}>
              <div className="border-b border-[#2d3748] p-6 text-center">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-2">
                  <BadgeCheck className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-300">{c.badge}</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">{DEMO_ORG.name}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {c.selloLatest}: {sello.title[locale]} · {sello.period[locale]}
                </p>
              </div>
              <div className="space-y-4 p-6">
                {sello.questions.map((q) => (
                  <div key={q.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-slate-200">{q.text[locale]}</span>
                      <span className="shrink-0 text-slate-400">
                        {q.pct}% · <span className="font-semibold text-emerald-400">{q.avgCertainty.toFixed(1)}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full bg-emerald-400" style={{ width: `${q.avgCertainty * 10}%` }} />
                    </div>
                  </div>
                ))}
                <p className="pt-2 text-xs text-slate-400">
                  {nf(sello.invited)} {c.invited.toLowerCase()} · {nf(sello.responded)} {c.responses} · {c.rate.toLowerCase()}{' '}
                  {responseRate(sello)}%
                </p>
                <p className="text-xs text-slate-500">{c.selloNote}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/organizaciones/contratar"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            {c.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}
