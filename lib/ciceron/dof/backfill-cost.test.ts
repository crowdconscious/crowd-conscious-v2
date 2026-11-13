import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COST_CAP_USD,
  isSpendAtCap,
  projectBatchAffordable,
} from './backfill-cost'
import { shouldStartAnotherBatch } from './backfill-batch'

describe('ciceron dof backfill cost cap', () => {
  it('hard-stops when spend reaches the US$60 cap', () => {
    assert.equal(COST_CAP_USD, 60)
    assert.equal(isSpendAtCap(59.99), false)
    assert.equal(isSpendAtCap(60), true)
    assert.equal(isSpendAtCap(60.01), true)
  })

  it('refuses a batch that would exceed remaining budget', () => {
    const over = projectBatchAffordable({
      spentUsd: 59.99,
      batchLimit: 6,
      perNoteUsd: 0.05,
    })
    assert.equal(over.ok, false)
    if (!over.ok) {
      assert.equal(over.reason, 'batch_would_exceed_cap')
      assert.ok(over.remainingBudgetUsd < 0.05)
    }

    const ok = projectBatchAffordable({
      spentUsd: 50,
      batchLimit: 6,
      perNoteUsd: 0.01,
    })
    assert.equal(ok.ok, true)
    if (ok.ok) {
      assert.ok(ok.batchLimit >= 1)
      assert.ok(ok.batchLimit <= 6)
    }
  })

  it('shouldStartAnotherBatch stops on cap, empty queue, and wall clock', () => {
    assert.deepEqual(
      shouldStartAnotherBatch({
        spentUsd: 60,
        remainingNotes: 100,
        elapsedMs: 0,
        wallClockMs: 240_000,
      }),
      { ok: false, reason: 'spend_cap_reached' }
    )
    assert.deepEqual(
      shouldStartAnotherBatch({
        spentUsd: 10,
        remainingNotes: 0,
        elapsedMs: 0,
        wallClockMs: 240_000,
      }),
      { ok: false, reason: 'done' }
    )
    assert.deepEqual(
      shouldStartAnotherBatch({
        spentUsd: 10,
        remainingNotes: 50,
        elapsedMs: 240_000,
        wallClockMs: 240_000,
      }),
      { ok: false, reason: 'wall_clock' }
    )
    assert.deepEqual(
      shouldStartAnotherBatch({
        spentUsd: 10,
        remainingNotes: 50,
        elapsedMs: 1000,
        wallClockMs: 240_000,
      }),
      { ok: true }
    )
  })
})
