/**
 * Feature gate for Reconocimientos intake.
 * Server env `RECONOCIMIENTOS_ENABLED=true` turns on /reconoce, footer entry,
 * and the mobile config endpoint. Public approved pages stay available
 * regardless so existing share links keep working after the campaign ends.
 *
 * SITE_URL is inlined (same default as lib/seo/site) so node --test can load
 * this module without path-alias resolution.
 */

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

export type ReconocimientosConfig = {
  enabled: boolean
  /** Absolute intake URL (no src). Null when disabled. */
  intakeUrl: string | null
}

export function isReconocimientosEnabled(): boolean {
  return process.env.RECONOCIMIENTOS_ENABLED?.trim().toLowerCase() === 'true'
}

export function getReconocimientosIntakeUrl(): string | null {
  if (!isReconocimientosEnabled()) return null
  const base = SITE_URL.replace(/\/$/, '')
  return `${base}/reconoce`
}

export function getReconocimientosConfig(): ReconocimientosConfig {
  const intakeUrl = getReconocimientosIntakeUrl()
  return intakeUrl
    ? { enabled: true, intakeUrl }
    : { enabled: false, intakeUrl: null }
}

/** Append (or overwrite) `src` on the intake URL. */
export function withReconocimientosSrc(baseUrl: string, src: string): string {
  const parsed = new URL(baseUrl)
  parsed.searchParams.set('src', sanitizeSrc(src))
  return parsed.toString()
}

/**
 * Sanitize src attribution: [a-z0-9_], max 40.
 * Missing/empty → `unknown` (web footer still passes src=web explicitly).
 */
export function sanitizeSrc(raw: unknown): string {
  if (typeof raw !== 'string') return 'unknown'
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
  return cleaned || 'unknown'
}

/**
 * Resolve attribution src for the web intake form.
 *
 * Priority:
 * 1. Explicit URL/query/form value (after sanitize)
 * 2. Previously persisted landing value (sessionStorage)
 * 3. `unknown` — never default to `app` on the web path
 *
 * Only POST /api/reconocimientos/app (and an in-app link with ?src=app)
 * should produce src=app.
 */
export function resolveIntakeSrc(
  urlOrFormSrc: unknown,
  storedSrc?: unknown
): string {
  if (typeof urlOrFormSrc === 'string' && urlOrFormSrc.trim()) {
    return sanitizeSrc(urlOrFormSrc)
  }
  if (typeof storedSrc === 'string' && storedSrc.trim()) {
    return sanitizeSrc(storedSrc)
  }
  return 'unknown'
}

/** Build where_text from optional app place fields. */
export function composeAppWhereText(args: {
  place_name?: string | null
  colonia?: string | null
  alcaldia?: string | null
}): string {
  const parts = [args.place_name, args.colonia, args.alcaldia]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
  return parts.join(', ') || 'Sin ubicación'
}
