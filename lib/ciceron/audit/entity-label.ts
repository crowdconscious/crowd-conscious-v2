/** G2 — readable audit object labels with optional deep links. */

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'

const ENTITY_KIND_ES: Record<string, string> = {
  clients: 'Cliente',
  matters: 'Asunto',
  review_tasks: 'Tarea de revisión',
  case_files: 'Expediente',
  bulletin_hits: 'Coincidencia de boletín',
  bulletin_runs: 'Corrida de boletín',
  bulletin_manual_checks: 'Revisión manual de boletín',
  ai_outputs: 'Borrador',
  deadlines: 'Plazo',
}

const KNOWN_NAMES: Record<string, string> = {
  [CICERON_SEED.clients.nexora]: 'Nexora Pagos, S.A.P.I. de C.V.',
  [CICERON_SEED.matters.nexoraCnbv]: 'Licencia CNBV y prevención de lavado',
  [CICERON_SEED.matters.fondoPedregal]: 'Portafolio de arrendamiento',
  [CICERON_SEED.matters.alimentosNom]: 'Nombramiento y NOM',
  [CICERON_SEED.matters.farmaCofepris]: 'Autorización COFEPRIS',
}

export function auditEntityLabel(
  entityType: string | null | undefined,
  entityId: string | null | undefined,
  payload?: Record<string, unknown> | null
): { label: string; href: string | null } {
  const kind = ENTITY_KIND_ES[entityType ?? ''] ?? 'Registro'
  const named =
    (entityId && KNOWN_NAMES[entityId]) ||
    (typeof payload?.client_name === 'string' ? payload.client_name : null) ||
    (typeof payload?.title === 'string' ? payload.title : null)

  if (entityType === 'review_tasks' && entityId) {
    return {
      label: named ? `${kind}: ${named}` : kind,
      href: `/ciceron/revision/${entityId}`,
    }
  }
  if (entityType === 'case_files' && entityId) {
    return {
      label: named ? `${kind}: ${named}` : kind,
      href: `/ciceron/expedientes/${entityId}`,
    }
  }
  if (entityType === 'clients') {
    return {
      label: named ? `${kind}: ${named}` : kind,
      href: '/ciceron/clientes',
    }
  }
  if (entityType === 'matters') {
    return {
      label: named ? `${kind}: ${named}` : kind,
      href: '/ciceron/clientes',
    }
  }
  if (entityType?.startsWith('bulletin_')) {
    return { label: kind, href: '/ciceron/boletines' }
  }
  return { label: named ? `${kind}: ${named}` : kind, href: null }
}
