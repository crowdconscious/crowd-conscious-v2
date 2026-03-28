/**
 * Sanitize post-login redirect: same-origin path only (no open redirects).
 */
export function getSafeRedirectPath(redirect: string | null | undefined, fallback = '/predictions'): string {
  if (redirect == null || typeof redirect !== 'string') return fallback
  const trimmed = redirect.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) return fallback
  try {
    const u = new URL(trimmed, 'https://example.com')
    return u.pathname + u.search + u.hash
  } catch {
    return fallback
  }
}
