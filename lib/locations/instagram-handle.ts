/**
 * Canonical Instagram handle storage: no leading @, no profile URL.
 * Display as `@` + handle; links as https://instagram.com/<handle>.
 */

const IG_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/+/i

/** Strip URL noise and leading @; return null when empty after cleanup. */
export function normalizeInstagramHandle(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null
  let v = String(raw).trim()
  if (!v) return null
  v = v.replace(IG_URL_RE, '')
  v = v.replace(/^@+/u, '')
  v = v.split(/[/?#]/)[0]?.trim() ?? ''
  if (!v) return null
  return v
}

/** Label for UI: `@handle`. Empty string when missing. */
export function formatInstagramHandle(
  raw: string | null | undefined
): string {
  const handle = normalizeInstagramHandle(raw)
  return handle ? `@${handle}` : ''
}

/** Profile URL, or null when handle missing. */
export function instagramProfileUrl(
  raw: string | null | undefined
): string | null {
  const handle = normalizeInstagramHandle(raw)
  return handle ? `https://instagram.com/${handle}` : null
}
