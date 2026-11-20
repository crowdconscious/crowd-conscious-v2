/**
 * Canonical site origin for metadata, sitemap, and JSON-LD.
 *
 * Live host is www (apex 307-redirects there). Default to www so local /
 * preview builds agree with production even before Vercel env vars are
 * updated. If `NEXT_PUBLIC_APP_URL` is still the apex, that value wins —
 * code stays safe either way; Francisco must flip the env when ready.
 */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  return trimmed || 'https://www.crowdconscious.app'
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_APP_URL || 'https://www.crowdconscious.app'
)
