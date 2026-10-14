import { notFound } from 'next/navigation'
import ExecutiveSummary from '@/components/org/ExecutiveSummary'
import PrintButton from '@/components/org/PrintButton'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { getOrgView } from '@/lib/org/data'
import { verifyShareToken } from '@/lib/org/share-token'
import { getOrgLocale } from '@/app/organizaciones/locale'

/** Private, expiring share link of the executive summary. */
export default async function OrgResumenPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ t?: string }>
}) {
  if (!ORG_PORTAL_V2) notFound()
  const { slug, id } = await params
  const { t } = await searchParams
  const v = t ? verifyShareToken(t, slug, id) : { ok: false as const }
  const locale = await getOrgLocale()
  if (!v.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-slate-200">
        {locale === 'es'
          ? 'Este enlace venció o no es válido. Pida a quien se lo envió un enlace nuevo.'
          : 'This link has expired or is not valid. Ask the sender for a new one.'}
      </div>
    )
  }
  const org = await getOrgView(slug)
  const reading = org?.readings.find((r) => r.id === id && r.status === 'closed')
  if (!org || !reading) notFound()
  const exp = new Date(v.exp).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Mexico_City' })
  return (
    <div className="pb-10">
      <div className="mx-auto mt-4 flex max-w-[800px] justify-end px-4 print:hidden">
        <PrintButton label={locale === 'es' ? 'Imprimir o guardar PDF' : 'Print or save PDF'} />
      </div>
      <ExecutiveSummary reading={reading} orgName={org.name} locale={locale} demo={org.demo} expiresAt={exp} />
    </div>
  )
}
