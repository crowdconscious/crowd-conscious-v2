import { notFound, redirect } from 'next/navigation'
import WebReport from '@/components/org/WebReport'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { clientReading, orgContext } from '@/lib/org/server-reading'
import { reportLocale } from '@/lib/org/locale-pref'

export const dynamic = 'force-dynamic'

/** Responsive full report (members only; the fictitious demo org is open). */
export default async function OrgReportPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams?: Promise<{ lang?: string }> }) {
  if (!ORG_PORTAL_V2) notFound()
  const { slug, id } = await params
  const c = await orgContext(slug)
  if (!c.ok) {
    if (c.access.kind === 'login') redirect(`/login?redirect=${encodeURIComponent(`/org/${slug}/lecturas/${id}/reporte`)}`)
    notFound()
  }
  const found = await clientReading(c.ctx, id)
  if (!found || found.reading.status !== 'closed') notFound()
  const locale = reportLocale((await searchParams)?.lang, c.ok ? c.ctx.org?.locale : null)
  return (
    <WebReport
      reading={found.reading}
      earlier={found.earlier}
      orgName={c.ctx.name}
      locale={locale}
      demo={c.ctx.demo}
      pdfHref={`/api/org/${slug}/lecturas/${id}/reporte?lang=${locale}`}
    />
  )
}
