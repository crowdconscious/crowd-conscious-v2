import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-only-unsafe'
  )
}

/** HMAC token for one-click unsubscribe links in emails */
export function createUnsubscribeToken(userId: string): string {
  return createHmac('sha256', getSecret()).update(`unsub:${userId}`).digest('base64url')
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  try {
    const expected = createUnsubscribeToken(userId)
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(token, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const newsletterNorm = (email: string) => email.toLowerCase().trim()

/** Token for newsletter-only subscribers (no auth.users row). */
export function createNewsletterListUnsubscribeToken(email: string): string {
  return createHmac('sha256', getSecret())
    .update(`newsletter:${newsletterNorm(email)}`)
    .digest('base64url')
}

export function verifyNewsletterListUnsubscribeToken(email: string, token: string): boolean {
  try {
    const expected = createNewsletterListUnsubscribeToken(email)
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(token, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
