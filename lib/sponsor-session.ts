import { cookies } from 'next/headers'

const COOKIE_NAME = 'sa_id'

/**
 * Read the sponsor_account_id stored by /api/sponsor/login.
 *
 * This is *one* way to identify the current sponsor on the server. The
 * /dashboard/sponsor/[access_token] page also identifies the sponsor via the
 * URL token (the original auth model). Prefer the URL token where available;
 * fall back to this cookie for routes that don't carry the token.
 */
export async function getSponsorAccountIdFromSession(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(COOKIE_NAME)?.value
  return value && value.length > 0 ? value : null
}

/** Clears the sponsor session cookie (used by a logout endpoint, eventually). */
export async function clearSponsorSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
