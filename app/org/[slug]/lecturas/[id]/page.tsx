import { notFound, redirect } from 'next/navigation'
import ReadingDashboard, { type ReadingExtras } from '@/components/org/ReadingDashboard'
import { DEMO_BANNER } from '@/lib/org/demo-data'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { MIN_RESPONSES_FOR_HEADLINE } from '@/lib/org/firmness'
import { clientReadings, controlsFor, orgContext } from '@/lib/org/server-reading'
import { createShareToken } from '@/lib/org/share-token'
import { reportLocale } from '@/lib/org/locale-pref'

export const dynamic = 'force-dynamic'

export default async function OrgReadingPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams?: Promise<{ lang?: string }> }) {
  if (!ORG_PORTAL_V2) notFound()
  const { slug, id } = await params
  const c = await orgContext(slug)
  if (!c.ok) {
    if (c.access.kind === 'login') redirect(`/login?redirect=${encodeURIComponent(`/org/${slug}/lecturas/${id}`)}`)
    notFound()
  }
  const ctx = c.ctx
  const readings = await clientReadings(ctx)
  if (!readings.some((r) => r.id === id)) notFound()
  const locale = reportLocale((await searchParams)?.lang, c.ok ? c.ctx.org?.locale : null)
  const es = locale === 'es'
  const resumenHrefs: Record<string, string> = {}
  const pdfHrefs: Record<string, string> = {}
  const extras: Record<string, ReadingExtras> = {}
  for (const r of readings) {
    const base = `/api/org/${slug}/lecturas/${r.id}`
    const controls = await controlsFor(ctx, r.id, r.responded)
    const links: ReadingExtras['links'] = []
    if (r.status === 'closed') {
      const token = createShareToken(slug, r.id)
      if (token) resumenHrefs[r.id] = `/org/${slug}/lecturas/${r.id}/resumen?t=${encodeURIComponent(token)}`
      else if (ctx.demo) resumenHrefs[r.id] = `/organizaciones/demo/resumen?lectura=${r.id}`
      links.push(
        { href: `${base}/reporte?lang=${locale}`, label: es ? 'Reporte completo (PDF)' : 'Full report (PDF)' },
        { href: `/org/${slug}/lecturas/${r.id}/reporte`, label: es ? 'Reporte completo (web)' : 'Full report (web)' },
        { href: `${base}/csv?tipo=agregado&lang=${locale}`, label: es ? 'CSV agregado' : 'Aggregate CSV' },
        r.responded >= MIN_RESPONSES_FOR_HEADLINE
          ? { href: `${base}/csv?tipo=respuestas&lang=${locale}`, label: es ? 'CSV de respuestas (anónimas)' : 'Answers CSV (anonymous)' }
          : { href: null, label: es ? `CSV de respuestas: requiere ${MIN_RESPONSES_FOR_HEADLINE} respuestas` : `Answers CSV: needs ${MIN_RESPONSES_FOR_HEADLINE} responses` }
      )
    } else if (controls && r.status === 'field') {
      links.push({ href: controls.surveyPath, label: es ? 'Enlace de la consulta (para compartir)' : 'Survey link (to share)' })
    }
    extras[r.id] = { links, controls }
  }
  return (
    <div>
      {ctx.demo ? (
        <div className="border-b border-amber-300/40 bg-amber-300/10 px-4 py-2 text-center text-sm font-semibold text-amber-100">
          {DEMO_BANNER[locale]} · {ctx.name}
        </div>
      ) : null}
      <ReadingDashboard
        orgName={ctx.name}
        readings={readings}
        defaultId={id}
        locale={locale}
        demo={ctx.demo}
        resumenHrefs={resumenHrefs}
        pdfHrefs={pdfHrefs}
        extras={extras}
        escuchaHref="/organizaciones#precios"
      />
    </div>
  )
}
