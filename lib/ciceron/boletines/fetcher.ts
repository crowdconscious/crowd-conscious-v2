/**
 * Polite HTTP fetcher for public bulletin pages (rule 9b).
 * One request at a time, ≥1 s pause, identifying User-Agent, timeouts + retries.
 * Never solves captchas or logs in.
 */

import type { BulletinFetchResult } from '@/lib/ciceron/boletines/types'

export const BULLETIN_USER_AGENT =
  'CiceronBulletinBot/0.1 (+contact: REPLACE_WITH_CONTACT@example.com; public bulletin lists only; one request at a time)'

const DEFAULT_TIMEOUT_MS = 25_000
const MIN_PAUSE_MS = 1_000
const MAX_RETRIES = 2

let chain: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withSerialQueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_PAUSE_MS - (Date.now() - lastRequestAt))
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    return fn()
  })
  chain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

export type PoliteFetchOptions = {
  timeoutMs?: number
  retries?: number
  /** When false, refuse the request (robots/terms flag). */
  allowed?: boolean
  disallowReason?: string
  /** Injected for tests / fixtures — skips network. */
  fixtureBody?: string
  fixtureStatus?: number
  fixtureUrl?: string
}

export async function politeFetch(
  url: string,
  opts: PoliteFetchOptions = {}
): Promise<BulletinFetchResult> {
  const started = Date.now()
  if (opts.allowed === false) {
    return {
      ok: false,
      error: opts.disallowReason ?? 'Fetch blocked by robots/terms flags',
      durationMs: Date.now() - started,
    }
  }

  if (opts.fixtureBody !== undefined) {
    return {
      ok: (opts.fixtureStatus ?? 200) >= 200 && (opts.fixtureStatus ?? 200) < 400,
      status: opts.fixtureStatus ?? 200,
      body: opts.fixtureBody,
      finalUrl: opts.fixtureUrl ?? url,
      durationMs: Date.now() - started,
    }
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = opts.retries ?? MAX_RETRIES

  return withSerialQueue(async () => {
    let lastError = 'unknown'
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(MIN_PAUSE_MS * attempt)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': BULLETIN_USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-MX,es;q=0.9',
          },
        })
        const body = await res.text()
        return {
          ok: res.ok,
          status: res.status,
          body,
          finalUrl: res.url || url,
          error: res.ok ? undefined : `HTTP ${res.status}`,
          durationMs: Date.now() - started,
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      } finally {
        clearTimeout(timer)
      }
    }
    return {
      ok: false,
      error: lastError,
      durationMs: Date.now() - started,
    }
  })
}

/** Reset serial queue timing (tests only). */
export function __resetFetcherForTests(): void {
  chain = Promise.resolve()
  lastRequestAt = 0
}
