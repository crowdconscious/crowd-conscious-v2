import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { diffLines } from '@/lib/ciceron/review/diff'

describe('diffLines', () => {
  it('marks additions and removals', () => {
    const diff = diffLines('uno\ndos\ntres', 'uno\ndos editado\ntres')
    assert.ok(diff.some((l) => l.kind === 'remove' && l.text === 'dos'))
    assert.ok(diff.some((l) => l.kind === 'add' && l.text === 'dos editado'))
    assert.ok(diff.some((l) => l.kind === 'same' && l.text === 'uno'))
  })

  it('handles identical bodies', () => {
    const diff = diffLines('a\nb', 'a\nb')
    assert.deepEqual(
      diff.map((l) => l.kind),
      ['same', 'same']
    )
  })
})
