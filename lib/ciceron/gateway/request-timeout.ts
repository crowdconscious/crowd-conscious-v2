/**
 * Per-request timeout + retry for Cicéron Anthropic calls.
 * Default 60s; backfill may override via --request-timeout-ms.
 * Never log headers or API keys from callers using this helper.
 */

export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000
export const DEFAULT_MAX_RETRIES = 2
/** Exit the backfill process if a batch makes no progress for this long. */
export const BATCH_STALL_MS = 5 * 60 * 1000

const RETRYABLE_MESSAGE =
  /timed?\s*out|timeout|aborted|econnreset|econnrefused|enotfound|etimedout|epipe|socket hang up|fetch failed|network|502|503|504|529|overloaded|internal server error|bad gateway|service unavailable|gateway timeout/i

export function parseRequestTimeoutMs(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_REQUEST_TIMEOUT_MS
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error('invalid_request_timeout_ms')
  }
  const n = Number(raw.trim())
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('invalid_request_timeout_ms')
  }
  return n
}

export function isRetryableProviderError(err: unknown): boolean {
  if (err == null) return false
  if (typeof err === 'object') {
    const name = 'name' in err ? String((err as { name?: unknown }).name ?? '') : ''
    if (
      name === 'AbortError' ||
      name === 'TimeoutError' ||
      name === 'APIConnectionTimeoutError' ||
      name === 'APIConnectionError'
    ) {
      return true
    }
    const status =
      'status' in err
        ? Number((err as { status?: unknown }).status)
        : 'statusCode' in err
          ? Number((err as { statusCode?: unknown }).statusCode)
          : NaN
    if (status >= 500 && status < 600) return true
    if (status === 408 || status === 429) return true
  }
  const message = err instanceof Error ? err.message : String(err)
  return RETRYABLE_MESSAGE.test(message)
}

export function defaultBackoffMs(retryIndex: number): number {
  // retryIndex 0 = first retry after the initial failure
  const base = 500
  const capped = Math.min(8_000, base * 2 ** retryIndex)
  return capped
}

export type WithTimeoutRetryOptions = {
  timeoutMs: number
  /** Retries after the first attempt (default 2 → up to 3 tries). */
  maxRetries?: number
  sleep?: (ms: number) => Promise<void>
  backoffMs?: (retryIndex: number) => number
  isRetryable?: (err: unknown) => boolean
  /** When true, wrap each attempt with AbortSignal.timeout(timeoutMs). Default true. */
  useAbortSignal?: boolean
}

export async function withTimeoutRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: WithTimeoutRetryOptions
): Promise<T> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  const backoffMs = opts.backoffMs ?? defaultBackoffMs
  const isRetryable = opts.isRetryable ?? isRetryableProviderError
  const useAbortSignal = opts.useAbortSignal !== false

  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const signal = useAbortSignal
      ? AbortSignal.timeout(opts.timeoutMs)
      : new AbortController().signal
    try {
      return await fn(signal)
    } catch (err) {
      lastError = err
      const canRetry = attempt < maxRetries && isRetryable(err)
      if (!canRetry) throw err
      await sleep(backoffMs(attempt))
    }
  }
  throw lastError
}

export function isBatchStalled(
  lastProgressAt: number,
  now: number,
  opts?: { stallMs?: number }
): boolean {
  const stallMs = opts?.stallMs ?? BATCH_STALL_MS
  return now - lastProgressAt >= stallMs
}

/** Anthropic SDK request options for a single attempt (SDK retries disabled). */
export function anthropicAttemptRequestOptions(opts: {
  timeoutMs: number
  signal?: AbortSignal
}): { timeout: number; maxRetries: number; signal?: AbortSignal } {
  return {
    timeout: opts.timeoutMs,
    maxRetries: 0,
    ...(opts.signal ? { signal: opts.signal } : {}),
  }
}
