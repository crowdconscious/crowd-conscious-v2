/**
 * Persona-aware primary next action for bulletin match cards.
 */

export type CardPersonaRole = 'socio' | 'asociado' | 'pasante' | 'coordinador' | 'admin'

export type CardPrimaryActionId =
  | 'notify-client'
  | 'assign-pasante'
  | 'mark-reviewed'
  | 'open'
  | 'capture'

export type CardPrimaryDecision = {
  id: CardPrimaryActionId
  href: string
  /** When true, render disabled with inline reason. */
  denied: boolean
  denyReason: string | null
}

export type CardActionInput = {
  role: CardPersonaRole
  caseFileId: string | null
  sourceUrl: string | null
  matchKind: 'exact' | 'possible'
  /** True when this hit's state has a pending manual check. */
  needsManual: boolean
}

/**
 * One obvious next step per persona + state.
 * Secondary actions stay in the overflow menu (existing).
 */
export function decideCardPrimaryAction(input: CardActionInput): CardPrimaryDecision {
  const openHref = input.caseFileId
    ? `/ciceron/expedientes/${input.caseFileId}`
    : '/ciceron/expedientes/captura'

  if (input.role === 'coordinador' && input.needsManual) {
    return {
      id: 'assign-pasante',
      href: '/ciceron/boletines/coordinador',
      denied: false,
      denyReason: null,
    }
  }

  if (input.role === 'pasante') {
    if (input.needsManual) {
      return {
        id: 'mark-reviewed',
        href: '/ciceron/boletines',
        denied: false,
        denyReason: null,
      }
    }
    return {
      id: 'mark-reviewed',
      href: openHref,
      denied: true,
      denyReason:
        'Solo una socia o un asociado puede confirmar el resultado hacia el cliente. Usted puede capturar y preparar.',
    }
  }

  if (
    (input.role === 'socio' || input.role === 'asociado' || input.role === 'admin') &&
    input.matchKind === 'exact' &&
    input.caseFileId
  ) {
    return {
      id: 'notify-client',
      href: `/ciceron/expedientes/${input.caseFileId}`,
      denied: false,
      denyReason: null,
    }
  }

  if (input.role === 'socio' && input.needsManual) {
    return {
      id: 'assign-pasante',
      href: '/ciceron/boletines/coordinador',
      denied: true,
      denyReason:
        'Las revisiones manuales de fuentes las realizan pasantes asignados; usted revisa el resultado y las salidas al cliente.',
    }
  }

  return {
    id: input.caseFileId ? 'open' : 'capture',
    href: openHref,
    denied: false,
    denyReason: null,
  }
}
