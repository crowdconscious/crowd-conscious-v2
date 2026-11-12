import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { auditEventRow, recordAuditDenial } from '@/lib/ciceron/audit/write'

describe('audit helpers', () => {
  it('defaults outcome to allowed', () => {
    const row = auditEventRow({
      firmId: 'f',
      userId: 'u',
      action: 'view_client_material',
      entityType: 'clients',
    })
    assert.equal(row.outcome, 'allowed')
    assert.deepEqual(row.snapshot_ref, {})
  })

  it('recordAuditDenial forces denied + policy fields', async () => {
    const inserts: Record<string, unknown>[] = []
    const db = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row)
          return { error: null }
        },
      }),
    }
    const result = await recordAuditDenial(db, {
      firmId: 'f',
      userId: 'u',
      action: 'review_decide',
      entityType: 'review_tasks',
      entityId: 't',
      policyId: 'four_eyes',
      policyReason: 'Editor cannot give final approval',
    })
    assert.equal(result.ok, true)
    assert.equal(inserts[0]!.outcome, 'denied')
    assert.equal(inserts[0]!.policy_id, 'four_eyes')
  })
})
