import assert from 'node:assert/strict'
import { describe, it, beforeEach, afterEach } from 'node:test'
import {
  getReconocimientosConfig,
  sanitizeSrc,
  withReconocimientosSrc,
} from './config.ts'
import { WHO_TYPES, HOW_KNOWN, CONSENT_VERSION } from './constants.ts'

const ENV_KEY = 'RECONOCIMIENTOS_ENABLED'

describe('reconocimientos config', () => {
  let previous: string | undefined
  let previousAppUrl: string | undefined

  beforeEach(() => {
    previous = process.env[ENV_KEY]
    previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://crowdconscious.app'
  })

  afterEach(() => {
    if (previous === undefined) delete process.env[ENV_KEY]
    else process.env[ENV_KEY] = previous
    if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
  })

  it('disables when unset', () => {
    delete process.env[ENV_KEY]
    assert.deepEqual(getReconocimientosConfig(), {
      enabled: false,
      intakeUrl: null,
    })
  })

  it('disables when not exactly true', () => {
    process.env[ENV_KEY] = '1'
    assert.equal(getReconocimientosConfig().enabled, false)
  })

  it('enables with intake URL when true', () => {
    process.env[ENV_KEY] = 'true'
    const config = getReconocimientosConfig()
    assert.equal(config.enabled, true)
    assert.ok(config.intakeUrl)
    assert.match(config.intakeUrl!, /\/reconoce$/)
  })

  it('sanitizes src', () => {
    assert.equal(sanitizeSrc('Web'), 'web')
    assert.equal(sanitizeSrc('ios-app!!!'), 'iosapp')
    assert.equal(sanitizeSrc(''), 'unknown')
    assert.equal(sanitizeSrc(null), 'unknown')
    assert.equal(sanitizeSrc('a'.repeat(50)).length, 40)
  })

  it('appends src on intake URL', () => {
    const href = withReconocimientosSrc(
      'https://crowdconscious.app/reconoce',
      'ios'
    )
    assert.equal(href, 'https://crowdconscious.app/reconoce?src=ios')
  })

  it('exports expected enums and consent version', () => {
    assert.ok((WHO_TYPES as readonly string[]).includes('lugar_negocio'))
    assert.ok((HOW_KNOWN as readonly string[]).includes('en_persona'))
    assert.equal(CONSENT_VERSION, 'v1-2026-09-25')
  })
})
