/**
 * Spanish (usted) labels for audit policy_id / policy_reason.
 * Preferred over mutating append-only audit_events seed rows.
 */

export const POLICY_LABELS_ES: Record<string, { label: string; reasonFallback: string }> = {
  matter_member: {
    label: 'Miembro del asunto',
    reasonFallback: 'El actor no es miembro de este asunto.',
  },
  four_eyes: {
    label: 'Revisión a cuatro ojos',
    reasonFallback:
      'Quien editó este tipo de salida no puede dar la aprobación final.',
  },
  role: {
    label: 'Rol autorizado',
    reasonFallback: 'Solo socio, asociado o administrador puede decidir revisiones.',
  },
  delivery_exists: {
    label: 'Entrega existente',
    reasonFallback: 'Ya existe una entrega registrada para esta salida.',
  },
  confirm_required: {
    label: 'Confirmación requerida',
    reasonFallback: 'Debe confirmar explícitamente la entrega.',
  },
  allowlist: {
    label: 'Lista de correo permitidos',
    reasonFallback: 'El destinatario no está en la lista de permitidos; se simula el envío.',
  },
  budget: {
    label: 'Presupuesto de IA',
    reasonFallback: 'Se alcanzó el presupuesto mensual de IA del despacho.',
  },
  rbac_role: {
    label: 'Permisos por rol — rol insuficiente',
    reasonFallback: 'Su rol no autoriza esta acción.',
  },
  rbac_membership: {
    label: 'Permisos por rol — membresía',
    reasonFallback: 'El actor no es miembro de este despacho.',
  },
  abac_conflict_wall: {
    label: 'Permisos por asunto — muro de conflicto',
    reasonFallback:
      'Muro de conflicto: no puede acceder a material de un cliente en conflicto.',
  },
  abac_matter_assignment: {
    label: 'Permisos por asunto — asignación al asunto',
    reasonFallback: 'No tiene asignación a este asunto.',
  },
  abac_sensitivity: {
    label: 'Permisos por asunto — sensibilidad del documento',
    reasonFallback: 'Se requiere una concesión vigente para este nivel de sensibilidad.',
  },
  abac_grant_expired: {
    label: 'Permisos por asunto — permiso expirado',
    reasonFallback: 'El permiso temporal para este recurso ya expiró.',
  },
  invite_expired: {
    label: 'Invitación expirada',
    reasonFallback: 'El código de invitación ha expirado.',
  },
  invite_exhausted: {
    label: 'Invitación agotada',
    reasonFallback: 'Este código ya alcanzó el máximo de usos.',
  },
}

/** Known English / legacy acronym seed reasons → Spanish (usted), no RBAC/ABAC. */
const REASON_OVERRIDES_ES: Record<string, string> = {
  'Actor is not a member of this matter':
    'El actor no es miembro de este asunto.',
  'Editor cannot give final approval on this output type':
    'Quien editó este tipo de salida no puede dar la aprobación final.',
  'Socio viewed client material in demo seed':
    'El socio consultó material del cliente (datos de demostración).',
  'Reviewer opened task with client context':
    'El revisor abrió la tarea con contexto del cliente.',
  'Duplicate delivery refused':
    'Se rechazó una entrega duplicada.',
  'Pasante cannot confirm delivery':
    'El pasante no puede confirmar una entrega.',
  'Solo socio, asociado o administrador puede aprobar una revisión (RBAC: rol).':
    'Solo socio, asociado o administrador puede aprobar una revisión (permisos por rol).',
  'Solo socio, asociado o administrador puede confirmar un plazo (RBAC: rol).':
    'Solo socio, asociado o administrador puede confirmar un plazo (permisos por rol).',
  'Solo socio, asociado o administrador puede registrar una entrega al cliente (RBAC: rol).':
    'Solo socio, asociado o administrador puede registrar una entrega al cliente (permisos por rol).',
  'Muro de conflicto: usted está asignado a un cliente en conflicto con este cliente (ABAC: atributo de conflicto).':
    'Muro de conflicto: usted está asignado a un cliente en conflicto con este cliente (permisos por asunto).',
  'El permiso temporal para este documento ya expiró (ABAC: concesión con vigencia).':
    'El permiso temporal para este documento ya expiró (permisos por asunto: concesión con vigencia).',
}

export function policyLabelEs(policyId: string | null | undefined): string {
  if (!policyId) return '—'
  return POLICY_LABELS_ES[policyId]?.label ?? policyId
}

function stripAccessAcronyms(text: string): string {
  return text
    .replace(/\bRBAC\b/gi, 'permisos por rol')
    .replace(/\bABAC\b/gi, 'permisos por asunto')
}

export function policyReasonEs(
  policyId: string | null | undefined,
  policyReason: string | null | undefined
): string {
  if (policyReason) {
    const override = REASON_OVERRIDES_ES[policyReason]
    if (override) return override
    // Already Spanish or unknown — show as-is if it looks Spanish-ish, else map by id
    if (/[áéíóúñ¿¡]|el |la |quien |solo |debe /i.test(policyReason)) {
      return stripAccessAcronyms(policyReason)
    }
  }
  if (policyId && POLICY_LABELS_ES[policyId]) {
    return POLICY_LABELS_ES[policyId].reasonFallback
  }
  return policyReason ? stripAccessAcronyms(policyReason) : '—'
}

export function formatPolicyCell(
  policyId: string | null | undefined,
  policyReason: string | null | undefined
): string {
  if (!policyId && !policyReason) return '—'
  const label = policyLabelEs(policyId)
  const reason = policyReasonEs(policyId, policyReason)
  if (label === '—' ) return reason
  if (reason === '—' || reason === label) return label
  return `${label} — ${reason}`
}
