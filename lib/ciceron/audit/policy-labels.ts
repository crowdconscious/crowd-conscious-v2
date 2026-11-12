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
}

/** Known English seed reasons → Spanish (usted). */
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
}

export function policyLabelEs(policyId: string | null | undefined): string {
  if (!policyId) return '—'
  return POLICY_LABELS_ES[policyId]?.label ?? policyId
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
      return policyReason
    }
  }
  if (policyId && POLICY_LABELS_ES[policyId]) {
    return POLICY_LABELS_ES[policyId].reasonFallback
  }
  return policyReason ?? '—'
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
