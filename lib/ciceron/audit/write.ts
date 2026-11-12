/**
 * Append-only audit helpers for Cicéron (rule 7).
 * Prompt 9 will log RBAC/ABAC denials via recordAuditDenial.
 */

export type AuditOutcome = 'allowed' | 'denied'

export type AuditEventInput = {
  firmId: string
  userId: string | null
  action: string
  entityType: string
  entityId?: string | null
  payload?: Record<string, unknown>
  outcome?: AuditOutcome
  policyId?: string | null
  policyReason?: string | null
  snapshotRef?: Record<string, unknown>
}

export type AuditInsertClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }
}

export function auditEventRow(input: AuditEventInput): Record<string, unknown> {
  return {
    firm_id: input.firmId,
    user_id: input.userId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {},
    outcome: input.outcome ?? 'allowed',
    policy_id: input.policyId ?? null,
    policy_reason: input.policyReason ?? null,
    snapshot_ref: input.snapshotRef ?? {},
  }
}

export async function recordAuditEvent(
  db: AuditInsertClient,
  input: AuditEventInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await db.from('audit_events').insert(auditEventRow(input))
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

/** Helper for Prompt 9: every denied action must name the blocking rule. */
export async function recordAuditDenial(
  db: AuditInsertClient,
  input: Omit<AuditEventInput, 'outcome'> & {
    policyId: string
    policyReason: string
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  return recordAuditEvent(db, {
    ...input,
    outcome: 'denied',
    policyId: input.policyId,
    policyReason: input.policyReason,
  })
}
