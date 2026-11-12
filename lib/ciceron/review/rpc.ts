/**
 * Service-role RPC wrappers for Prompt 7 review / delivery gates.
 * Mirror case-files/tier2-rpc.ts: set_actor happens inside the DB function.
 */

export type ReviewRpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

export type ReviewRpcResult =
  | { ok: true; id?: string }
  | { ok: false; message: string }

export type ReviewDecisionKind = 'approved' | 'corrected' | 'rejected' | 'returned'

export async function rpcDecideReview(
  db: ReviewRpcClient,
  opts: {
    actorId: string
    taskId: string
    decision: ReviewDecisionKind
    notes?: string | null
    editedBody?: string | null
  }
): Promise<ReviewRpcResult> {
  const { data, error } = await db.rpc('decide_review', {
    p_actor: opts.actorId,
    p_task_id: opts.taskId,
    p_decision: opts.decision,
    p_notes: opts.notes ?? null,
    p_edited_body: opts.editedBody ?? null,
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo registrar la decisión.' }
  }
  return {
    ok: true,
    id: typeof data === 'string' ? data : undefined,
  }
}

export async function rpcSaveReviewEdit(
  db: ReviewRpcClient,
  opts: { actorId: string; taskId: string; editedBody: string }
): Promise<ReviewRpcResult> {
  const { data, error } = await db.rpc('save_review_edit', {
    p_actor: opts.actorId,
    p_task_id: opts.taskId,
    p_edited_body: opts.editedBody,
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo guardar la edición.' }
  }
  return {
    ok: true,
    id: typeof data === 'string' ? data : undefined,
  }
}

export async function rpcReassignReview(
  db: ReviewRpcClient,
  opts: { actorId: string; taskId: string; newAssigneeId: string }
): Promise<ReviewRpcResult> {
  const { error } = await db.rpc('reassign_review', {
    p_actor: opts.actorId,
    p_task_id: opts.taskId,
    p_new_assignee: opts.newAssigneeId,
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo reasignar la tarea.' }
  }
  return { ok: true }
}

export async function rpcCreateDelivery(
  db: ReviewRpcClient,
  opts: {
    actorId: string
    aiOutputId: string
    matterId: string
    channel: string
    recipient: string
    subject: string
    body: string
    confirm: boolean
  }
): Promise<ReviewRpcResult> {
  const { data, error } = await db.rpc('create_delivery', {
    p_actor: opts.actorId,
    p_ai_output_id: opts.aiOutputId,
    p_matter_id: opts.matterId,
    p_channel: opts.channel,
    p_recipient: opts.recipient,
    p_subject: opts.subject,
    p_body: opts.body,
    p_confirm: opts.confirm,
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo registrar la entrega.' }
  }
  return {
    ok: true,
    id: typeof data === 'string' ? data : undefined,
  }
}
