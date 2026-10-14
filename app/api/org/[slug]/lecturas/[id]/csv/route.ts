import { NextRequest } from 'next/server'
import { downloadName, reportLocale } from '@/lib/org/locale-pref'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { aggregateCsv, answersCsv } from '@/lib/org/csv'
import { clientReading, denied, orgContext, rawAnswers } from '@/lib/org/server-reading'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ?tipo=agregado (default) | respuestas. No IDs, no timestamps, reasons redacted. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  if (!ORG_PORTAL_V2) return new Response('Not found', { status: 404 })
  const { slug, id } = await params
  const c = await orgContext(slug)
  if (!c.ok) return denied(c.access)
  const found = await clientReading(c.ctx, id)
  if (!found || found.reading.status !== 'closed') return new Response('Not found', { status: 404 })
  const locale = reportLocale(request.nextUrl.searchParams.get('lang'), c.ctx.org?.locale)
  const tipo = request.nextUrl.searchParams.get('tipo') === 'respuestas' ? 'respuestas' : 'agregado'
  let csv: string
  if (tipo === 'agregado') csv = aggregateCsv(found.reading, locale)
  else {
    const res = answersCsv(found.reading, await rawAnswers(c.ctx, id), locale)
    if (!res.ok) {
      return new Response(
        locale === 'es'
          ? 'Esta lectura tiene menos de 30 respuestas: no se descargan respuestas individuales para proteger el anonimato.'
          : 'This reading has fewer than 30 responses: individual answers are not downloadable, to protect anonymity.',
        { status: 409, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      )
    }
    csv = res.csv
  }
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${downloadName(tipo, c.ctx.slug, id, locale, 'csv')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
