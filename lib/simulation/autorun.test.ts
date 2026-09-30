/**
 * Unit tests for simulation autorun helpers (pure / flag / retry math).
 * No network — the cron worker path is covered by typecheck + manual plan.
 */

import assert from 'node:assert/strict'
import { describe, it, afterEach } from 'node:test'
import {
  isSimAutorunEnabled,
  retryDelaySeconds,
  simAutorunMaxConcurrent,
  simAutorunMaxPerHour,
  simAutorunNAgents,
  simAutorunPersonaVersion,
  STALE_ORPHAN_MS,
  STALE_RUNNING_MS,
  CRON_TIME_BUDGET_MS,
  MAX_STARTS_PER_TICK,
} from './autorun.ts'

const ENV_KEYS = [
  'SIM_AUTORUN_ENABLED',
  'SIM_AUTORUN_N_AGENTS',
  'SIM_AUTORUN_PERSONA_VERSION',
  'SIM_AUTORUN_MAX_CONCURRENT',
  'SIM_AUTORUN_MAX_PER_HOUR',
] as const

const saved: Record<string, string | undefined> = {}

function stashEnv() {
  for (const k of ENV_KEYS) saved[k] = process.env[k]
}

function restoreEnv() {
  for (const k of ENV_KEYS) {
    const v = saved[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

afterEach(() => {
  restoreEnv()
})

describe('isSimAutorunEnabled', () => {
  it('defaults off', () => {
    stashEnv()
    delete process.env.SIM_AUTORUN_ENABLED
    assert.equal(isSimAutorunEnabled(), false)
  })

  it('requires exact true', () => {
    stashEnv()
    process.env.SIM_AUTORUN_ENABLED = 'true'
    assert.equal(isSimAutorunEnabled(), true)
    process.env.SIM_AUTORUN_ENABLED = '1'
    assert.equal(isSimAutorunEnabled(), false)
    process.env.SIM_AUTORUN_ENABLED = 'TRUE'
    assert.equal(isSimAutorunEnabled(), false)
  })
})

describe('sim autorun env defaults', () => {
  it('uses sane defaults', () => {
    stashEnv()
    delete process.env.SIM_AUTORUN_N_AGENTS
    delete process.env.SIM_AUTORUN_PERSONA_VERSION
    delete process.env.SIM_AUTORUN_MAX_CONCURRENT
    delete process.env.SIM_AUTORUN_MAX_PER_HOUR
    assert.equal(simAutorunNAgents(), 150)
    assert.equal(simAutorunPersonaVersion(), 'cdmx-v1')
    assert.equal(simAutorunMaxConcurrent(), 2)
    assert.equal(simAutorunMaxPerHour(), 10)
  })

  it('parses overrides', () => {
    stashEnv()
    process.env.SIM_AUTORUN_N_AGENTS = '50'
    process.env.SIM_AUTORUN_PERSONA_VERSION = 'cdmx-v2'
    process.env.SIM_AUTORUN_MAX_CONCURRENT = '3'
    process.env.SIM_AUTORUN_MAX_PER_HOUR = '20'
    assert.equal(simAutorunNAgents(), 50)
    assert.equal(simAutorunPersonaVersion(), 'cdmx-v2')
    assert.equal(simAutorunMaxConcurrent(), 3)
    assert.equal(simAutorunMaxPerHour(), 20)
  })
})

describe('retryDelaySeconds', () => {
  it('exponential backoff with cap', () => {
    assert.equal(retryDelaySeconds(1), 60)
    assert.equal(retryDelaySeconds(2), 120)
    assert.equal(retryDelaySeconds(3), 240)
    assert.equal(retryDelaySeconds(10), 30 * 60)
  })
})

describe('stale reclaim + cron budget constants', () => {
  it('orphan lease is a few minutes; running lease under half an hour', () => {
    assert.equal(STALE_ORPHAN_MS, 3 * 60 * 1000)
    assert.equal(STALE_RUNNING_MS, 25 * 60 * 1000)
    assert.ok(STALE_ORPHAN_MS < STALE_RUNNING_MS)
  })

  it('cron budget fits under Vercel maxDuration 300s', () => {
    assert.equal(CRON_TIME_BUDGET_MS, 250 * 1000)
    assert.ok(CRON_TIME_BUDGET_MS < 300 * 1000)
    assert.equal(MAX_STARTS_PER_TICK, 1)
  })
})
