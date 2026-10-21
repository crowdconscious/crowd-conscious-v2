import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verifies a Resend webhook (Svix signing scheme):
 *   signed = `${svix-id}.${svix-timestamp}.${rawBody}`
 *   svix-signature = space-separated `v1,<base64 HMAC-SHA256(signed, base64decode(secret without "whsec_"))>`
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !secret) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()
  for (const part of signature.split(' ')) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    const got = Buffer.from(sig, 'base64')
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true
  }
  return false
}

type ResendEvent = {
  type?: string
  data?: { to?: string[] | string; bounce?: { type?: string; subType?: string; message?: string } }
}

/** Returns the suppression to apply for an event, or null to ignore it. */
export function suppressionFromEvent(
  evt: ResendEvent
): { emails: string[]; reason: 'hard_bounce' | 'complaint'; info?: string } | null {
  const to = evt.data?.to
  const emails = (Array.isArray(to) ? to : to ? [to] : []).filter(Boolean)
  if (!emails.length) return null
  if (evt.type === 'email.complained') return { emails, reason: 'complaint' }
  if (evt.type === 'email.bounced') {
    // Only permanent (hard) bounces; transient ones (mailbox full) retry later.
    const t = (evt.data?.bounce?.type ?? '').toLowerCase()
    if (t && t !== 'permanent') return null
    const b = evt.data?.bounce
    return { emails, reason: 'hard_bounce', info: [b?.type, b?.subType].filter(Boolean).join('/') || undefined }
  }
  return null
}
