import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'
import SealBadge from '@/components/seal/SealBadge'
import ValuesLegend from '@/components/lugar/ValuesLegend'
import { activeLugarBySlug } from '@/lib/lugar/repo'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'

const T = {
  es: {
    on: 'Lugar Consciente: activo', off: 'Lugar Consciente: no activo',
    onP: (d: string) => `Este lugar difundió los Pulsos de Crowd Conscious y aceptó vivir por nuestros valores. Vigente hasta el ${d}; se revisa cada año.`,
    paid: 'Otorgado como parte del servicio de una organización cliente.',
    offP: 'No hay un sello Lugar Consciente vigente para esta dirección.',
    checked: 'Verificado', values: 'Los 7 valores que este lugar aceptó', more: '¿Qué es Lugar Consciente?',
    note: 'Los valores son un acuerdo de buena fe, no una auditoría de cumplimiento.',
  },
  en: {
    on: 'Lugar Consciente: active', off: 'Lugar Consciente: not active',
    onP: (d: string) => `This place spread Crowd Conscious Pulses and agreed to live by our values. Valid until ${d}; reviewed every year.`,
    paid: 'Granted as part of a client organization’s service.',
    offP: 'There is no current Lugar Consciente seal at this address.',
    checked: 'Checked', values: 'The 7 values this place accepted', more: 'What is Lugar Consciente?',
    note: 'The values are a good-faith agreement, not a compliance audit.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const r = await activeLugarBySlug((await params).slug).catch(() => null)
  return { title: r ? `${r.name} · Lugar Consciente` : 'Lugar Consciente · Crowd Conscious', robots: r ? undefined : { index: false } }
}

/** Public verify page the Lugar Consciente badge links to. Status computed per request. */
export default async function LugarVerify({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getOrgLocale()
  const t = T[locale]
  const r = await activeLugarBySlug(slug).catch(() => null)
  const now = new Date().toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' })
  const fmt = (d: string) => new Date(d).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric' })
  if (!r) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="flex items-center gap-2 text-lg font-semibold text-slate-100"><XCircle className="h-5 w-5 text-slate-300" aria-hidden /> {t.off}</p>
        <p className="mt-2 text-slate-200">{t.offP}</p>
        <Link href="/lugar-consciente" className="mt-4 inline-block text-emerald-300 underline">{t.more}</Link>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <SealBadge type="lugar_consciente" size={150} id="lc-verify" />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-white">{r.name}</h1>
          <p className="mt-2 flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 className="h-5 w-5" aria-hidden /> {t.on}</p>
          <p className="mt-1 text-sm text-slate-200">{t.onP(fmt(r.award.expires_at!))}</p>
          {r.award.awarded_by === 'auto_paid' ? <p className="mt-1 text-sm text-slate-200">{t.paid}</p> : null}
          <p className="mt-1 text-xs text-slate-300">{t.checked}: {now} (CDMX)</p>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-white">{t.values}</h2>
        <p className="mb-3 mt-1 text-sm text-slate-300">{t.note}</p>
        <ValuesLegend locale={locale} />
      </section>
    </div>
  )
}
