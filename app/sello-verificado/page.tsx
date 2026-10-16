import Link from 'next/link'
import SealBadge from '@/components/seal/SealBadge'
import { listSelloOrgs } from '@/lib/org/sello-public'
import { getOrgLocale } from '@/app/organizaciones/locale'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Sello verificado · Crowd Conscious' }

const T = {
  es: {
    h: 'Organizaciones con Sello verificado activo',
    names: 'El Sello verificado es parte del servicio de pago para organizaciones: se basa en una lectura medida con resultados públicos. ¿Busca el sello gratuito para lugares? Vea Lugar Consciente.',
    p: 'Está activo mientras la organización tiene el servicio vigente y publica sus resultados. Se retira automáticamente si el servicio termina o si sus resultados pasan a privados.',
    empty: 'Todavía no hay organizaciones con Sello verificado activo.',
    see: 'Ver resultados públicos',
  },
  en: {
    h: 'Organizations with an active Sello verificado',
    names: 'The Sello verificado is part of the paid service for organizations: it is based on a measured reading with public results. Looking for the free seal for places? See Lugar Consciente.',
    p: 'It is active while the organization has an active service and publishes its results. It is removed automatically if the service ends or results become private.',
    empty: 'No organizations have an active Sello verificado yet.',
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
        <SealBadge type="sello_verificado" size={110} id="sello-hero" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">{t.h}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">{t.names} <Link href="/lugar-consciente" className="font-semibold text-emerald-300 underline">Lugar Consciente</Link></p>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">{t.p}</p>
        </div>
      </div>
      {orgs.length === 0 ? <p className="mt-8 text-slate-200">{t.empty}</p> : null}
      <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {orgs.map((o) => (
          <li key={o.slug}>
            <Link href={`/sello-verificado/${o.slug}`} className="flex items-center gap-4 rounded-2xl border border-[#2d3748] bg-[#1a2029] p-4 hover:border-emerald-400/70">
              <SealBadge type="sello_verificado" size={56} id={`sello-l-${o.slug}`} />
              <span className="min-w-0">
                <span className="block break-words font-semibold text-white">{o.name}</span>
                                <span className="text-sm text-emerald-300">{t.see}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
