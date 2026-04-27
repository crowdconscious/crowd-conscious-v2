/**
 * Compute the 3-way Pulse lifecycle badge shown on the sponsor dashboard.
 *
 *   🟢 active    — Pulse is published (is_draft = false), status active/trading,
 *                  and resolution_date is in the future.
 *   🔴 closed    — status resolved/cancelled OR resolution_date is in the past.
 *   ⚪ draft     — is_draft = true (visible to sponsor for transparency before launch).
 *
 * Note: prediction_markets.status values are 'active' | 'trading' | 'resolved' |
 * 'cancelled' (NOT 'published' or 'closed'). Publication state is encoded in the
 * separate `is_draft` flag introduced in migration 212.
 */

export type PulseLifecycle = 'draft' | 'active' | 'closed'

type Input = {
  status?: string | null
  isDraft?: boolean | null
  resolutionDate?: string | null
}

export function pulseLifecycleFromMarket({
  status,
  isDraft,
  resolutionDate,
}: Input): PulseLifecycle {
  if (isDraft) return 'draft'
  const s = (status ?? '').toLowerCase()
  if (s === 'resolved' || s === 'cancelled' || s === 'closed') return 'closed'
  if (resolutionDate) {
    const t = Date.parse(resolutionDate)
    if (!Number.isNaN(t) && t < Date.now()) return 'closed'
  }
  return 'active'
}

export const PULSE_LIFECYCLE_LABELS: Record<
  PulseLifecycle,
  { es: string; en: string; emoji: string }
> = {
  active: { es: 'Activo', en: 'Active', emoji: '🟢' },
  closed: { es: 'Cerrado', en: 'Closed', emoji: '🔴' },
  draft: { es: 'Borrador', en: 'Draft', emoji: '⚪' },
}
