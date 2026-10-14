import { NextRequest } from 'next/server'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { DEMO_ORG, DEMO_READINGS, previousClosed } from '@/lib/org/demo-data'
import { toClientReading } from '@/lib/org/readings'
import { generateReadingReportPdf } from '@/lib/org/report-pdf'

export const runtime = 'nodejs'

/**
 * Full report PDF ("reporte completo"). Behind NEXT_PUBLIC_ORG_PORTAL_V2 and,
 * until client auth + reading storage exist, only for the fictitious demo org.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!ORG_PORTAL_V2) return new Response('Not found', { status: 404 })
  const { slug, id } = await params
  if (slug !== DEMO_ORG.slug) return new Response('Not found', { status: 404 })
  const raw = DEMO_READINGS.find((r) => r.id === id && r.status === 'closed')
  if (!raw) return new Response('Not found', { status: 404 })
  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es'
  const prev = previousClosed(raw.id)
  const pdf = generateReadingReportPdf(toClientReading(raw), {
    orgName: DEMO_ORG.name,
    locale,
    demo: true,
    earlier: prev ? toClientReading(prev) : null,
  })
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="crowd-conscious-reporte-ficticio-${raw.id}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
