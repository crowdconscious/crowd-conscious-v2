import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeededRng, seededShuffle, hashSeed } from './prng.ts'

test('hashSeed is stable', () => {
  assert.equal(hashSeed('fixture-run'), hashSeed('fixture-run'))
  assert.notEqual(hashSeed('a'), hashSeed('b'))
})

test('createSeededRng is deterministic', () => {
  const a = createSeededRng('run-1')
  const b = createSeededRng('run-1')
  const seqA = Array.from({ length: 20 }, () => a.next())
  const seqB = Array.from({ length: 20 }, () => b.next())
  assert.deepEqual(seqA, seqB)
})

test('seededShuffle is deterministic and permutes', () => {
  const items = Array.from({ length: 30 }, (_, i) => i)
  const once = seededShuffle(items, createSeededRng('shuffle'))
  const twice = seededShuffle(items, createSeededRng('shuffle'))
  assert.deepEqual(once, twice)
  assert.notDeepEqual(once, items)
  assert.deepEqual([...once].sort((x, y) => x - y), items)
})
