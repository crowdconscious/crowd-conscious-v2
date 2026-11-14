import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'

type UpdateCall = { table: string; payload: Record<string, unknown>; id?: string }

function createMockDb(calls: UpdateCall[]) {
  return {
    from(table: string) {
      const builder: {
        select: (...args: unknown[]) => typeof builder
        eq: (column: string, value: string) => typeof builder
        order: (...args: unknown[]) => typeof builder
        limit: (...args: unknown[]) => typeof builder
        update: (payload: Record<string, unknown>) => typeof builder
        then: Promise<{ data: unknown; error: null }>['then']
      } = {
        select: () => builder,
        eq: (column: string, value: string) => {
          const last = calls[calls.length - 1]
          if (last && column === 'id' && last.id === undefined) last.id = value
          return builder
        },
        order: () => builder,
        limit: () => builder,
        update: (payload: Record<string, unknown>) => {
          calls.push({ table, payload })
          return builder
        },
        then(onFulfilled, onRejected) {
          // Note with no readable text: document_id missing so loadNoteText returns null.
          const data =
            table === 'dof_notes'
              ? [
                  {
                    id: '318bbbb5-348f-4b83-9f1e-ab228943f8ea',
                    note_code: '5802676',
                    title: 'Aviso REF:581596',
                    authority: null,
                    document_id: null,
                  },
                ]
              : []
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
        },
      }
      return builder
    },
  }
}

describe('classifyDofNote skip path', () => {
  it('sets match_status to skipped when note text cannot be loaded', async () => {
    // Defense in depth: never construct a real service-role client in this test.
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const calls: UpdateCall[] = []
    mock.module('@/lib/ciceron/db/admin', {
      namedExports: {
        tryCreateCiceronAdminClient: () => createMockDb(calls),
      },
    })

    const { classifyDofNote } = await import('./classify')
    const result = await classifyDofNote(
      '318bbbb5-348f-4b83-9f1e-ab228943f8ea'
    )

    assert.equal(result.ok, false)
    assert.equal(result.error, 'no text')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].table, 'dof_notes')
    assert.equal(calls[0].id, '318bbbb5-348f-4b83-9f1e-ab228943f8ea')
    assert.deepEqual(calls[0].payload, {
      classify_status: 'skipped',
      match_status: 'skipped',
    })
  })
})
