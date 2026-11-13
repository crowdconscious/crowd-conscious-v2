import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BATCH_STALL_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_REQUEST_TIMEOUT_MS,
  isBatchStalled,
  isRetryableProviderError,
  parseRequestTimeoutMs,
  withTimeoutRetry,
} from './request-timeout'

describe('ciceron gateway request-timeout', () => {
  it('defaults timeout to 60s and max retries to 2', () => {
    assert.equal(DEFAULT_REQUEST_TIMEOUT_MS, 60_000)
    assert.equal(DEFAULT_MAX_RETRIES, 2)
    assert.equal(BATCH_STALL_MS, 5 * 60 * 1000)
  })

  it('parses --request-timeout-ms values and rejects invalid input', () => {
    assert.equal(parseRequestTimeoutMs(undefined), DEFAULT_REQUEST_TIMEOUT_MS)
    assert.equal(parseRequestTimeoutMs('45000'), 45_000)
    assert.throws(() => parseRequestTimeoutMs('0'), /invalid_request_timeout_ms/)
    assert.throws(() => parseRequestTimeoutMs('-1'), /invalid_request_timeout_ms/)
    assert.throws(() => parseRequestTimeoutMs('abc'), /invalid_request_timeout_ms/)
  })

  it('classifies timeout, 5xx, and network errors as retryable', () => {
    assert.equal(isRetryableProviderError(new Error('Request timed out')), true)
    assert.equal(isRetryableProviderError(new Error('TimeoutError')), true)
    assert.equal(
      isRetryableProviderError(
        Object.assign(new Error('aborted'), { name: 'AbortError' })
      ),
      true
    )
    assert.equal(isRetryableProviderError(new Error('502 Bad Gateway')), true)
    assert.equal(isRetryableProviderError(new Error('503 Service Unavailable')), true)
    assert.equal(isRetryableProviderError(new Error('ECONNRESET')), true)
    assert.equal(isRetryableProviderError(new Error('ENOTFOUND api')), true)
    assert.equal(isRetryableProviderError(new Error('fetch failed')), true)
    assert.equal(isRetryableProviderError(new Error('401 Unauthorized')), false)
    assert.equal(isRetryableProviderError(new Error('invalid_request_error')), false)
  })

  it('retries retryable failures up to maxRetries then succeeds', async () => {
    const sleeps: number[] = []
    let attempts = 0
    const result = await withTimeoutRetry(
      async () => {
        attempts += 1
        if (attempts < 3) throw new Error('ECONNRESET')
        return 'ok'
      },
      {
        timeoutMs: 50,
        maxRetries: 2,
        sleep: async (ms) => {
          sleeps.push(ms)
        },
      }
    )
    assert.equal(result, 'ok')
    assert.equal(attempts, 3)
    assert.equal(sleeps.length, 2)
    assert.ok(sleeps[0]! > 0)
    assert.ok(sleeps[1]! >= sleeps[0]!)
  })

  it('does not retry non-retryable errors', async () => {
    let attempts = 0
    await assert.rejects(
      () =>
        withTimeoutRetry(
          async () => {
            attempts += 1
            throw new Error('401 Unauthorized')
          },
          { timeoutMs: 50, maxRetries: 2, sleep: async () => {} }
        ),
      /401 Unauthorized/
    )
    assert.equal(attempts, 1)
  })

  it('aborts via AbortSignal when the call exceeds timeoutMs', async () => {
    let sawAbort = false
    await assert.rejects(
      () =>
        withTimeoutRetry(
          async (signal) => {
            await new Promise<void>((resolve, reject) => {
              const t = setTimeout(() => resolve(), 500)
              signal.addEventListener('abort', () => {
                sawAbort = true
                clearTimeout(t)
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
              })
            })
            return 'never'
          },
          {
            timeoutMs: 30,
            maxRetries: 0,
            sleep: async () => {},
          }
        ),
      /aborted|timeout/i
    )
    assert.equal(sawAbort, true)
  })

  it('detects batch stall after BATCH_STALL_MS without progress', () => {
    const started = 1_000_000
    assert.equal(isBatchStalled(started, started + BATCH_STALL_MS - 1), false)
    assert.equal(isBatchStalled(started, started + BATCH_STALL_MS), true)
    assert.equal(
      isBatchStalled(started, started + 60_000, { stallMs: 30_000 }),
      true
    )
  })
})
