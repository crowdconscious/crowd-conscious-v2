import { notFound } from 'next/navigation'
import ReadingDashboard from '@/components/org/ReadingDashboard'
import { DEMO_BANNER } from '@/lib/org/demo-data'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { getOrgView } from '@/lib/org/data'
import { createShareToken } from '@/lib/org/share-token'
import { getOrgLocale } from '@/app/organizaciones/locale'

export default async function OrgReadingPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!ORG_PORTAL_V2) notFound()
  const { slug, id } = await params
  const org = await getOrgView(slug)
  if (!org || !org.readings.some((r) => r.id === id)) notFound()
  const locale = await getOrgLocale()
  const resumenHrefs: Record<string, string> = {}
  const pdfHrefs: Record<string, string> = {}
  for (const r of org.readings.filter((x) => x.status === 'closed')) {
    const token = createShareToken(slug, r.id)
    // Without ORG_SHARE_SECRET there is no share link; the demo falls back to its public resumen.
    if (token) resumenHrefs[r.id] = `/org/${slug}/lecturas/${r.id}/resumen?t=${encodeURIComponent(token)}`
    else if (org.demo) resumenHrefs[r.id] = `/organizaciones/demo/resumen?lectura=${r.id}`
    // Real-client PDF export arrives with reading storage (Prompt 4); demo uses the sample route.
    if (org.demo) pdfHrefs[r.id] = `/api/organizaciones/demo/pdf?reading=${r.id}&lang=${locale}`
  }
  return (
    <div>
      {org.demo ? (
        <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">
          {DEMO_BANNER[locale]} · {org.name}
        </div>
      ) : null}
      <ReadingDashboard
        orgName={org.name}
        readings={org.readings}
        defaultId={id}
        locale={locale}
        demo={org.demo}
        resumenHrefs={resumenHrefs}
        pdfHrefs={pdfHrefs}
        escuchaHref="/organizaciones#precios"
      />
    </div>
  )
}
