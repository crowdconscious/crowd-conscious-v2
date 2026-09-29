/**
 * Unit tests for simulation PDF report flag + access gates.
 */

import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'

import {
  canDownloadFullReport,
  decideReportAccess,
  isOnFullReportAllowlist,
  isReportEligible,
  parseFullReportAllowlist,
} from './access.ts'
import { isSimReportEnabled } from './flag.ts'
import {
  divergenceUnavailableLabel,
  formatDivergenceScore,
  isSmallRealSample,
} from './format.ts'

const FLAG = 'SIM_REPORT_ENABLED'

afterEach(() => {
  delete process.env[FLAG]
  delete process.env.SIM_REPORT_FULL_ALLOWLIST
})

describe('isSimReportEnabled', () => {
  it('defaults off', () => {
    delete process.env[FLAG]
    assert.equal(isSimReportEnabled(), false)
  })
  it('true only for exact string true', () => {
    process.env[FLAG] = 'true'
    assert.equal(isSimReportEnabled(), true)
    process.env[FLAG] = '1'
    assert.equal(isSimReportEnabled(), false)
    process.env[FLAG] = 'TRUE'
    assert.equal(isSimReportEnabled(), false)
  })
})

describe('isReportEligible', () => {
  it('requires flag', () => {
    delete process.env[FLAG]
    assert.equal(
      isReportEligible({
        pulseStatus: 'resolved',
        runRevealedAt: '2026-01-01T00:00:00Z',
        runIsFixture: false,
        isAdmin: false,
      }),
      false,
    )
  })

  it('public: resolved + revealed + non-fixture', () => {
    process.env[FLAG] = 'true'
    assert.equal(
      isReportEligible({
        pulseStatus: 'resolved',
        runRevealedAt: '2026-01-01T00:00:00Z',
        runIsFixture: false,
        isAdmin: false,
      }),
      true,
    )
    assert.equal(
      isReportEligible({
        pulseStatus: 'active',
        runRevealedAt: '2026-01-01T00:00:00Z',
        runIsFixture: false,
        isAdmin: false,
      }),
      false,
    )
    assert.equal(
      isReportEligible({
        pulseStatus: 'resolved',
        runRevealedAt: null,
        runIsFixture: false,
        isAdmin: false,
      }),
      false,
    )
    assert.equal(
      isReportEligible({
        pulseStatus: 'resolved',
        runRevealedAt: '2026-01-01T00:00:00Z',
        runIsFixture: true,
        isAdmin: false,
      }),
      false,
    )
  })

  it('admin may pull fixtures when flagged', () => {
    process.env[FLAG] = 'true'
    assert.equal(
      isReportEligible({
        pulseStatus: 'active',
        runRevealedAt: null,
        runIsFixture: true,
        isAdmin: true,
      }),
      true,
    )
  })
})

describe('canDownloadFullReport', () => {
  it('admin or pulse client or allowlist', () => {
    assert.equal(
      canDownloadFullReport({
        isAdmin: true,
        isPulseClient: false,
      }),
      true,
    )
    assert.equal(
      canDownloadFullReport({
        isAdmin: false,
        isPulseClient: true,
      }),
      true,
    )
    process.env.SIM_REPORT_FULL_ALLOWLIST = 'a@example.com, b@x.com'
    assert.equal(
      canDownloadFullReport({
        isAdmin: false,
        isPulseClient: false,
        userEmail: 'A@example.com',
      }),
      true,
    )
    assert.equal(
      canDownloadFullReport({
        isAdmin: false,
        isPulseClient: false,
        userEmail: 'other@example.com',
      }),
      false,
    )
  })
})

describe('decideReportAccess', () => {
  it('summary open to eligible; full gated', () => {
    process.env[FLAG] = 'true'
    const eligibility = {
      pulseStatus: 'resolved',
      runRevealedAt: '2026-01-01T00:00:00Z',
      runIsFixture: false,
      isAdmin: false,
    }
    assert.deepEqual(
      decideReportAccess({
        tier: 'summary',
        eligibility,
        fullAccess: { isAdmin: false, isPulseClient: false },
      }),
      { allow: true },
    )
    assert.deepEqual(
      decideReportAccess({
        tier: 'full',
        eligibility,
        fullAccess: { isAdmin: false, isPulseClient: false },
      }),
      { allow: false, reason: 'forbidden' },
    )
  })
})

describe('format helpers', () => {
  it('never coerces missing divergence to 0', () => {
    assert.equal(formatDivergenceScore(null), '—')
    assert.equal(formatDivergenceScore(undefined), '—')
    assert.equal(formatDivergenceScore(Number.NaN), '—')
    assert.equal(formatDivergenceScore(12.6), '13')
    assert.equal(divergenceUnavailableLabel(), 'sin datos reales suficientes')
  })
  it('small sample', () => {
    assert.equal(isSmallRealSample(0), false)
    assert.equal(isSmallRealSample(10), true)
    assert.equal(isSmallRealSample(30), false)
  })
})

describe('allowlist parse', () => {
  it('splits and trims', () => {
    assert.deepEqual(
      [...parseFullReportAllowlist(' a@x.com, b@y.com ')],
      ['a@x.com', 'b@y.com'],
    )
    assert.equal(isOnFullReportAllowlist('a@x.com', new Set(['a@x.com'])), true)
  })
})
