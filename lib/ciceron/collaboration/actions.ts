'use server'

import { revalidatePath } from 'next/cache'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { extractMentionIds } from './mentions-pure'
import { loadFirmMembers } from './data'
import {
  rpcAddMatchComment,
  rpcAssignMatch,
  rpcEditMatchComment,
  rpcSoftDeleteMatchComment,
  rpcUpdateAssignmentStatus,
} from './rpc'
import type { MatchAssignmentStatus } from './types'

const STATUS: MatchAssignmentStatus[] = ['pendiente', 'en_curso', 'hecho']

function revalidateCollab(matchId?: string) {
  revalidatePath('/ciceron/monitor-dof')
  revalidatePath('/ciceron/mis-asignaciones')
  revalidatePath('/ciceron/hoy')
  if (matchId) revalidatePath(`/ciceron/monitor-dof/${matchId}`)
}

/** Form actions return void so they are valid `action={...}` handlers. */
export async function assignMatchAction(formData: FormData): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const matchId = String(formData.get('matchId') ?? '')
  const assignee = String(formData.get('assignee') ?? '')
  const matterId = String(formData.get('matterId') ?? '')
  const dueRaw = String(formData.get('dueAt') ?? '').trim()
  const dueAt = dueRaw || null
  if (!matchId || !assignee || !matterId) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  await rpcAssignMatch(db, {
    firmId: persona.firmId,
    matchId,
    actor: persona.id,
    assignee,
    matterId,
    dueAt,
  })

  revalidateCollab(matchId)
}

export async function updateAssignmentStatusAction(
  formData: FormData
): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const assignmentId = String(formData.get('assignmentId') ?? '')
  const matchId = String(formData.get('matchId') ?? '')
  const status = String(formData.get('status') ?? '') as MatchAssignmentStatus
  if (!assignmentId || !STATUS.includes(status)) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  await rpcUpdateAssignmentStatus(db, {
    firmId: persona.firmId,
    assignmentId,
    actor: persona.id,
    status,
  })

  revalidateCollab(matchId || undefined)
}

export async function addMatchCommentAction(formData: FormData): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const matchId = String(formData.get('matchId') ?? '')
  const matterId = String(formData.get('matterId') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!matchId || !matterId || !body) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  const members = await loadFirmMembers(persona)
  const mentions = extractMentionIds(
    body,
    members.map((m) => ({ id: m.id, displayName: m.displayName }))
  )

  await rpcAddMatchComment(db, {
    firmId: persona.firmId,
    matchId,
    actor: persona.id,
    matterId,
    body,
    mentions,
  })

  revalidateCollab(matchId)
}

export async function editMatchCommentAction(formData: FormData): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const commentId = String(formData.get('commentId') ?? '')
  const matchId = String(formData.get('matchId') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  if (!commentId || !body) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  const members = await loadFirmMembers(persona)
  const mentions = extractMentionIds(
    body,
    members.map((m) => ({ id: m.id, displayName: m.displayName }))
  )

  await rpcEditMatchComment(db, {
    firmId: persona.firmId,
    commentId,
    actor: persona.id,
    body,
    mentions,
  })

  revalidateCollab(matchId || undefined)
}

export async function deleteMatchCommentAction(
  formData: FormData
): Promise<void> {
  const persona = await getCiceronDemoSession()
  if (!persona) return

  const commentId = String(formData.get('commentId') ?? '')
  const matchId = String(formData.get('matchId') ?? '')
  if (!commentId) return

  const db = tryCreateCiceronAdminClient()
  if (!db) return

  await rpcSoftDeleteMatchComment(db, {
    firmId: persona.firmId,
    commentId,
    actor: persona.id,
  })

  revalidateCollab(matchId || undefined)
}
