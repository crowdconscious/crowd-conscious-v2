import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/admin'
import type { CollabRpcResult, MatchAssignmentStatus } from './types'

type RpcClient = NonNullable<ReturnType<typeof tryCreateCiceronAdminClient>>

function parseRpc(data: unknown): CollabRpcResult {
  const row = (data ?? {}) as Record<string, unknown>
  if (row.ok === true) {
    return { ok: true, id: typeof row.id === 'string' ? row.id : undefined }
  }
  return {
    ok: false,
    policyId: typeof row.policy_id === 'string' ? row.policy_id : 'unknown',
    policyReason:
      typeof row.policy_reason === 'string'
        ? row.policy_reason
        : 'No se pudo completar la acción.',
  }
}

export async function rpcAssignMatch(
  db: RpcClient,
  args: {
    firmId: string
    matchId: string
    actor: string
    assignee: string
    matterId: string
    dueAt?: string | null
  }
): Promise<CollabRpcResult> {
  const { data, error } = await db.rpc('assign_match', {
    p_firm_id: args.firmId,
    p_match_id: args.matchId,
    p_actor: args.actor,
    p_assignee: args.assignee,
    p_matter_id: args.matterId,
    p_due_at: args.dueAt ?? null,
  })
  if (error) {
    return { ok: false, policyId: 'rpc_error', policyReason: error.message }
  }
  return parseRpc(data)
}

export async function rpcUpdateAssignmentStatus(
  db: RpcClient,
  args: {
    firmId: string
    assignmentId: string
    actor: string
    status: MatchAssignmentStatus
  }
): Promise<CollabRpcResult> {
  const { data, error } = await db.rpc('update_match_assignment_status', {
    p_firm_id: args.firmId,
    p_assignment_id: args.assignmentId,
    p_actor: args.actor,
    p_status: args.status,
  })
  if (error) {
    return { ok: false, policyId: 'rpc_error', policyReason: error.message }
  }
  return parseRpc(data)
}

export async function rpcAddMatchComment(
  db: RpcClient,
  args: {
    firmId: string
    matchId: string
    actor: string
    matterId: string
    body: string
    mentions: string[]
  }
): Promise<CollabRpcResult> {
  const { data, error } = await db.rpc('add_match_comment', {
    p_firm_id: args.firmId,
    p_match_id: args.matchId,
    p_actor: args.actor,
    p_matter_id: args.matterId,
    p_body: args.body,
    p_mentions: args.mentions,
  })
  if (error) {
    return { ok: false, policyId: 'rpc_error', policyReason: error.message }
  }
  return parseRpc(data)
}

export async function rpcEditMatchComment(
  db: RpcClient,
  args: {
    firmId: string
    commentId: string
    actor: string
    body: string
    mentions: string[]
  }
): Promise<CollabRpcResult> {
  const { data, error } = await db.rpc('edit_match_comment', {
    p_firm_id: args.firmId,
    p_comment_id: args.commentId,
    p_actor: args.actor,
    p_body: args.body,
    p_mentions: args.mentions,
  })
  if (error) {
    return { ok: false, policyId: 'rpc_error', policyReason: error.message }
  }
  return parseRpc(data)
}

export async function rpcSoftDeleteMatchComment(
  db: RpcClient,
  args: { firmId: string; commentId: string; actor: string }
): Promise<CollabRpcResult> {
  const { data, error } = await db.rpc('soft_delete_match_comment', {
    p_firm_id: args.firmId,
    p_comment_id: args.commentId,
    p_actor: args.actor,
  })
  if (error) {
    return { ok: false, policyId: 'rpc_error', policyReason: error.message }
  }
  return parseRpc(data)
}
