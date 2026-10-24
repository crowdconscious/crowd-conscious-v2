/**
 * Sanitize post-login redirect: same-origin path only (no open redirects).
 */
export function getSafeRedirectPath(redirect: string | null | undefined, fallback = '/predictions'): string {
  if (redirect == null || typeof redirect !== 'string') return fallback
  const trimmed = redirect.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback
  // Backslashes and control characters can be normalised by browsers into
  // protocol-relative URLs; never accept them.
  if (/[\\\u0000-\u001f\u007f]/.test(trimmed)) return fallback
  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) return fallback
  try {
    const base = 'https://example.com'
    const u = new URL(trimmed, base)
    if (u.origin !== base) return fallback
    if (u.pathname.startsWith('/login') || u.pathname.startsWith('/signup')) return fallback
    return u.pathname + u.search + u.hash
  } catch {
    return fallback
  }
}
