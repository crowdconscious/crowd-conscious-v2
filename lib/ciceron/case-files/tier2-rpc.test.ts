import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  rpcApproveClientNotify,
  rpcConfirmDeadline,
  type Tier2RpcClient,
} from '@/lib/ciceron/case-files/tier2-rpc'

function mockRpc(
  handler: (
    fn: string,
    args?: Record<string, unknown>
  ) => { message: string } | null
): Tier2RpcClient & { calls: Array<{ fn: string; args?: Record<string, unknown> }> } {
  const calls: Array<{ fn: string; args?: Record<string, unknown> }> = []
  return {
    calls,
    async rpc(fn, args) {
      calls.push({ fn, args })
      return { data: null, error: handler(fn, args) }
    },
  }
}

describe('tier2 RPC wrappers (action→RPC path)', () => {
  it('rpcConfirmDeadline calls confirm_deadline with actor + deadline', async () => {
    const db = mockRpc(() => null)
    const result = await rpcConfirmDeadline(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      deadlineId: 'd1000000-0000-4000-8000-000000000001',
      decision: 'confirmado',
    })
    assert.equal(result.ok, true)
    assert.equal(db.calls.length, 1)
    assert.equal(db.calls[0]!.fn, 'confirm_deadline')
    assert.deepEqual(db.calls[0]!.args, {
      p_actor: 'b1000000-0000-4000-8000-000000000001',
      p_deadline_id: 'd1000000-0000-4000-8000-000000000001',
      p_decision: 'confirmado',
    })
  })

  it('rpcConfirmDeadline surfaces RPC errors', async () => {
    const db = mockRpc(() => ({
      message: 'only socio, asociado, or admin may confirm deadlines',
    }))
    const result = await rpcConfirmDeadline(db, {
      actorId: 'b1000000-0000-4000-8000-000000000003',
      deadlineId: 'd1000000-0000-4000-8000-000000000001',
    })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.match(result.message, /socio|asociado/i)
    }
  })

  it('rpcApproveClientNotify calls approve_client_notify', async () => {
    const db = mockRpc(() => null)
    const result = await rpcApproveClientNotify(db, {
      actorId: 'b1000000-0000-4000-8000-000000000001',
      draftId: 'n1000000-0000-4000-8000-000000000001',
    })
    assert.equal(result.ok, true)
    assert.equal(db.calls[0]!.fn, 'approve_client_notify')
    assert.deepEqual(db.calls[0]!.args, {
      p_actor: 'b1000000-0000-4000-8000-000000000001',
      p_draft_id: 'n1000000-0000-4000-8000-000000000001',
    })
  })

  it('confirmDeadlineAction / approveClientNotifySim use RPCs not raw updates', () => {
    const src = readFileSync('lib/ciceron/case-files/actions.ts', 'utf8')
    assert.match(src, /rpcConfirmDeadline/)
    assert.match(src, /rpcApproveClientNotify/)
    assert.match(src, /resolveCiceronActionActor/)
    assert.doesNotMatch(
      src,
      /deadlineConfirmColumns\(/
    )
    assert.doesNotMatch(
      src,
      /notifyApproveColumns\(/
    )
  })

  it('310 defines service-role-only confirm/approve RPCs with set_actor', () => {
    const sql = readFileSync(
      'supabase/migrations/310_ciceron_expedientes_fixups.sql',
      'utf8'
    )
    assert.match(sql, /CREATE OR REPLACE FUNCTION ciceron\.confirm_deadline/)
    assert.match(sql, /CREATE OR REPLACE FUNCTION ciceron\.approve_client_notify/)
    assert.match(sql, /PERFORM ciceron\.set_actor\(p_actor\)/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION ciceron\.confirm_deadline/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION ciceron\.approve_client_notify/)
    assert.match(sql, /REVOKE ALL ON FUNCTION ciceron\.confirm_deadline/)
    assert.match(sql, /current_actor_id\(\)/)
  })
})
