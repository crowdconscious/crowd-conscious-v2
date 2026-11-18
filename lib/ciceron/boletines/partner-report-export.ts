/**
 * Word (.docx) and PDF export for the partners' morning report.
 * Letterhead is a placeholder block (demo).
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PartnerReportCourt } from '@/lib/ciceron/boletines/partner-report'
import { CICERON_DEMO_LABEL, CICERON_FIRM_NAME } from '@/lib/ciceron/config'

function markClient(
  value: string,
  side: 'actor' | 'demandado' | null,
  want: 'actor' | 'demandado'
): string {
  if (side === want) return `★ ${value}`
  return value
}

export async function buildPartnerReportDocx(
  courts: PartnerReportCourt[]
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: CICERON_FIRM_NAME,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Membrete de demostración — sustituir por el membrete del despacho',
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      text: 'Resumen matutino de boletines',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({ text: CICERON_DEMO_LABEL }),
    new Paragraph({ text: '' }),
  ]

  for (const court of courts) {
    children.push(
      new Paragraph({
        text: court.courtName,
        heading: HeadingLevel.HEADING_2,
      })
    )
    const header = new TableRow({
      children: [
        'Actor',
        'Demandado',
        'Exp.',
        'Juicio',
        'Sría.',
        'Publicado',
        'Actualización',
      ].map(
        (t) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
          })
      ),
    })
    const body = court.rows.map(
      (r) =>
        new TableRow({
          children: [
            markClient(r.actor, r.firmClientSide, 'actor'),
            markClient(r.demandado, r.firmClientSide, 'demandado'),
            r.expediente,
            r.juicio,
            r.secretaria,
            r.publicado,
            r.actualizacion,
          ].map(
            (t) =>
              new TableCell({
                children: [new Paragraph(t)],
              })
          ),
        })
    )
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...body],
      })
    )
    children.push(new Paragraph({ text: '' }))
  }

  const doc = new Document({
    sections: [{ children }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}

export function buildPartnerReportPdf(courts: PartnerReportCourt[]): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  doc.setFontSize(14)
  doc.text(CICERON_FIRM_NAME, 40, 36)
  doc.setFontSize(9)
  doc.text('Membrete de demostración — sustituir por el membrete del despacho', 40, 52)
  doc.setFontSize(12)
  doc.text('Resumen matutino de boletines', 40, 74)
  doc.setFontSize(9)
  doc.text(CICERON_DEMO_LABEL, 40, 90)

  let startY = 110
  for (const court of courts) {
    if (startY > 480) {
      doc.addPage()
      startY = 40
    }
    doc.setFontSize(11)
    doc.text(court.courtName, 40, startY)
    autoTable(doc, {
      startY: startY + 8,
      head: [['Actor', 'Demandado', 'Exp.', 'Juicio', 'Sría.', 'Publicado', 'Actualización']],
      body: court.rows.map((r) => [
        markClient(r.actor, r.firmClientSide, 'actor'),
        markClient(r.demandado, r.firmClientSide, 'demandado'),
        r.expediente,
        r.juicio,
        r.secretaria,
        r.publicado,
        r.actualizacion,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [16, 24, 38] },
      margin: { left: 40, right: 40 },
    })
    // @ts-expect-error lastAutoTable injected by jspdf-autotable
    startY = (doc.lastAutoTable?.finalY ?? startY) + 24
  }

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

export { AlignmentType }
