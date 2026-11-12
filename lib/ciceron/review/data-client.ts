import type { AuditViewerRow } from '@/lib/ciceron/review/types'

/** Client-safe CSV helper (no server-only imports). */
export function auditRowsToCsv(rows: AuditViewerRow[]): string {
  const header = [
    'created_at',
    'actor',
    'action',
    'entity_type',
    'entity_id',
    'outcome',
    'policy_id',
    'policy_reason',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    const cells = [
      r.createdAt,
      r.actorName,
      r.action,
      r.entityType,
      r.entityId ?? '',
      r.outcome,
      r.policyId ?? '',
      r.policyReason ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}
