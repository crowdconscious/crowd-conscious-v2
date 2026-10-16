import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickCondesaPulse, type CondesaPulseRow } from './condesa-redirect.ts'

const NOW = Date.parse('2026-10-20T18:00:00Z')
const row = (id: string, pub: string | null, res: string | null, metadata: unknown = {}): CondesaPulseRow => ({
  id, published_at: pub, resolution_date: res, created_at: '2026-10-01T00:00:00Z', metadata,
})

test('empty → null', () => assert.equal(pickCondesaPulse([], NOW), null))

test('picks most recently opened among open Pulses', () => {
  const p = pickCondesaPulse([
    row('w0', '2026-10-12T06:00:00Z', '2026-10-30T05:59:00Z'),
    row('w1', '2026-10-19T06:00:00Z', '2026-10-26T05:59:00Z'),
  ], NOW)
  assert.equal(p?.id, 'w1')
})

test('skips not-yet-open (future published_at or metadata.opens_at)', () => {
  const p = pickCondesaPulse([
    row('w1', '2026-10-19T06:00:00Z', '2026-10-26T05:59:00Z'),
    row('w2', '2026-10-15T06:00:00Z', '2026-11-02T05:59:00Z', { opens_at: '2026-10-26T06:00:00Z' }),
    row('w3', '2026-10-27T06:00:00Z', '2026-11-09T05:59:00Z'),
  ], NOW)
  assert.equal(p?.id, 'w1')
})

test('skips closed or missing resolution_date', () => {
  assert.equal(pickCondesaPulse([
    row('closed', '2026-10-12T06:00:00Z', '2026-10-19T05:59:00Z'),
    row('nores', '2026-10-19T06:00:00Z', null),
  ], NOW), null)
})
