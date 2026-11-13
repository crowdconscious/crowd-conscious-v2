'use server'

import { revalidatePath } from 'next/cache'
import {
  recordAuditDenial,
  recordAuditEvent,
  type AuditInsertClient,
} from '@/lib/ciceron/audit/write'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

function asAuditClient(db: NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>): AuditInsertClient {
  return db as unknown as AuditInsertClient
}

export type BulletinActionState = {
  ok: boolean
  policyId?: string
  policyReason?: string
  message?: string
  partnerPreview?: string
}

function canCoordinate(role: string): boolean {
  return role === 'socio' || role === 'asociado' || role === 'admin'
}

export async function assignManualCheckAction(
  _prev: BulletinActionState | null,
  formData: FormData
): Promise<BulletinActionState> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }

  const checkId = String(formData.get('checkId') ?? '')
  if (!checkId) return { ok: false, message: 'Falta el identificador.' }

  const db = tryCreateCiceronAdminClient()

  if (!canCoordinate(persona.role)) {
    if (db) {
      await recordAuditDenial(asAuditClient(db), {
        firmId: persona.firmId,
        userId: persona.id,
        action: 'bulletin_manual_assign',
        entityType: 'bulletin_manual_checks',
        entityId: checkId,
        policyId: 'rbac_role',
        policyReason:
          'Solo socio, asociado o administrador puede asignar revisiones manuales de boletín.',
      })
    }
    return {
      ok: false,
      policyId: 'rbac_role',
      policyReason:
        'Solo socio, asociado o administrador puede asignar revisiones manuales de boletín.',
    }
  }

  if (db) {
    const { data, error } = await db.rpc('assign_bulletin_manual_check', {
      p_firm_id: persona.firmId,
      p_check_id: checkId,
      p_actor: persona.id,
      p_assignee: CICERON_SEED.personas.pasante,
    })
    if (error) {
      // Offline-shaped demo ids may not exist until migration 328 is applied.
      await recordAuditEvent(asAuditClient(db), {
        firmId: persona.firmId,
        userId: persona.id,
        action: 'bulletin_manual_assign',
        entityType: 'bulletin_manual_checks',
        entityId: checkId,
        outcome: 'allowed',
        policyId: 'rbac_role',
        payload: {
          assignee: CICERON_SEED.personas.pasante,
          demo_fallback: true,
          rpc_error: error.message,
        },
      })
    } else {
      const row = data as Record<string, unknown> | null
      if (row && row.ok === false) {
        return {
          ok: false,
          policyId: String(row.policy_id ?? 'rbac_role'),
          policyReason: String(row.policy_reason ?? 'Denegado.'),
        }
      }
    }
  }

  revalidatePath('/ciceron/boletines')
  revalidatePath('/ciceron/boletines/coordinador')
  return { ok: true, message: 'Revisión asignada al pasante (demostración).' }
}

export async function completeManualCheckAction(
  _prev: BulletinActionState | null,
  formData: FormData
): Promise<BulletinActionState> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }

  const checkId = String(formData.get('checkId') ?? '')
  if (!checkId) return { ok: false, message: 'Falta el identificador.' }

  const db = tryCreateCiceronAdminClient()

  if (!canCoordinate(persona.role) && persona.role !== 'pasante') {
    if (db) {
      await recordAuditDenial(asAuditClient(db), {
        firmId: persona.firmId,
        userId: persona.id,
        action: 'bulletin_manual_complete',
        entityType: 'bulletin_manual_checks',
        entityId: checkId,
        policyId: 'rbac_role',
        policyReason: 'No tiene permiso para marcar la revisión manual como hecha.',
      })
    }
    return {
      ok: false,
      policyId: 'rbac_role',
      policyReason: 'No tiene permiso para marcar la revisión manual como hecha.',
    }
  }

  if (db) {
    const { data, error } = await db.rpc('complete_bulletin_manual_check', {
      p_firm_id: persona.firmId,
      p_check_id: checkId,
      p_actor: persona.id,
      p_notes: 'Marcada en demostración.',
    })
    if (error) {
      await recordAuditEvent(asAuditClient(db), {
        firmId: persona.firmId,
        userId: persona.id,
        action: 'bulletin_manual_complete',
        entityType: 'bulletin_manual_checks',
        entityId: checkId,
        outcome: 'allowed',
        policyId: 'rbac_role',
        payload: { demo_fallback: true, rpc_error: error.message },
      })
    } else {
      const row = data as Record<string, unknown> | null
      if (row && row.ok === false) {
        return {
          ok: false,
          policyId: String(row.policy_id ?? 'rbac_role'),
          policyReason: String(row.policy_reason ?? 'Denegado.'),
        }
      }
    }
  }

  revalidatePath('/ciceron/boletines')
  revalidatePath('/ciceron/boletines/coordinador')
  return { ok: true, message: 'Revisión marcada como hecha (demostración).' }
}

export async function partnerSummaryPreviewAction(
  _prev: BulletinActionState | null,
  _formData: FormData
): Promise<BulletinActionState> {
  const persona = await getCiceronDemoSession()
  if (!persona) return { ok: false, message: 'Sin sesión.' }

  const db = tryCreateCiceronAdminClient()

  if (!canCoordinate(persona.role)) {
    if (db) {
      await recordAuditDenial(asAuditClient(db), {
        firmId: persona.firmId,
        userId: persona.id,
        action: 'bulletin_partner_summary_preview',
        entityType: 'bulletin_runs',
        entityId: persona.firmId,
        policyId: 'rbac_role',
        policyReason:
          'Solo socio, asociado o administrador puede generar el resumen para socios.',
      })
    }
    return {
      ok: false,
      policyId: 'rbac_role',
      policyReason:
        'Solo socio, asociado o administrador puede generar el resumen para socios.',
    }
  }

  const preview = [
    'Resumen de boletines — vista previa (no enviado)',
    `Despacho: ${persona.firmName}`,
    `Preparó: ${persona.displayName}`,
    '',
    'Estados revisados automáticamente: Querétaro, Jalisco, Ciudad de México, Estado de México.',
    'Revisión manual pendiente: Guanajuato (asignada), Nuevo León (sin asignar).',
    'Coincidencias exactas de demostración: 5; posibles: 1.',
    'Una corrida fallida de demostración permanece visible (no se presenta como «sin novedades»).',
    '',
    'Datos de demostración. Informativo: no constituye notificación judicial.',
  ].join('\n')

  if (db) {
    await recordAuditEvent(asAuditClient(db), {
      firmId: persona.firmId,
      userId: persona.id,
      action: 'bulletin_partner_summary_preview',
      entityType: 'bulletin_runs',
      entityId: persona.firmId,
      outcome: 'allowed',
      policyId: 'rbac_role',
      payload: { preview_only: true, is_demo: true },
    })
  }

  return { ok: true, partnerPreview: preview }
}
