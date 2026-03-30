'use client'

import { Printer } from 'lucide-react'

export default function SponsorReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/10 print:hidden"
    >
      <Printer className="h-4 w-4" />
      Imprimir / PDF
    </button>
  )
}
