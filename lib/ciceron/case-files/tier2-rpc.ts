/**
 * Service-role RPC wrappers for tier-2 confirms/approves/discards.
 * DB functions set_actor(p_actor) then UPDATE so current_actor_id() matches
 * the row's confirmed_by / *_persona columns under the 310/311 gates.
 */

export type Tier2RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

export type Tier2RpcResult =
  | { ok: true }
  | { ok: false; message: string }

export async function rpcConfirmDeadline(
  db: Tier2RpcClient,
  opts: { actorId: string; deadlineId: string; decision?: 'confirmado' }
): Promise<Tier2RpcResult> {
  const { error } = await db.rpc('confirm_deadline', {
    p_actor: opts.actorId,
    p_deadline_id: opts.deadlineId,
    p_decision: opts.decision ?? 'confirmado',
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo confirmar el plazo.' }
  }
  return { ok: true }
}

export async function rpcDiscardDeadline(
  db: Tier2RpcClient,
  opts: { actorId: string; deadlineId: string }
): Promise<Tier2RpcResult> {
  const { error } = await db.rpc('discard_deadline', {
    p_actor: opts.actorId,
    p_deadline_id: opts.deadlineId,
  })
  if (error) {
    return { ok: false, message: error.message || 'No se pudo descartar el plazo.' }
  }
  return { ok: true }
}

export async function rpcApproveClientNotify(
  db: Tier2RpcClient,
  opts: { actorId: string; draftId: string }
): Promise<Tier2RpcResult> {
  const { error } = await db.rpc('approve_client_notify', {
    p_actor: opts.actorId,
    p_draft_id: opts.draftId,
  })
  if (error) {
    return {
      ok: false,
      message: error.message || 'No se pudo registrar el envío simulado.',
    }
  }
  return { ok: true }
}
