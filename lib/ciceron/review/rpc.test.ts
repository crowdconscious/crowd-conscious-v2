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

  it('rpcSaveReviewEdit and rpcReassignReview parse jsonb ok and denials', async () => {
    const okDb: ReviewRpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } = {
      calls: [],
      async rpc(fn, args) {
        okDb.calls.push({ fn, args })
        if (fn === 'save_review_edit') {
          return { data: { ok: true, id: 'version-id' }, error: null }
        }
        return { data: { ok: true }, error: null }
      },
    }
    const saveOk = await rpcSaveReviewEdit(okDb, {
      actorId: 'a',
      taskId: 't',
      editedBody: 'x',
    })
    assert.equal(saveOk.ok, true)
    if (saveOk.ok) assert.equal(saveOk.id, 'version-id')
    const reassignOk = await rpcReassignReview(okDb, {
      actorId: 'a',
      taskId: 't',
      newAssigneeId: 'b',
    })
    assert.equal(reassignOk.ok, true)
    assert.equal(okDb.calls[0]!.fn, 'save_review_edit')
    assert.equal(okDb.calls[1]!.fn, 'reassign_review')

    const denyDb: ReviewRpcClient = {
      async rpc() {
        return {
          data: {
            ok: false,
            policy_id: 'matter_member',
            policy_reason: 'Actor is not a member of this matter',
          },
          error: null,
        }
      },
    }
    const denied = await rpcSaveReviewEdit(denyDb, {
      actorId: 'a',
      taskId: 't',
      editedBody: 'x',
    })
    assert.equal(denied.ok, false)
    if (!denied.ok) assert.equal(denied.policyId, 'matter_member')
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
    assert.match(sql, /policy_id', 'role'/)
    assert.match(sql, /policy_id', 'delivery_exists'/)
    assert.match(sql, /DROP POLICY IF EXISTS review_decisions_select/)
    assert.match(sql, /DROP POLICY IF EXISTS deliveries_select/)
    assert.match(sql, /RETURNS jsonb/)
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
