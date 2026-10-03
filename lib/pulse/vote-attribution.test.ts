import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildPulseRedirectPath,
  parseVoteAttribution,
  sanitizeAttributionParam,
  VOTE_ATTRIBUTION_MAX_LEN,
} from './vote-attribution.ts'

describe('sanitizeAttributionParam', () => {
  it('accepts short safe slugs', () => {
    assert.equal(sanitizeAttributionParam('qr'), 'qr')
    assert.equal(sanitizeAttributionParam('social_ig'), 'social_ig')
    assert.equal(sanitizeAttributionParam('semana-accion'), 'semana-accion')
    assert.equal(sanitizeAttributionParam('Semana-Accion'), 'semana-accion')
  })

  it('rejects empty, overlong, and unsafe charset', () => {
    assert.equal(sanitizeAttributionParam(''), null)
    assert.equal(sanitizeAttributionParam(null), null)
    assert.equal(sanitizeAttributionParam(undefined), null)
    assert.equal(sanitizeAttributionParam('a'.repeat(VOTE_ATTRIBUTION_MAX_LEN + 1)), null)
    assert.equal(sanitizeAttributionParam('bad value'), null)
    assert.equal(sanitizeAttributionParam('via=<script>'), null)
    assert.equal(sanitizeAttributionParam('../../etc'), null)
  })
})

describe('parseVoteAttribution', () => {
  it('parses via and src independently', () => {
    assert.deepEqual(parseVoteAttribution({ via: 'semana-accion', src: 'qr' }), {
      via: 'semana-accion',
      src: 'qr',
    })
    assert.deepEqual(parseVoteAttribution({ via: 'ok', src: 'no spaces' }), {
      via: 'ok',
      src: null,
    })
  })
})

describe('buildPulseRedirectPath', () => {
  it('appends sanitized via/src query params', () => {
    assert.equal(
      buildPulseRedirectPath('abc-123', { via: 'semana-accion', src: 'social_ig' }),
      '/pulse/abc-123?via=semana-accion&src=social_ig'
    )
    assert.equal(
      buildPulseRedirectPath('abc-123', { via: null, src: null }),
      '/pulse/abc-123'
    )
  })
})
