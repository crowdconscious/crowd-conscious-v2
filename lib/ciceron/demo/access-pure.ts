/** Pure RBAC/ABAC showcase helpers (safe for client + tests). */

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { CICERON_P9_SEED } from '@/lib/ciceron/demo/seed-ids'

export type AccessResult = {
  ok: boolean
  policyId?: string | null
  policyReason?: string | null
  model?: 'rbac' | 'abac' | string | null
  actorRole?: string | null
  sensitivity?: string | null
}

export type TryAccessDemoResult = {
  ok: boolean
  scenario: 'rbac' | 'abac'
  explainer: string
  allowed: AccessResult
  denied: AccessResult
}

/** Offline fixture denials when DB RPCs are unavailable (screenshots / local). */
export function offlineTryAccess(scenario: 'rbac' | 'abac'): TryAccessDemoResult {
  if (scenario === 'rbac') {
    return {
      ok: true,
      scenario: 'rbac',
      explainer:
        'RBAC decide por rol: la socia puede aprobar; el pasante no, aunque comparta el asunto.',
      allowed: { ok: true, model: 'rbac', actorRole: 'socio' },
      denied: {
        ok: false,
        model: 'rbac',
        policyId: 'rbac_role',
        policyReason:
          'Solo socio, asociado o administrador puede aprobar una revisión (RBAC: rol).',
        actorRole: 'pasante',
      },
    }
  }
  return {
    ok: true,
    scenario: 'abac',
    explainer:
      'ABAC decide por atributos: asignación al asunto, muro de conflicto, sensibilidad y vigencia del permiso.',
    allowed: { ok: true, model: 'abac', actorRole: 'asociado' },
    denied: {
      ok: false,
      model: 'abac',
      policyId: 'abac_conflict_wall',
      policyReason:
        'Muro de conflicto: usted está asignado a un cliente en conflicto con este cliente (ABAC: atributo de conflicto).',
      actorRole: 'asociado',
    },
  }
}

export const ACCESS_SHOWCASE = {
  rbacPersonaId: CICERON_SEED.personas.socio,
  abacPersonaId: CICERON_P9_SEED.personas.abacAsociado,
  docs: CICERON_P9_SEED.documents,
  farmaClientId: CICERON_SEED.clientsExtra.farma,
  nexoraMatterId: CICERON_SEED.matters.nexoraCnbv,
} as const
