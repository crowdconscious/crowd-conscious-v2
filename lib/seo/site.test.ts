import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeSiteUrl } from './site'

describe('normalizeSiteUrl', () => {
  it('defaults empty input to www', () => {
    assert.equal(normalizeSiteUrl(''), 'https://www.crowdconscious.app')
    assert.equal(normalizeSiteUrl('   '), 'https://www.crowdconscious.app')
  })

  it('strips trailing slash', () => {
    assert.equal(
      normalizeSiteUrl('https://www.crowdconscious.app/'),
      'https://www.crowdconscious.app'
    )
  })

  it('preserves an explicit apex env value (safe either way)', () => {
    assert.equal(
      normalizeSiteUrl('https://crowdconscious.app'),
      'https://crowdconscious.app'
    )
  })
})
