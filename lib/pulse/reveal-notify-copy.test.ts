import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildPulseRevealReadyPush, isRevealReady } from './reveal-notify-copy.ts'

const base = { id: 'm1', title: 'T', status: 'active', total_votes: 3, resolution_date: null }

describe('isRevealReady', () => {
  it('waits below threshold while open', () => {
    assert.equal(isRevealReady({ ...base, total_votes: 24 }), false)
  })
  it('fires at threshold 25', () => {
    assert.equal(isRevealReady({ ...base, total_votes: 25 }), true)
  })
  it('fires when closed or past resolution date', () => {
    assert.equal(isRevealReady({ ...base, status: 'resolved' }), true)
    assert.equal(
      isRevealReady({ ...base, resolution_date: '2026-01-01T00:00:00Z' }, new Date('2026-02-01')),
      true
    )
  })
})

describe('buildPulseRevealReadyPush', () => {
  it('uses Spanish copy and deep-links to the Pulse', () => {
    const p = buildPulseRevealReadyPush({ marketId: 'abc', marketTitle: 'X', locale: 'es' })
    assert.equal(p.title, 'Ya hay suficientes votos: mira cómo se compara tu certeza')
    assert.equal(p.data.route, '/(drawer)/(tabs)/pulses/abc')
  })
})
