import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { copy } from './es-MX'

describe('ciceron plain-language copy', () => {
  it('avoids tech jargon in primary room labels', () => {
    assert.equal(copy.rooms['monitor-dof'], 'Diario Oficial')
    assert.equal(copy.monitor.title, 'Diario Oficial')
    assert.doesNotMatch(copy.monitor.title, /\bDOF\b/)
    assert.doesNotMatch(JSON.stringify(copy), /\bKPI\b/)
  })

  it('keeps tip strings for legal terms', () => {
    assert.match(copy.tips.dof, /Diario Oficial/)
    assert.match(copy.tips.boletin, /tribunal/i)
    assert.match(copy.tips.plazo, /límite/i)
  })
})
