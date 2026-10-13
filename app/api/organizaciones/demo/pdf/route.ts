import { NextRequest } from 'next/server'
import { DEMO_READINGS, DEMO_SELLO_READING_ID } from '@/lib/organizaciones/demo-data'
import { generateDemoReadingPdf } from '@/lib/organizaciones/demo-report-pdf'

export const runtime = 'nodejs'

/** Public, no-login sample PDF built from fixed fictitious demo data. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('reading') || DEMO_SELLO_READING_ID
  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es'
  const reading =
    DEMO_READINGS.find((r) => r.id === id && r.status === 'closed') ??
    DEMO_READINGS.find((r) => r.id === DEMO_SELLO_READING_ID)!
  const pdf = generateDemoReadingPdf(reading, locale)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="crowd-conscious-demo-${reading.id}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  })
}
