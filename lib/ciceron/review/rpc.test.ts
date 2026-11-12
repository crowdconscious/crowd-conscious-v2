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
  it('rpcDecideReview maps args', async () => {
    const db = mockRpc(() => null)
    const result = await rpcDecideReview(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      taskId: 'g1000000-0000-4000-8000-000000000041',
      decision: 'approved',
    })
    assert.equal(result.ok, true)
    assert.equal(db.calls[0]!.fn, 'decide_review')
    assert.equal(db.calls[0]!.args?.p_decision, 'approved')
  })

  it('rpcDecideReview surfaces four-eyes errors', async () => {
    const db = mockRpc(() => ({
      message: 'four-eyes: editor cannot give final approval',
    }))
    const result = await rpcDecideReview(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      taskId: 'g1000000-0000-4000-8000-000000000041',
      decision: 'approved',
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.match(result.message, /four-eyes/i)
  })

  it('rpcCreateDelivery requires confirm flag in args', async () => {
    const db = mockRpc(() => null)
    await rpcCreateDelivery(db, {
      actorId: 'a',
      aiOutputId: 'o',
      matterId: 'm',
      channel: 'email',
      recipient: 'r@x.demo',
      subject: 's',
      body: 'b',
      confirm: true,
    })
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
    ]) {
      assert.match(sql, new RegExp(`FUNCTION ciceron\\.${name}`))
    }
    assert.match(sql, /SET search_path = ciceron/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION ciceron\.decide_review[\s\S]*TO service_role/)
    assert.match(sql, /REVOKE ALL ON FUNCTION ciceron\.decide_review[\s\S]*FROM PUBLIC, anon, authenticated/)
    assert.match(sql, /already decided/)
    assert.match(sql, /four-eyes: editor cannot give final approval/)
  })

  it('audit shape includes outcome and policy fields for Prompt 9', () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS outcome/)
    assert.match(sql, /policy_id/)
    assert.match(sql, /policy_reason/)
    assert.match(sql, /snapshot_ref/)
  })

  it('stricter deliveries_tier2_gate is persona-aware', () => {
    assert.match(sql, /COALESCE\(rd\.decided_by, rd\.decided_by_persona\)/)
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
