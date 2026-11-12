import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  CICERON_EVENT_NAMES,
  FORBIDDEN_EVENT_PROPERTY_KEYS,
  assertNoForbiddenKeys,
  parseEventProperties,
  recordCiceronEvent,
} from './events'

describe('ciceron events allow-list', () => {
  it('documents every catalog name in EVENTS.md', () => {
    const md = readFileSync('docs/ciceron/EVENTS.md', 'utf8')
    for (const name of CICERON_EVENT_NAMES) {
      assert.match(md, new RegExp(`\`${name}\``))
    }
  })

  it('rejects forbidden and non-allow-listed property keys', () => {
    for (const key of FORBIDDEN_EVENT_PROPERTY_KEYS) {
      const r = assertNoForbiddenKeys({ [key]: 'secret', match_id: 'x' })
      assert.equal(r.ok, false)
    }
    assert.equal(assertNoForbiddenKeys({ alert_id: 'x' }).ok, false)
    assert.equal(assertNoForbiddenKeys({ match_id: 'ok', verdict: 'relevant' }).ok, true)
  })

  it('rejects unsafe string codes', () => {
    const bad = parseEventProperties('alert_feedback', {
      verdict: 'not_relevant',
      reason_code: 'has spaces and ñ',
    })
    assert.equal(bad.ok, false)
  })

  it('parses alert_feedback without free text', () => {
    const ok = parseEventProperties('alert_feedback', {
      verdict: 'not_relevant',
      reason_code: 'wrong_authority',
      is_demo: true,
    })
    assert.equal(ok.ok, true)

    const bad = parseEventProperties('alert_feedback', {
      verdict: 'not_relevant',
      client_name: 'Nexora',
    })
    assert.equal(bad.ok, false)
    assert.match((bad as { message: string }).message, /forbidden/)
  })

  it('rejects question text on research_asked', () => {
    const bad = parseEventProperties('research_asked', {
      question: '¿Cuál es el plazo?',
      matter_id: 'd1000000-0000-4000-8000-000000000001',
    })
    assert.equal(bad.ok, false)
  })

  it('recordCiceronEvent refuses forbidden keys before insert', async () => {
    const inserts: unknown[] = []
    const db = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row)
          return { error: null }
        },
      }),
    }
    const result = await recordCiceronEvent(
      {
        name: 'alert_opened',
        firmId: 'a1000000-0000-4000-8000-000000000001',
        userId: 'b1000000-0000-4000-8000-000000000001',
        // @ts-expect-error intentional forbidden key for runtime test
        properties: { client_name: 'Nexora' },
      },
      db
    )
    assert.equal(result.ok, false)
    if (result.ok === false) assert.equal(result.reason, 'forbidden_key')
    assert.equal(inserts.length, 0)
  })

  it('recordCiceronEvent inserts allow-listed payload', async () => {
    const inserts: Record<string, unknown>[] = []
    const db = {
      from: () => ({
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row)
          return { error: null }
        },
      }),
    }
    const result = await recordCiceronEvent(
      {
        name: 'room_opened',
        firmId: 'a1000000-0000-4000-8000-000000000001',
        userId: 'b1000000-0000-4000-8000-000000000001',
        properties: { room: 'hoy', is_demo: true },
      },
      db
    )
    assert.equal(result.ok, true)
    assert.equal(inserts[0]?.name, 'room_opened')
    assert.deepEqual(inserts[0]?.properties, { room: 'hoy', is_demo: true })
  })
})
