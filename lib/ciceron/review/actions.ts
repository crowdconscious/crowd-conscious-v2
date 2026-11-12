'use server'

import { revalidatePath } from 'next/cache'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { resolveCiceronActionActor } from '@/lib/ciceron/case-files/resolve-actor'
import {
  rpcCreateDelivery,
  rpcDecideReview,
  rpcReassignReview,
  rpcSaveReviewEdit,
  type ReviewDecisionKind,
} from '@/lib/ciceron/review/rpc'
import { canFinalApproveUnderFourEyes } from '@/lib/ciceron/review/four-eyes'
import { CICERON_BASE } from '@/lib/ciceron/config'

export type ReviewActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; message: string }

function revalidateReview(taskId?: string) {
  revalidatePath(`${CICERON_BASE}/revision`)
  if (taskId) {
    revalidatePath(`${CICERON_BASE}/revision/${taskId}`)
    revalidatePath(`${CICERON_BASE}/revision/${taskId}/entregar`)
  }
  revalidatePath(`${CICERON_BASE}/hoy`)
}

export async function decideReviewAction(input: {
  taskId: string
  decision: ReviewDecisionKind
  notes?: string
  editedBody?: string
}): Promise<ReviewActionResult> {
  const actor = await resolveCiceronActionActor()
  if (!actor) return { ok: false, message: 'Sesión no válida.' }

  if (!['socio', 'asociado', 'admin'].includes(actor.role)) {
    return { ok: false, message: 'Solo socios, asociados o administradores pueden decidir.' }
  }

  if (input.decision === 'rejected' && !input.notes?.trim()) {
    return { ok: false, message: 'Indique el motivo del rechazo.' }
  }
  if (input.decision === 'corrected' && !input.editedBody?.trim()) {
    return { ok: false, message: 'La aprobación con correcciones requiere el texto editado.' }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    // Offline demo: accept UX without persistence
    revalidateReview(input.taskId)
    return {
      ok: true,
      message:
        input.decision === 'approved'
          ? 'Decisión registrada (demostración).'
          : 'Decisión registrada (demostración).',
    }
  }

  // App-level four-eyes mirror (DB is authoritative)
  try {
    const { data: tasks } = await db
      .from('review_tasks')
      .select('output_type, draft_id')
      .eq('id', input.taskId)
      .limit(1)
    const task = Array.isArray(tasks)
      ? (tasks[0] as { output_type: string | null; draft_id: string | null } | undefined)
      : undefined
    if (task?.output_type) {
      const { data: settings } = await db
        .from('firm_settings')
        .select('four_eyes_output_types')
        .eq('firm_id', actor.firmId)
        .limit(1)
      const four = Array.isArray(settings)
        ? ((settings[0] as { four_eyes_output_types: string[] } | undefined)
            ?.four_eyes_output_types ?? [])
        : []
      let humanAuthor: string | null = null
      if (task.draft_id) {
        const { data: versions } = await db
          .from('draft_versions')
          .select('author_user_id, author_persona, author_type')
          .eq('draft_id', task.draft_id)
          .order('version_number', { ascending: false })
          .limit(5)
        const human = (
          (Array.isArray(versions) ? versions : []) as {
            author_type: string
            author_user_id: string | null
            author_persona: string | null
          }[]
        ).find((v) => v.author_type === 'human')
        humanAuthor = human ? (human.author_persona ?? human.author_user_id) : null
      }
      const gate = canFinalApproveUnderFourEyes({
        fourEyesOn: four.includes(task.output_type),
        decision: input.decision,
        actorId: actor.actorId,
        humanEditAuthorId: humanAuthor,
      })
      if (!gate.ok) {
        return {
          ok: false,
          message:
            'La revisión a cuatro ojos impide que quien editó el borrador dé la aprobación final.',
        }
      }
    }
  } catch {
    // continue to RPC
  }

  const result = await rpcDecideReview(db, {
    actorId: actor.actorId,
    taskId: input.taskId,
    decision: input.decision,
    notes: input.notes ?? null,
    editedBody: input.editedBody ?? null,
  })

  if (!result.ok) {
    if (result.policyId === 'four_eyes' || /four-eyes|cuatro ojos/i.test(result.message)) {
      return {
        ok: false,
        message:
          'Regla four_eyes: quien editó el borrador no puede dar la aprobación final.',
      }
    }
    if (result.policyId === 'matter_member' || /matter member/i.test(result.message)) {
      return {
        ok: false,
        message: 'Regla matter_member: no tiene acceso a este asunto.',
      }
    }
    if (/already decided/i.test(result.message)) {
      return { ok: false, message: 'Esta tarea ya fue decidida.' }
    }
    return { ok: false, message: result.message }
  }

  revalidateReview(input.taskId)
  return {
    ok: true,
    id: result.id,
    message:
      input.decision === 'approved'
        ? 'Aprobado.'
        : input.decision === 'corrected'
          ? 'Aprobado con correcciones.'
          : input.decision === 'rejected'
            ? 'Rechazado.'
            : 'Devuelto.',
  }
}

export async function saveReviewEditAction(input: {
  taskId: string
  editedBody: string
}): Promise<ReviewActionResult> {
  const actor = await resolveCiceronActionActor()
  if (!actor) return { ok: false, message: 'Sesión no válida.' }
  if (!input.editedBody.trim()) {
    return { ok: false, message: 'El texto editado no puede estar vacío.' }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    revalidateReview(input.taskId)
    return { ok: true, message: 'Edición guardada (demostración).' }
  }

  const result = await rpcSaveReviewEdit(db, {
    actorId: actor.actorId,
    taskId: input.taskId,
    editedBody: input.editedBody,
  })
  if (!result.ok) return { ok: false, message: result.message }

  revalidateReview(input.taskId)
  return { ok: true, id: result.id, message: 'Edición guardada. Puede reasignar para el visto bueno.' }
}

export async function reassignReviewAction(input: {
  taskId: string
  newAssigneeId: string
}): Promise<ReviewActionResult> {
  const actor = await resolveCiceronActionActor()
  if (!actor) return { ok: false, message: 'Sesión no válida.' }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    revalidateReview(input.taskId)
    return { ok: true, message: 'Reasignación registrada (demostración).' }
  }

  const result = await rpcReassignReview(db, {
    actorId: actor.actorId,
    taskId: input.taskId,
    newAssigneeId: input.newAssigneeId,
  })
  if (!result.ok) return { ok: false, message: result.message }

  revalidateReview(input.taskId)
  return { ok: true, message: 'Tarea reasignada. Se notificó al nuevo revisor.' }
}

export async function createDeliveryAction(input: {
  taskId: string
  aiOutputId: string
  matterId: string
  channel: string
  recipient: string
  subject: string
  body: string
  confirm: boolean
}): Promise<ReviewActionResult> {
  const actor = await resolveCiceronActionActor()
  if (!actor) return { ok: false, message: 'Sesión no válida.' }

  if (!input.confirm) {
    return { ok: false, message: 'Debe confirmar explícitamente el envío.' }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) {
    revalidateReview(input.taskId)
    return {
      ok: true,
      message: 'Entrega simulada registrada (demostración). No se envió correo real.',
    }
  }

  const result = await rpcCreateDelivery(db, {
    actorId: actor.actorId,
    aiOutputId: input.aiOutputId,
    matterId: input.matterId,
    channel: input.channel,
    recipient: input.recipient,
    subject: input.subject,
    body: input.body,
    confirm: true,
  })

  if (!result.ok) {
    if (result.policyId === 'matter_member') {
      return {
        ok: false,
        message: 'Regla matter_member: no tiene acceso a este asunto.',
      }
    }
    if (/tier 2|approved review/i.test(result.message)) {
      return {
        ok: false,
        message: 'Se requiere una decisión de revisión aprobada antes de entregar.',
      }
    }
    return { ok: false, message: result.message }
  }

  revalidateReview(input.taskId)
  return {
    ok: true,
    id: result.id,
    message: 'Entrega registrada como simulada. No se envió correo fuera de la lista permitida.',
  }
}
