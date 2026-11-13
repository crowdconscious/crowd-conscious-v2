/**
 * Polite HTTP fetcher for public bulletin pages (rule 9b).
 * One request at a time, ≥1 s pause, identifying User-Agent, timeouts + retries.
 * Never solves captchas or logs in.
 */

import type { BulletinFetchResult } from '@/lib/ciceron/boletines/types'

const DEFAULT_CONTACT = 'ciceron@crowdconscious.app'
const DEFAULT_MAX_BYTES = 5_000_000

/** Contact for User-Agent: CICERON_BULLETIN_CONTACT, else safe project default. */
export function bulletinContactEmail(): string {
  const fromEnv = process.env.CICERON_BULLETIN_CONTACT?.trim()
  if (fromEnv && fromEnv.length > 3 && !fromEnv.includes('REPLACE_WITH_CONTACT')) {
    return fromEnv
  }
  return DEFAULT_CONTACT
}

export function bulletinUserAgent(kind: 'bot' | 'probe' = 'bot'): string {
  const contact = bulletinContactEmail()
  if (kind === 'probe') {
    return `CiceronBulletinProbe/0.1 (+contact: ${contact}; read-only registry probe; one request at a time)`
  }
  return `CiceronBulletinBot/0.1 (+contact: ${contact}; public bulletin lists only; one request at a time)`
}

/** @deprecated Prefer bulletinUserAgent() — contact is env-configurable. */
export const BULLETIN_USER_AGENT = bulletinUserAgent('bot')

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

function maxResponseBytes(): number {
  const raw = process.env.CICERON_BULLETIN_MAX_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_BYTES
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_BYTES
}

async function readBodyCapped(
  res: Response,
  maxBytes: number
): Promise<{ body: string; truncated: boolean; tooLarge: boolean }> {
  const declared = res.headers.get('content-length')
  if (declared) {
    const len = Number(declared)
    if (Number.isFinite(len) && len > maxBytes) {
      return { body: '', truncated: false, tooLarge: true }
    }
  }

  if (!res.body) {
    const text = await res.text()
    if (text.length > maxBytes) {
      return { body: '', truncated: false, tooLarge: true }
    }
    return { body: text, truncated: false, tooLarge: false }
  }

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {
        /* ignore */
      }
      return { body: '', truncated: false, tooLarge: true }
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c, offset)
    offset += c.byteLength
  }
  return {
    body: new TextDecoder('utf-8', { fatal: false }).decode(merged),
    truncated: false,
    tooLarge: false,
  }
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
  maxBytes?: number
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
    const maxBytes = opts.maxBytes ?? maxResponseBytes()
    if (opts.fixtureBody.length > maxBytes) {
      return {
        ok: false,
        error: `Response exceeds size limit (${maxBytes} bytes)`,
        durationMs: Date.now() - started,
      }
    }
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
  const maxBytes = opts.maxBytes ?? maxResponseBytes()
  const ua = bulletinUserAgent('bot')

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
            'User-Agent': ua,
            Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-MX,es;q=0.9',
          },
        })
        const read = await readBodyCapped(res, maxBytes)
        if (read.tooLarge) {
          return {
            ok: false,
            status: res.status,
            finalUrl: res.url || url,
            error: `Response exceeds size limit (${maxBytes} bytes)`,
            durationMs: Date.now() - started,
          }
        }
        return {
          ok: res.ok,
          status: res.status,
          body: read.body,
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
