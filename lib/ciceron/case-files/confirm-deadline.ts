import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'

const CONFIRM_ROLES: ReadonlySet<CiceronMembershipRole> = new Set([
  'socio',
  'asociado',
  'admin',
])

export function canConfirmDeadline(role: CiceronMembershipRole): boolean {
  return CONFIRM_ROLES.has(role)
}

export type ConfirmDeadlineResult =
  | { ok: true }
  | { ok: false; code: 'forbidden' | 'invalid_status'; message: string }

/**
 * Application-level mirror of ciceron.deadlines_confirm_authority (tier 2).
 * Pasante must fail. DB trigger remains authoritative when schema is applied.
 */
export function assertCanConfirmDeadline(opts: {
  role: CiceronMembershipRole
  nextStatus: 'propuesto' | 'confirmado' | 'descartado'
  confirmedBy: string | null
}): ConfirmDeadlineResult {
  if (opts.nextStatus !== 'confirmado') {
    return { ok: true }
  }
  if (!opts.confirmedBy) {
    return {
      ok: false,
      code: 'invalid_status',
      message: 'Se requiere identificar quién confirma el plazo.',
    }
  }
  if (!canConfirmDeadline(opts.role)) {
    return {
      ok: false,
      code: 'forbidden',
      message: 'Solo un socio o asociado del asunto puede confirmar un plazo.',
    }
  }
  return { ok: true }
}
