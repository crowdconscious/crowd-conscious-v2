import { NextRequest } from 'next/server'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { generateReadingReportPdf } from '@/lib/org/report-pdf'
import { clientReading, denied, orgContext } from '@/lib/org/server-reading'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Full report PDF for a closed reading. Members only (the fictitious demo org is open). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!ORG_PORTAL_V2) return new Response('Not found', { status: 404 })
  const { slug, id } = await params
  const c = await orgContext(slug)
  if (!c.ok) return denied(c.access)
  const found = await clientReading(c.ctx, id)
  if (!found || found.reading.status !== 'closed') return new Response('Not found', { status: 404 })
  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es'
  const pdf = generateReadingReportPdf(found.reading, { orgName: c.ctx.name, locale, demo: c.ctx.demo, earlier: found.earlier })
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="crowd-conscious-reporte-${c.ctx.slug}-${id.slice(0, 24)}-${locale}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
