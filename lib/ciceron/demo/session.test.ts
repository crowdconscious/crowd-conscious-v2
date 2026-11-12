import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { hashSessionToken } from '@/lib/ciceron/demo/invite-hash'

type RpcCall = { fn: string; args?: Record<string, unknown> }

/**
 * Mimic supabase-js PostgREST builders: work only starts when then/await runs.
 * A bare `void db.rpc(...)` must NOT push into `calls`.
 */
function createLazyRpc(calls: RpcCall[]) {
  return (fn: string, args?: Record<string, unknown>) => {
    const run = async () => {
      calls.push({ fn, args })
      if (fn === 'resolve_demo_session') {
        return {
          data: {
            ok: true,
            session_id: 's1000000-0000-4000-8000-000000000001',
            firm_id: CICERON_SEED.firmDemo,
            persona_id: CICERON_SEED.personas.socio,
            role: 'socio',
            display_name: 'Socia Demo Rivera',
            invite_code_id: 'i1000000-0000-4000-8000-000000000001',
            story_dismissed: false,
            last_freshness_at: null,
          },
          error: null,
        }
      }
      if (fn === 'touch_session_freshness') {
        return { data: { ok: true, touched: true }, error: null }
      }
      return { data: null, error: { message: `unexpected rpc ${fn}` } }
    }
    return {
      then(
        onFulfilled?: ((value: unknown) => unknown) | null,
        onRejected?: ((reason: unknown) => unknown) | null
      ) {
        return run().then(onFulfilled, onRejected)
      },
    }
  }
}

describe('demo session freshness', () => {
  it('invokes touch_session_freshness when resolving a DB session', async () => {
    mock.module('server-only', { defaultExport: {} })
    mock.module('next/headers', {
      namedExports: {
        cookies: async () => ({ get: () => undefined }),
      },
    })

    const calls: RpcCall[] = []
    const rpc = createLazyRpc(calls)
    mock.module('@/lib/ciceron/db/client', {
      namedExports: {
        tryCreateCiceronAdminClient: () => ({ rpc }),
        createCiceronAdminClient: () => ({ rpc }),
        createCiceronUserClient: async () => ({ rpc }),
        tryCreateCiceronAdminStorage: () => null,
        createCiceronAdminStorage: () => null,
      },
    })

    const { resolveSessionByToken } = await import('@/lib/ciceron/demo/session')
    const token = 'ab'.repeat(32)
    const session = await resolveSessionByToken(token)

    assert.ok(session)
    assert.equal(session.offline, false)
    assert.equal(session.persona.id, CICERON_SEED.personas.socio)

    const resolveCall = calls.find((c) => c.fn === 'resolve_demo_session')
    const freshnessCall = calls.find((c) => c.fn === 'touch_session_freshness')
    assert.ok(resolveCall, 'resolve_demo_session must run')
    assert.ok(freshnessCall, 'touch_session_freshness must run on session start')
    assert.equal(freshnessCall.args?.p_token_hash, hashSessionToken(token))
    assert.deepEqual(
      calls.map((c) => c.fn),
      ['resolve_demo_session', 'touch_session_freshness']
    )
  })
})
