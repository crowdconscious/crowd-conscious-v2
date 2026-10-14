import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ExecutiveSummary from '@/components/org/ExecutiveSummary'
import PrintButton from '@/components/org/PrintButton'
import { DEMO_BANNER, DEMO_DEFAULT_READING_ID, DEMO_ORG, DEMO_READINGS } from '@/lib/org/demo-data'
import { toClientReading } from '@/lib/org/readings'
import { getOrgLocale } from '../../locale'

export const metadata: Metadata = { title: 'Resumen para dirección · Demo', robots: { index: false, follow: false } }

export default async function DemoResumenPage({ searchParams }: { searchParams: Promise<{ lectura?: string }> }) {
  const { lectura } = await searchParams
  const locale = await getOrgLocale()
  const raw = DEMO_READINGS.find((r) => r.id === (lectura || DEMO_DEFAULT_READING_ID))
  if (!raw || raw.status !== 'closed') notFound()
  return (
    <div className="px-0 pb-10 sm:px-4">
      <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100 print:hidden">
        {DEMO_BANNER[locale]} · {DEMO_ORG.name}
      </div>
      <div className="mx-auto mt-4 flex max-w-[800px] justify-end px-4 sm:px-0 print:hidden">
        <PrintButton label={locale === 'es' ? 'Imprimir o guardar PDF' : 'Print or save PDF'} />
      </div>
      <ExecutiveSummary reading={toClientReading(raw)} orgName={DEMO_ORG.name} locale={locale} demo />
    </div>
  )
}
