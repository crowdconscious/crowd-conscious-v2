import { NextRequest } from 'next/server'
import { DEMO_DEFAULT_READING_ID, DEMO_ORG, DEMO_READINGS } from '@/lib/org/demo-data'
import { generateReadingPdf } from '@/lib/org/reading-pdf'
import { toClientReading } from '@/lib/org/readings'

export const runtime = 'nodejs'

/** Public, no-login sample PDF built from fixed fictitious demo data. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('reading') || DEMO_DEFAULT_READING_ID
  const locale = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es'
  const raw =
    DEMO_READINGS.find((r) => r.id === id && r.status === 'closed') ?? DEMO_READINGS.find((r) => r.id === DEMO_DEFAULT_READING_ID)!
  const pdf = generateReadingPdf(toClientReading(raw), DEMO_ORG.name, locale, true)
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="crowd-conscious-demo-ficticio-${raw.id}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  })
}
