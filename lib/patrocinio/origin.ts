/**
 * Resolve the public origin a donation checkout started on, so Stripe returns the
 * donor to the same site (production, a Vercel preview, or localhost).
 * Only allow-listed hosts are accepted; anything else falls back to the canonical URL.
 */
const CANONICAL = 'https://www.crowdconscious.app'
const STATIC_HOSTS = new Set(['crowdconscious.app', 'www.crowdconscious.app'])
// Vercel preview URLs for this project, e.g. crowd-conscious-v2-git-branch-team.vercel.app
const PREVIEW_RE = /^crowd-conscious-v2(-[a-z0-9-]+)?\.vercel\.app$/

function hostOf(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).host.toLowerCase()
  } catch {
    return null
  }
}

export function isAllowedDonationHost(host: string): boolean {
  const h = host.toLowerCase()
  if (STATIC_HOSTS.has(h) || PREVIEW_RE.test(h)) return true
  const envHosts = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].map(hostOf)
  if (envHosts.includes(h)) return true
  if (process.env.NODE_ENV !== 'production' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h)) return true
  return false
}

export function resolveDonationOrigin(headers: Headers): string {
  const candidates = [headers.get('origin'), headers.get('referer')]
  for (const c of candidates) {
    if (!c) continue
    try {
      const u = new URL(c)
      if ((u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') && isAllowedDonationHost(u.host)) {
        return `${u.protocol}//${u.host}`
      }
    } catch {
      /* ignore malformed */
    }
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  return fallback && hostOf(fallback) && isAllowedDonationHost(hostOf(fallback)!) ? fallback : CANONICAL
}
