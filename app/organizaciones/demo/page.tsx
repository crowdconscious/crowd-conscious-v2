import type { Metadata } from 'next'
import Link from 'next/link'
import ReadingDashboard from '@/components/org/ReadingDashboard'
import { DEMO_BANNER, DEMO_DEFAULT_READING_ID, DEMO_ORG, DEMO_READINGS } from '@/lib/org/demo-data'
import { toClientReading } from '@/lib/org/readings'
import { getOrgLocale } from '../locale'

export async function generateMetadata(): Promise<Metadata> {
  const es = (await getOrgLocale()) === 'es'
  const title = es ? 'Demo · Crowd Conscious para organizaciones' : 'Demo · Crowd Conscious for organizations'
  const description = es
    ? 'Vea una lectura de satisfacción con certeza: la respuesta primero, cada «sí» separado por firmeza y las razones de sus usuarios. Datos ficticios.'
    : 'See a satisfaction reading with certainty: the answer first, every "yes" split by firmness, and your users’ reasons. Fictitious data.'
  // Demo is public but not indexed for now (open decision #4).
  return { title, description, robots: { index: false, follow: true }, openGraph: { title, description, url: '/organizaciones/demo' } }
}

export default async function OrganizacionesDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ metodologia?: string }>
}) {
  const sp = await searchParams
  const locale = await getOrgLocale()
  const es = locale === 'es'
  const closed = DEMO_READINGS.filter((r) => r.status === 'closed').map((r) => r.id)
  return (
    <div>
      <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">
        {DEMO_BANNER[locale]} · {DEMO_ORG.name}
      </div>
      <ReadingDashboard
        orgName={DEMO_ORG.name}
        readings={DEMO_READINGS.map(toClientReading)}
        defaultId={DEMO_DEFAULT_READING_ID}
        locale={locale}
        demo
        resumenHrefs={Object.fromEntries(closed.map((id) => [id, `/organizaciones/demo/resumen?lectura=${id}`]))}
        pdfHrefs={Object.fromEntries(closed.map((id) => [id, `/api/organizaciones/demo/pdf?reading=${id}&lang=${locale}`]))}
        escuchaHref="/organizaciones#precios"
        initialDrawerOpen={sp.metodologia === '1'}
      />
      <div className="px-4 pb-14 text-center">
        <Link
          href="/organizaciones/contratar"
          className="inline-flex min-h-[52px] items-center rounded-xl bg-emerald-400 px-7 text-base font-semibold text-[#0f1419] hover:bg-emerald-300"
        >
          {es ? 'Quiero ver esto con mis usuarios' : 'I want to see this with my users'}
        </Link>
      </div>
    </div>
  )
}
