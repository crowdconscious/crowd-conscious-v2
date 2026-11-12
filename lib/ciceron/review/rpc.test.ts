import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  rpcCreateDelivery,
  rpcDecideReview,
  rpcReassignReview,
  rpcSaveReviewEdit,
  type ReviewRpcClient,
} from '@/lib/ciceron/review/rpc'

function mockRpc(
  handler: (
    fn: string,
    args?: Record<string, unknown>
  ) => { message: string } | null
): ReviewRpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } {
  const calls: Array<{ fn: string; args?: Record<string, unknown> }> = []
  return {
    calls,
    async rpc(fn, args) {
      calls.push({ fn, args })
      const err = handler(fn, args)
      return { data: err ? null : 'decision-id', error: err }
    },
  }
}

describe('review RPC wrappers', () => {
  it('rpcDecideReview maps args and parses jsonb ok', async () => {
    const db: ReviewRpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } = {
      calls: [],
      async rpc(fn, args) {
        db.calls.push({ fn, args })
        return { data: { ok: true, id: 'decision-id' }, error: null }
      },
    }
    const result = await rpcDecideReview(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      taskId: 'f1000000-0000-4000-8000-000000000141',
      decision: 'approved',
    })
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.id, 'decision-id')
    assert.equal(db.calls[0]!.fn, 'decide_review')
    assert.equal(db.calls[0]!.args?.p_decision, 'approved')
  })

  it('rpcDecideReview surfaces four-eyes policy denial from jsonb', async () => {
    const db: ReviewRpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } = {
      calls: [],
      async rpc(fn, args) {
        db.calls.push({ fn, args })
        return {
          data: {
            ok: false,
            policy_id: 'four_eyes',
            policy_reason: 'Editor cannot give final approval on this output type',
          },
          error: null,
        }
      },
    }
    const result = await rpcDecideReview(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      taskId: 'f1000000-0000-4000-8000-000000000141',
      decision: 'approved',
    })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.policyId, 'four_eyes')
      assert.match(result.message, /Editor cannot give final approval/i)
    }
  })

  it('rpcCreateDelivery requires confirm flag in args', async () => {
    const db: ReviewRpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } = {
      calls: [],
      async rpc(fn, args) {
        db.calls.push({ fn, args })
        return { data: { ok: true, id: 'delivery-id' }, error: null }
      },
    }
    const result = await rpcCreateDelivery(db, {
      actorId: 'a',
      aiOutputId: 'o',
      matterId: 'm',
      channel: 'email',
      recipient: 'r@x.demo',
      subject: 's',
      body: 'b',
      confirm: true,
    })
    assert.equal(result.ok, true)
    assert.equal(db.calls[0]!.fn, 'create_delivery')
    assert.equal(db.calls[0]!.args?.p_confirm, true)
  })

  it('rpcSaveReviewEdit and rpcReassignReview call expected functions', async () => {
    const db = mockRpc(() => null)
    await rpcSaveReviewEdit(db, { actorId: 'a', taskId: 't', editedBody: 'x' })
    await rpcReassignReview(db, { actorId: 'a', taskId: 't', newAssigneeId: 'b' })
    assert.equal(db.calls[0]!.fn, 'save_review_edit')
    assert.equal(db.calls[1]!.fn, 'reassign_review')
  })
})

describe('312 migration SQL contracts', () => {
  const sql = readFileSync('supabase/migrations/312_ciceron_review_queue.sql', 'utf8')

  it('RPCs are SECURITY DEFINER with ciceron search_path and service_role only', () => {
    for (const name of [
      'decide_review',
      'save_review_edit',
      'reassign_review',
      'create_delivery',
      'write_audit_event',
      'review_decisions_authority',
    ]) {
      assert.match(sql, new RegExp(`FUNCTION ciceron\\.${name}`))
    }
    assert.match(sql, /SET search_path = ciceron/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION ciceron\.decide_review[\s\S]*TO service_role/)
    assert.match(sql, /REVOKE ALL ON FUNCTION ciceron\.decide_review[\s\S]*FROM PUBLIC, anon, authenticated/)
    assert.match(sql, /already decided/)
    assert.match(sql, /'ok', false/)
    assert.match(sql, /policy_id', 'four_eyes'/)
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON ciceron\.review_decisions/)
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON ciceron\.deliveries/)
  })

  it('audit shape includes outcome and policy fields for Prompt 9', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS outcome/)
    assert.match(sql, /policy_id/)
    assert.match(sql, /policy_reason/)
    assert.match(sql, /snapshot_ref/)
  })

  it('stricter deliveries_tier2_gate is persona-aware and uses bool_or', () => {
    assert.match(sql, /COALESCE\(rd\.decided_by, rd\.decided_by_persona\)/)
    assert.match(sql, /bool_or\(rt\.output_type = ANY/)
    assert.match(sql, /BEFORE INSERT OR UPDATE ON ciceron\.deliveries/)
  })

  it('returned decisions reopen as pendiente', () => {
    assert.match(sql, /p_decision = 'returned' THEN\s+task_status := 'pendiente'/)
  })
})

describe('actions use RPC path', () => {
  it('review actions call rpc helpers', () => {
    const src = readFileSync('lib/ciceron/review/actions.ts', 'utf8')
    assert.match(src, /rpcDecideReview/)
    assert.match(src, /rpcCreateDelivery/)
    assert.match(src, /resolveCiceronActionActor/)
  })
})
