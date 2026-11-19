/**
 * Persona-specific start screens (demo RBAC/ABAC showcase).
 */

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'

export type PersonaHomeKind = 'socio' | 'coordinador' | 'pasante' | 'asociado' | 'admin'

export type PersonaHomeTarget = {
  kind: PersonaHomeKind
  href: string
}

export function personaHomeKind(
  role: CiceronMembershipRole,
  personaId?: string
): PersonaHomeKind {
  if (personaId === CICERON_SEED.personas.coordinador) return 'coordinador'
  if (role === 'socio') return 'socio'
  if (role === 'pasante') return 'pasante'
  if (role === 'admin') return 'admin'
  return 'asociado'
}

export function personaHomeTarget(
  role: CiceronMembershipRole,
  personaId?: string
): PersonaHomeTarget {
  const kind = personaHomeKind(role, personaId)
  switch (kind) {
    case 'coordinador':
      return { kind, href: '/ciceron/boletines/coordinador' }
    case 'pasante':
      return { kind, href: '/ciceron/hoy' }
    case 'socio':
      return { kind, href: '/ciceron/hoy' }
    case 'admin':
      return { kind, href: '/ciceron/hoy' }
    default:
      return { kind, href: '/ciceron/hoy' }
  }
}

export type UnavailableActionId =
  | 'confirm-deadline'
  | 'assign-manual'
  | 'partner-report'
  | 'approve-as-socio'
  | 'manual-queue-own'

/** Demo-only ids; titles/reasons live in copy.personaHome.unavailable. */
export function unavailableActionIdsFor(
  kind: PersonaHomeKind
): UnavailableActionId[] {
  if (kind === 'pasante') {
    return ['confirm-deadline', 'assign-manual', 'partner-report']
  }
  if (kind === 'coordinador') return ['approve-as-socio']
  if (kind === 'socio') return ['manual-queue-own']
  return []
}
