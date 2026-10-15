import Link from 'next/link'
import SelloBadge from '@/components/org/SelloBadge'
import { listSelloOrgs } from '@/lib/org/sello-public'
import { SELLO_NAMES } from '@/lib/org/sello-badge'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sello Empresa Consciente · Esfuerzo Consciente · Crowd Conscious' }

const T = {
  es: {
    h: 'Organizaciones con Sello activo',
    names: 'Sello Empresa Consciente para empresas; Sello Esfuerzo Consciente para escuelas, universidades y otras organizaciones.',
    p: 'El Sello está activo mientras la organización es cliente con servicio vigente y publica sus resultados. Se retira automáticamente si deja de pagar o si sus resultados pasan a privados.',
    empty: 'Todavía no hay organizaciones con Sello activo.',
    see: 'Ver resultados públicos',
  },
  en: {
    h: 'Organizations with an active seal',
    names: 'Empresa Consciente seal for companies; Esfuerzo Consciente seal for schools, universities and other organizations.',
    p: 'The Seal is active while the organization is a paying client and publishes its results. It is removed automatically if payment stops or results become private.',
    empty: 'No organizations have an active Seal yet.',
    see: 'See public results',
  },
}

/** Public listing: only orgs whose Sello is active right now. Names only, no logos. */
export default async function SelloIndex() {
  const locale = await getOrgLocale()
  const t = T[locale]
  const orgs = await listSelloOrgs()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="flex gap-3"><SelloBadge variant="empresa" size={110} id="sello-hero-e" /><SelloBadge variant="esfuerzo" size={110} id="sello-hero-s" /></div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">{t.h}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">{t.names}</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">{t.p}</p>
        </div>
      </div>
      {orgs.length === 0 ? <p className="mt-8 text-slate-200">{t.empty}</p> : null}
      <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {orgs.map((o) => (
          <li key={o.slug}>
            <Link href={`/sello/${o.slug}`} className="flex items-center gap-4 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 hover:border-emerald-400/70">
              <SelloBadge variant={o.variant} size={56} id={`sello-l-${o.slug}`} />
              <span className="min-w-0">
                <span className="block break-words font-semibold text-white">{o.name}</span>
                <span className="block text-xs text-slate-300">{SELLO_NAMES[o.variant][locale]}</span>
                <span className="text-sm text-emerald-300">{t.see}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
