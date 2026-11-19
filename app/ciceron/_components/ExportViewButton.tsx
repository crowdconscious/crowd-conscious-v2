'use client'

import { useState } from 'react'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  buildCsv,
  buildMatrix,
  suggestFilename,
  type ExportColumn,
  type ExportRow,
} from '@/lib/ciceron/export/view-export-pure'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * One-click PDF / Excel / CSV of the current view.
 * Client-side only — uses existing jspdf + exceljs (no new services).
 */
export function ExportViewButton({
  title,
  filenameBase,
  columns,
  rows,
}: {
  title: string
  filenameBase: string
  columns: ExportColumn[]
  rows: ExportRow[]
}) {
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | 'csv' | null>(null)

  async function exportCsv() {
    setBusy('csv')
    try {
      const csv = buildCsv(columns, rows)
      triggerDownload(
        new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
        suggestFilename(filenameBase, 'csv')
      )
    } finally {
      setBusy(null)
    }
  }

  async function exportPdf() {
    setBusy('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(12)
      doc.text(title, 14, 16)
      doc.setFontSize(9)
      doc.text(copy.demoLabel, 14, 22)
      const { headers, body } = buildMatrix(columns, rows)
      autoTable(doc, {
        startY: 28,
        head: [headers],
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [16, 24, 38] },
      })
      doc.save(suggestFilename(filenameBase, 'pdf'))
    } finally {
      setBusy(null)
    }
  }

  async function exportXlsx() {
    setBusy('xlsx')
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Equipo de Cicerón'
      const ws = wb.addWorksheet('Vista')
      const { headers, body } = buildMatrix(columns, rows)
      ws.addRow(headers)
      for (const row of body) ws.addRow(row)
      ws.getRow(1).font = { bold: true }
      const buf = await wb.xlsx.writeBuffer()
      triggerDownload(
        new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        suggestFilename(filenameBase, 'xlsx')
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="cic-export-view" role="group" aria-label={copy.exportView.aria}>
      <span className="cic-export-view-label">{copy.exportView.label}</span>
      <button
        type="button"
        className="cic-btn cic-btn-secondary cic-btn-compact"
        disabled={busy !== null || rows.length === 0}
        onClick={() => void exportPdf()}
      >
        {busy === 'pdf' ? copy.exportView.working : copy.exportView.pdf}
      </button>
      <button
        type="button"
        className="cic-btn cic-btn-secondary cic-btn-compact"
        disabled={busy !== null || rows.length === 0}
        onClick={() => void exportXlsx()}
      >
        {busy === 'xlsx' ? copy.exportView.working : copy.exportView.excel}
      </button>
      <button
        type="button"
        className="cic-btn cic-btn-secondary cic-btn-compact"
        disabled={busy !== null || rows.length === 0}
        onClick={() => void exportCsv()}
      >
        {busy === 'csv' ? copy.exportView.working : copy.exportView.csv}
      </button>
    </div>
  )
}
