/**
 * Anti-stuffing for the anonymous survey (/e/[token] -> /api/org/encuesta/[token]).
 *
 * 1. Signed one-time nonce: issued when the survey page renders, verified and
 *    consumed (insert into org_survey_nonces, unique) on submit. A script can't
 *    replay one nonce or POST without loading the page, and must wait MIN_AGE.
 * 2. Rate limit per IP + survey token, kept in Postgres (works without Redis).
 *
 * Anonymity: no IP is stored. Only HMAC-SHA256(secret, ...) values reach the DB.
 * Pure functions (secret passed in) so they are unit-testable.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const NONCE_TTL_MS = 6 * 60 * 60 * 1000
export const NONCE_MIN_AGE_MS = 3000
/** Offices often share one public IP, so limits are generous but finite. */
export const RATE_LIMITS = [
  { windowSeconds: 600, limit: 20 },
  { windowSeconds: 86400, limit: 150 },
] as const

const b64 = (b: Buffer) => b.toString('base64url')
const mac = (secret: string, msg: string) => b64(createHmac('sha256', secret).update(msg).digest())

export function issueNonce(secret: string, readingId: string, now = Date.now(), rand = b64(randomBytes(18))): string {
  const payload = `${readingId}.${now}.${rand}`
  return `${b64(Buffer.from(payload))}.${mac(secret, `nonce:${payload}`)}`
}

export type NonceCheck =
  | { ok: true; nonceHash: string; expiresAt: Date }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'wrong_reading' | 'expired' | 'too_fast' }

export function verifyNonce(secret: string, nonce: unknown, readingId: string, now = Date.now()): NonceCheck {
  if (typeof nonce !== 'string' || nonce.length > 300) return { ok: false, reason: 'malformed' }
  const [p, sig, extra] = nonce.split('.')
  if (!p || !sig || extra !== undefined) return { ok: false, reason: 'malformed' }
  const payload = Buffer.from(p, 'base64url').toString()
  const expected = Buffer.from(mac(secret, `nonce:${payload}`))
  const got = Buffer.from(sig)
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return { ok: false, reason: 'bad_signature' }
  const [rid, ts, rand] = payload.split('.')
  const issued = Number(ts)
  if (!rid || !rand || !Number.isFinite(issued)) return { ok: false, reason: 'malformed' }
  if (rid !== readingId) return { ok: false, reason: 'wrong_reading' }
  if (now - issued > NONCE_TTL_MS || issued - now > 60_000) return { ok: false, reason: 'expired' }
  if (now - issued < NONCE_MIN_AGE_MS) return { ok: false, reason: 'too_fast' }
  return { ok: true, nonceHash: mac(secret, `nonce-id:${rand}`), expiresAt: new Date(issued + NONCE_TTL_MS) }
}

/** HMAC of client IP + survey token; the raw IP never leaves this function. */
export function rateKey(secret: string, ip: string, surveyToken: string, windowSeconds: number) {
  return mac(secret, `rate:${windowSeconds}:${ip.trim().toLowerCase()}:${surveyToken}`)
}

export function clientIp(headers: Headers): string {
  const xf = headers.get('x-forwarded-for')
  return (xf ? xf.split(',')[0] : headers.get('x-real-ip') || 'unknown').trim()
}
