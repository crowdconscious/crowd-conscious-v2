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

/**
 * Sponsor email preference tokens.
 *
 * One-click unsubscribe from a specific sponsor email channel (e.g.
 * `pulse_launch`, `pulse_closure`). The token binds the sponsor account
 * id AND the email type so a `pulse_closure` unsubscribe link cannot be
 * reused to silence `pulse_launch` emails and vice versa.
 *
 * The token is an HMAC; it does not require a DB lookup to verify.
 * Preferences themselves live in `sponsor_accounts.email_preferences`
 * (JSONB) — this helper only authenticates the link.
 */
export type SponsorEmailType = 'pulse_launch' | 'pulse_closure'

const SPONSOR_EMAIL_TYPES = ['pulse_launch', 'pulse_closure'] as const

export function isSponsorEmailType(v: string | null | undefined): v is SponsorEmailType {
  return !!v && (SPONSOR_EMAIL_TYPES as readonly string[]).includes(v)
}

export function createSponsorUnsubscribeToken(
  sponsorAccountId: string,
  emailType: SponsorEmailType
): string {
  return createHmac('sha256', getSecret())
    .update(`sponsor:${sponsorAccountId}:${emailType}`)
    .digest('base64url')
}

export function verifySponsorUnsubscribeToken(
  sponsorAccountId: string,
  emailType: SponsorEmailType,
  token: string
): boolean {
  try {
    const expected = createSponsorUnsubscribeToken(sponsorAccountId, emailType)
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(token, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
