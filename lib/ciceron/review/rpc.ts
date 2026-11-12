/**
 * Service-role RPC wrappers for Prompt 7 review / delivery gates.
 * decide_review / create_delivery return jsonb {ok, id?} | {ok:false, policy_*}.
 */

export type ReviewRpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

export type ReviewRpcResult =
  | { ok: true; id?: string }
  | { ok: false; message: string; policyId?: string; policyReason?: string }

export type ReviewDecisionKind = 'approved' | 'corrected' | 'rejected' | 'returned'

function parseJsonbResult(data: unknown, fallbackMessage: string): ReviewRpcResult {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const row = data as Record<string, unknown>
    if (row.ok === false) {
      const policyId = typeof row.policy_id === 'string' ? row.policy_id : undefined
      const policyReason =
        typeof row.policy_reason === 'string' ? row.policy_reason : undefined
      return {
        ok: false,
        message: policyReason || fallbackMessage,
        policyId,
        policyReason,
      }
    }
    if (row.ok === true) {
      return {
        ok: true,
        id: typeof row.id === 'string' ? row.id : undefined,
      }
    }
  }
  if (typeof data === 'string') {
    return { ok: true, id: data }
  }
  return { ok: true }
}

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
  return parseJsonbResult(data, 'No se pudo registrar la decisión.')
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
  return parseJsonbResult(data, 'No se pudo registrar la entrega.')
}
