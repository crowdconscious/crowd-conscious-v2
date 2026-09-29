/** Display helpers for simulation PDF reports. Never coerce missing → 0. */

export const EM_DASH = '—'

/** Round a Divergence Index for PDF text. Null/NaN → em dash. */
export function formatDivergenceScore(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH
  return String(Math.round(value))
}

/** Human label when there is no real comparison data. */
export function divergenceUnavailableLabel(): string {
  return 'sin datos reales suficientes'
}

export function formatPctShare(share: number | null | undefined): string {
  if (share == null || !Number.isFinite(share)) return EM_DASH
  return `${Math.round(share * 100)}%`
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EM_DASH
  return Math.max(0, Math.floor(n)).toLocaleString('es-MX')
}

export function formatDateEs(iso: string | null | undefined): string {
  if (!iso) return EM_DASH
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return EM_DASH
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTimeEs(iso: string | null | undefined): string {
  if (!iso) return EM_DASH
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return EM_DASH
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Small-sample confidence caveat threshold (real votes). */
export const SMALL_SAMPLE_N = 30

export function isSmallRealSample(n: number | null | undefined): boolean {
  if (n == null || !Number.isFinite(n)) return false
  return n > 0 && n < SMALL_SAMPLE_N
}
