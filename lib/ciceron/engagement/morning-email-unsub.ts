import { createHmac, timingSafeEqual } from 'crypto'

function secret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-only-unsafe'
  )
}

/** HMAC for Cicéron morning-email unsubscribe (actor + firm bound). */
export function createCiceronMorningUnsubToken(
  firmId: string,
  actorId: string
): string {
  return createHmac('sha256', secret())
    .update(`ciceron-morning:${firmId}:${actorId}`)
    .digest('base64url')
}

export function verifyCiceronMorningUnsubToken(
  firmId: string,
  actorId: string,
  token: string
): boolean {
  try {
    const expected = createCiceronMorningUnsubToken(firmId, actorId)
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(token, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
