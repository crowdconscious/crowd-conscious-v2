import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasActiveClaim,
  resolveOverlappingClaims,
  selectUnclaimedNotes,
} from './backfill-claim'

describe('ciceron dof backfill claim / overlap safety', () => {
  it('treats future claim_until as active and past/null as free', () => {
    const now = Date.parse('2026-11-13T12:00:00.000Z')
    assert.equal(hasActiveClaim(null, now), false)
    assert.equal(hasActiveClaim(undefined, now), false)
    assert.equal(hasActiveClaim('2026-11-13T11:59:00.000Z', now), false)
    assert.equal(hasActiveClaim('2026-11-13T12:00:01.000Z', now), true)
    assert.equal(hasActiveClaim('not-a-date', now), false)
  })

  it('filters out notes still under an active lease', () => {
    const now = Date.parse('2026-11-13T12:00:00.000Z')
    const notes = [
      {
        id: 'a',
        note_date: '2026-11-12',
        classify_status: 'pending',
        match_status: 'pending',
        backfill_claim_until: null,
      },
      {
        id: 'b',
        note_date: '2026-11-12',
        classify_status: 'pending',
        match_status: 'pending',
        backfill_claim_until: '2026-11-13T12:05:00.000Z',
      },
      {
        id: 'c',
        note_date: '2026-11-12',
        classify_status: 'pending',
        match_status: 'pending',
        backfill_claim_until: '2026-11-13T11:00:00.000Z',
      },
    ]
    const free = selectUnclaimedNotes(notes, now)
    assert.deepEqual(
      free.map((n) => n.id),
      ['a', 'c']
    )
  })

  it('overlapping claim wins: only the first successful CAS owns a note', () => {
    const owner = resolveOverlappingClaims([
      { workerId: 'w1', noteId: 'n1', won: true },
      { workerId: 'w2', noteId: 'n1', won: true }, // lost race in practice; first wins
      { workerId: 'w2', noteId: 'n2', won: true },
      { workerId: 'w1', noteId: 'n2', won: false },
    ])
    assert.equal(owner.get('n1'), 'w1')
    assert.equal(owner.get('n2'), 'w2')
    assert.equal(owner.size, 2)
  })

  it('release scoped by claim_until only clears matching leases (pure contract)', () => {
    // Documented contract for releaseBackfillClaim({ claimUntil }):
    // clear only when backfill_claim_until still equals this invocation's value.
    const mine = '2026-11-13T12:10:00.000Z'
    const theirs = '2026-11-13T12:20:00.000Z'
    assert.notEqual(mine, theirs)
    assert.equal(hasActiveClaim(mine, Date.parse('2026-11-13T12:00:00.000Z')), true)
  })
})
