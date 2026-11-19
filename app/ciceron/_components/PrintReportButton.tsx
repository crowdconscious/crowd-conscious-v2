'use client'

import { copy } from '@/lib/ciceron/copy/es-MX'

export function PrintReportButton() {
  return (
    <button
      type="button"
      className="cic-btn cic-btn-secondary"
      onClick={() => window.print()}
    >
      {copy.boletines.partnerPrint}
    </button>
  )
}
