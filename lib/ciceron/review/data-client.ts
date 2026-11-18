import { auditActionLabel } from '@/lib/ciceron/copy/labels'
import { formatPolicyCell } from '@/lib/ciceron/audit/policy-labels'
import type { AuditViewerRow } from '@/lib/ciceron/review/types'

/** Client-safe CSV helper (no server-only imports). */
export function auditRowsToCsv(rows: AuditViewerRow[]): string {
  const header = [
    'cuando',
    'actor',
    'accion',
    'objeto',
    'objeto_id',
    'resultado',
    'regla',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    const cells = [
      r.createdAt,
      r.actorName,
      auditActionLabel(r.action),
      r.entityLabel,
      '',
      r.outcome === 'denied' ? 'Denegado' : 'Permitido',
      formatPolicyCell(r.policyId, r.policyReason),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}
