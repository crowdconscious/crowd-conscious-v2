import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  excludeStandOnly,
  isStandOnly,
  STAND_ONLY_EXCLUDE_OR,
  STAND_ONLY_TAG,
} from './discovery-filters.ts'

describe('discovery-filters', () => {
  it('exports the stand-only tag and null-safe or-filter', () => {
    assert.equal(STAND_ONLY_TAG, 'stand-only')
    assert.equal(STAND_ONLY_EXCLUDE_OR, 'tags.is.null,tags.not.cs.{stand-only}')
  })

  it('isStandOnly is null-safe', () => {
    assert.equal(isStandOnly(null), false)
    assert.equal(isStandOnly(undefined), false)
    assert.equal(isStandOnly([]), false)
    assert.equal(isStandOnly(['pulse', 'cdmx']), false)
    assert.equal(isStandOnly(['stand-only']), true)
    assert.equal(isStandOnly(['semana-accion-stand', 'stand-only']), true)
  })

  it('excludeStandOnly chains .or with the null-safe filter', () => {
    const calls: string[] = []
    const fake = {
      or(filters: string) {
        calls.push(filters)
        return fake
      },
    }
    const out = excludeStandOnly(fake)
    assert.equal(out, fake)
    assert.deepEqual(calls, [STAND_ONLY_EXCLUDE_OR])
  })
})
