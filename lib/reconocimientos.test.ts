import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import {
  getReconocimientosConfig,
  getReconocimientosFormUrl,
  withReconocimientosSrc,
} from './reconocimientos.ts'

const ENV_KEY = 'RECONOCIMIENTOS_FORM_URL'

describe('reconocimientos config', () => {
  let previous: string | undefined

  beforeEach(() => {
    previous = process.env[ENV_KEY]
  })

  afterEach(() => {
    if (previous === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = previous
  })

  it('disables when unset', () => {
    delete process.env[ENV_KEY]
    assert.equal(getReconocimientosFormUrl(), null)
    assert.deepEqual(getReconocimientosConfig(), { enabled: false, url: null })
  })

  it('disables when empty or whitespace', () => {
    process.env[ENV_KEY] = '   '
    assert.equal(getReconocimientosFormUrl(), null)
  })

  it('disables non-https URLs', () => {
    process.env[ENV_KEY] = 'http://example.com/form'
    assert.equal(getReconocimientosFormUrl(), null)
  })

  it('disables invalid URLs', () => {
    process.env[ENV_KEY] = 'not-a-url'
    assert.equal(getReconocimientosFormUrl(), null)
  })

  it('enables valid https URL', () => {
    process.env[ENV_KEY] = 'https://tally.so/r/abc123'
    assert.equal(getReconocimientosFormUrl(), 'https://tally.so/r/abc123')
    assert.deepEqual(getReconocimientosConfig(), {
      enabled: true,
      url: 'https://tally.so/r/abc123',
    })
  })

  it('appends src while preserving existing query params', () => {
    const withSrc = withReconocimientosSrc(
      'https://tally.so/r/abc123?foo=1',
      'web'
    )
    const parsed = new URL(withSrc)
    assert.equal(parsed.searchParams.get('foo'), '1')
    assert.equal(parsed.searchParams.get('src'), 'web')
  })

  it('overwrites an existing src param', () => {
    const withSrc = withReconocimientosSrc(
      'https://forms.gle/xyz?src=old',
      'web'
    )
    assert.equal(new URL(withSrc).searchParams.get('src'), 'web')
  })
})
