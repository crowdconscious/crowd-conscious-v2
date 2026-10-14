/**
 * Expiring private share links for "Resumen para direccion".
 * Token = base64url(payload).base64url(HMAC-SHA256(payload, ORG_SHARE_SECRET)).
 * No secret configured -> links cannot be created or verified.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SHARE_LINK_TTL_DAYS } from './config'

type Payload = { o: string; r: string; exp: number }

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')

function secret() {
  const s = process.env.ORG_SHARE_SECRET
  return s && s.length >= 32 ? s : null
}

export function createShareToken(orgSlug: string, readingId: string, now = Date.now()): string | null {
  const key = secret()
  if (!key) return null
  const body = b64(JSON.stringify({ o: orgSlug, r: readingId, exp: now + SHARE_LINK_TTL_DAYS * 86400000 } satisfies Payload))
  return `${body}.${b64(createHmac('sha256', key).update(body).digest())}`
}

export function verifyShareToken(token: string, orgSlug: string, readingId: string, now = Date.now()): { ok: true; exp: number } | { ok: false } {
  const key = secret()
  if (!key || !token.includes('.')) return { ok: false }
  const [body, sig] = token.split('.')
  const expected = createHmac('sha256', key).update(body).digest()
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false }
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload
    if (p.o !== orgSlug || p.r !== readingId || p.exp < now) return { ok: false }
    return { ok: true, exp: p.exp }
  } catch {
    return { ok: false }
  }
}
