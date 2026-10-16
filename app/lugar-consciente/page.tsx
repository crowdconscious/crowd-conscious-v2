import Link from 'next/link'
import SealBadge from '@/components/seal/SealBadge'
import ValuesLegend from '@/components/lugar/ValuesLegend'
import { listActiveLugares } from '@/lib/lugar/repo'
import { MIN_TOTAL_VOTERS, MIN_VOTERS_PER_WEEK, MIN_WEEKS, WINDOW_WEEKS } from '@/lib/lugar/rules'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lugar Consciente · Crowd Conscious', description: 'Sello gratuito para lugares que difunden los Pulsos de Crowd Conscious y aceptan nuestros valores.' }

const T = {
  es: {
    h: 'Lugar Consciente', lead: 'Un sello gratuito que se gana, no se compra. Lo reciben los lugares que invitan a su comunidad a opinar en los Pulsos de Crowd Conscious y aceptan vivir por nuestros valores.',
    how: '¿Cómo se gana?',
    steps: [
      'Su lugar entra por Conscious Locations: alguien lo nomina o usted lo reclama.',
      'Recibe su QR y su enlace para compartir los Pulsos.',
      `Durante ${MIN_WEEKS} semanas (dentro de ${WINDOW_WEEKS}) al menos ${MIN_VOTERS_PER_WEEK} personas distintas votan cada semana por su QR o enlace, y suman ${MIN_TOTAL_VOTERS} en total.`,
      'Acepta nuestros 7 valores, una sola vez y todos juntos.',
      'El sello se otorga automáticamente y se revisa cada año.',
    ],
    values: 'Nuestros valores: las 7 estrellas', valuesP: 'Cada estrella del sello es uno de nuestros valores. Aceptarlos es un acuerdo para vivir por ellos; no es una auditoría ni una certificación de cumplimiento.',
    cta: 'Nominar o reclamar un lugar', list: 'Lugares Conscientes activos', empty: 'Pronto verá aquí los primeros Lugares Conscientes.',
    diff: '¿Es una organización que quiere medir y publicar resultados? Eso es el Sello verificado, un servicio de pago.', diffLink: 'Ver Sello verificado',
    until: (d: string) => `vigente hasta ${d}`,
  },
  en: {
    h: 'Lugar Consciente', lead: 'A free seal that is earned, not bought. It goes to places that invite their community to weigh in on Crowd Conscious Pulses and agree to live by our values.',
    how: 'How is it earned?',
    steps: [
      'Your place joins through Conscious Locations: someone nominates it or you claim it.',
      'You get your QR and a link to share the Pulses.',
      `For ${MIN_WEEKS} weeks (within ${WINDOW_WEEKS}) at least ${MIN_VOTERS_PER_WEEK} different people vote each week through your QR or link, adding up to ${MIN_TOTAL_VOTERS} in total.`,
      'You accept our 7 values, once and all together.',
      'The seal is granted automatically and reviewed every year.',
    ],
    values: 'Our values: the 7 stars', valuesP: 'Each star on the seal is one of our values. Accepting them is an agreement to live by them; it is not an audit or a compliance certification.',
    cta: 'Nominate or claim a place', list: 'Active Lugares Conscientes', empty: 'The first Lugares Conscientes will appear here soon.',
    diff: 'Are you an organization that wants to measure and publish results? That is the Sello verificado, a paid service.', diffLink: 'See Sello verificado',
    until: (d: string) => `valid until ${d}`,
  },
}

export default async function LugarConscienteIndex() {
  const locale = await getOrgLocale()
  const t = T[locale]
  const list = await listActiveLugares().catch(() => [])
  const fmt = (d: string) => new Date(d).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City', month: 'short', year: 'numeric' })
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <SealBadge type="lugar_consciente" size={140} id="lc-hero" />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-white">{t.h}</h1>
          <p className="mt-2 text-base text-slate-200">{t.lead}</p>
          <Link href="/locations" className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-emerald-400 px-4 font-semibold text-[#0f1419]">{t.cta}</Link>
        </div>
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">{t.how}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-200">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">{t.values}</h2>
        <p className="mb-4 mt-1 text-sm text-slate-300">{t.valuesP}</p>
        <ValuesLegend locale={locale} />
      </section>
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">{t.list}</h2>
        {list.length === 0 ? <p className="mt-2 text-slate-300">{t.empty}</p> : (
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            {list.map((l) => (
              <li key={l.slug}><Link href={`/lugar-consciente/${l.slug}`} className="flex items-center gap-3 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-3 hover:border-emerald-400/70">
                <SealBadge type="lugar_consciente" size={48} id={`lc-${l.slug}`} />
                <span className="min-w-0"><span className="block break-words font-semibold text-white">{l.name}</span><span className="block text-sm text-slate-300">{t.until(fmt(l.expires_at))}</span></span>
              </Link></li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-10 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 text-sm text-slate-200">{t.diff} <Link href="/sello-verificado" className="font-semibold text-emerald-300 underline">{t.diffLink}</Link></p>
    </div>
  )
}
