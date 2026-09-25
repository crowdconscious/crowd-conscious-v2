import { SITE_URL } from '@/lib/seo/site'

/**
 * Feature gate for Reconocimientos intake.
 * Server env `RECONOCIMIENTOS_ENABLED=true` turns on /reconoce, footer entry,
 * and the mobile config endpoint. Public approved pages stay available
 * regardless so existing share links keep working after the campaign ends.
 */

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

/** Sanitize src attribution: [a-z0-9_], max 40, default 'web'. */
export function sanitizeSrc(raw: unknown): string {
  if (typeof raw !== 'string') return 'web'
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 40)
  return cleaned || 'web'
}
