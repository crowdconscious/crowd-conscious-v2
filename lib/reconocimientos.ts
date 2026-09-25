/**
 * Phase 0 Reconocimientos ("Mándanos lo bueno") — external form link-out only.
 *
 * Server env `RECONOCIMIENTOS_FORM_URL` gates both the web entry point and the
 * public config endpoint the mobile app reads. Unset / empty / non-https →
 * feature off. No storage, no moderation, no new tables.
 */

export type ReconocimientosConfig = {
  enabled: boolean
  /** Base form URL with no `src` param. Null when disabled. */
  url: string | null
}

/** Returns a valid https URL, or null if unset/empty/invalid. */
export function getReconocimientosFormUrl(): string | null {
  const raw = process.env.RECONOCIMIENTOS_FORM_URL?.trim()
  if (!raw) return null
  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function getReconocimientosConfig(): ReconocimientosConfig {
  const url = getReconocimientosFormUrl()
  return url ? { enabled: true, url } : { enabled: false, url: null }
}

/**
 * Append (or overwrite) `src` on the form URL, preserving existing query params.
 */
export function withReconocimientosSrc(baseUrl: string, src: string): string {
  const parsed = new URL(baseUrl)
  parsed.searchParams.set('src', src)
  return parsed.toString()
}
