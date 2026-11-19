import { NextResponse } from 'next/server'
import { buildPartnerReport } from '@/lib/ciceron/boletines/partner-report'
import {
  buildPartnerReportDocx,
  buildPartnerReportPdf,
} from '@/lib/ciceron/boletines/partner-report-export'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const persona = await getCiceronDemoSession()
  if (!persona) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 401 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get('format') === 'docx' ? 'docx' : 'pdf'
  const data = await loadBulletinBoard(persona)
  const courts = buildPartnerReport(data.hits)

  if (format === 'docx') {
    const buf = await buildPartnerReportDocx(courts)
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition':
          'attachment; filename="resumen-matutino-ciceron.docx"',
      },
    })
  }

  const buf = buildPartnerReportPdf(courts)
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="resumen-matutino-ciceron.pdf"',
    },
  })
}
