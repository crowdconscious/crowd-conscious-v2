import { CheckCircle2, XCircle } from 'lucide-react'
import SelloBadge from '@/components/org/SelloBadge'
import { DEMO_BANNER } from '@/lib/org/demo-data'
import { readingHeadline } from '@/lib/org/headline-copy'
import { responseRate } from '@/lib/org/readings'
import { publicOrg } from '@/lib/org/sello-public'
import { SELLO_NAMES } from '@/lib/org/sello-badge'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'

const T = {
  es: {
    on: 'Sello activo', off: 'Sello no activo',
    onP: 'Esta organización es cliente con servicio vigente y publica sus resultados. El estado se verifica en tiempo real.',
    offP: 'El Sello no está activo en este momento: se activa solo mientras la organización paga el servicio y tiene resultados públicos.',
    none: 'No hay un Sello activo ni resultados públicos para esta dirección.',
    results: 'Resultados públicos', checked: 'Verificado', rate: (a: number, b: number, p: number) => `${a} de ${b} respondieron · ${p}%`,
  },
  en: {
    on: 'Seal active', off: 'Seal not active',
    onP: 'This organization is a paying client and publishes its results. Status is checked in real time.',
    offP: 'The Seal is not active right now: it is active only while the organization pays for the service and has public results.',
    none: 'There is no active Seal or public results at this address.',
    results: 'Public results', checked: 'Checked', rate: (a: number, b: number, p: number) => `${a} of ${b} responded · ${p}%`,
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const o = await publicOrg((await params).slug)
  return { title: o ? `${o.name} · ${SELLO_NAMES[o.variant].es}` : 'Sello · Crowd Conscious', robots: o ? undefined : { index: false } }
}

/** Public results + Sello verify page. The badge links here. */
export default async function SelloVerify({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getOrgLocale()
  const t = T[locale]
  const o = await publicOrg(slug)
  const now = new Date().toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' })
  if (!o) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="flex items-center gap-2 text-lg font-semibold text-slate-100"><XCircle className="h-5 w-5 text-slate-400" aria-hidden /> {t.off}</p>
        <p className="mt-2 text-slate-200">{t.none}</p>
      </div>
    )
  }
  return (
    <div>
      {o.demo ? <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">{DEMO_BANNER[locale]}</div> : null}
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {o.sello ? <SelloBadge variant={o.variant} size={150} id="sello-verify" /> : null}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-white">{o.name}</h1>
            <p className={`mt-2 flex items-center gap-2 font-semibold ${o.sello ? 'text-emerald-300' : 'text-slate-300'}`}>
              {o.sello ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <XCircle className="h-5 w-5" aria-hidden />} {SELLO_NAMES[o.variant][locale]}: {o.sello ? t.on : t.off}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-slate-200">{o.sello ? t.onP : t.offP}</p>
            <p className="mt-1 text-xs text-slate-400">{t.checked}: {now} (CDMX)</p>
          </div>
        </div>
        {o.readings.length ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">{t.results}</h2>
            <ul className="mt-4 space-y-3">
              {o.readings.map((r) => {
                const h = readingHeadline(r.questions, locale)
                return (
                  <li key={r.id} className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 sm:p-5">
                    <p className="text-xs text-slate-300">{r.period[locale]}</p>
                    <p className="mt-1 break-words text-lg font-semibold text-white">{r.title[locale]}</p>
                    {h ? <p className="mt-1 break-words text-sm text-slate-200">{h.main}</p> : null}
                    {r.invited > 0 ? <p className="mt-1 text-xs text-slate-300">{t.rate(r.responded, r.invited, responseRate(r))}</p> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
