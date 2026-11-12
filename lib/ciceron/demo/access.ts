/**
 * Prompt 9 access showcase helpers — call evaluate_access / try_access_demo RPCs.
 * User-facing Spanish uses «permisos por rol» / «permisos por asunto» (not RBAC/ABAC).
 */

import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { CICERON_P9_SEED } from '@/lib/ciceron/demo/seed-ids'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import {
  ACCESS_SHOWCASE,
  accessDemoRpcError,
  buildTryAccessDemoArgs,
  offlineTryAccess,
  type AccessResult,
  type TryAccessDemoResult,
} from '@/lib/ciceron/demo/access-pure'

export type { AccessResult, TryAccessDemoResult }
export { ACCESS_SHOWCASE, accessDemoRpcError, buildTryAccessDemoArgs, offlineTryAccess }

function parseAccess(data: unknown): AccessResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, policyReason: 'Respuesta de acceso no válida.' }
  }
  const row = data as Record<string, unknown>
  return {
    ok: row.ok === true,
    policyId: typeof row.policy_id === 'string' ? row.policy_id : null,
    policyReason: typeof row.policy_reason === 'string' ? row.policy_reason : null,
    model: typeof row.model === 'string' ? row.model : null,
    actorRole: typeof row.actor_role === 'string' ? row.actor_role : null,
    sensitivity: typeof row.sensitivity === 'string' ? row.sensitivity : null,
  }
}

export async function evaluateAccess(opts: {
  actor: DemoPersona
  action: string
  resourceType?: string | null
  resourceId?: string | null
  clientId?: string | null
  matterId?: string | null
  log?: boolean
}): Promise<AccessResult> {
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    if (opts.action === 'approve_review' && opts.actor.role === 'pasante') {
      return {
        ok: false,
        policyId: 'rbac_role',
        policyReason:
          'Solo socio, asociado o administrador puede aprobar una revisión (permisos por rol).',
        model: 'rbac',
        actorRole: 'pasante',
      }
    }
    if (
      opts.clientId === CICERON_SEED.clientsExtra.farma &&
      opts.actor.id === CICERON_P9_SEED.personas.abacAsociado
    ) {
      return {
        ok: false,
        policyId: 'abac_conflict_wall',
        policyReason:
          'Muro de conflicto: usted está asignado a un cliente en conflicto con este cliente (permisos por asunto).',
        model: 'abac',
      }
    }
    if (opts.resourceId === CICERON_P9_SEED.documents.confidencialExpired) {
      return {
        ok: false,
        policyId: 'abac_grant_expired',
        policyReason:
          'El permiso temporal para este documento ya expiró (permisos por asunto: concesión con vigencia).',
        model: 'abac',
      }
    }
    return { ok: true, model: opts.actor.accessModel ?? 'rbac' }
  }

  const { data, error } = await db.rpc('evaluate_access', {
    p_actor: opts.actor.id,
    p_firm_id: opts.actor.firmId,
    p_action: opts.action,
    p_resource_type: opts.resourceType ?? null,
    p_resource_id: opts.resourceId ?? null,
    p_client_id: opts.clientId ?? null,
    p_matter_id: opts.matterId ?? null,
    p_log: opts.log ?? true,
  })
  if (error) {
    return { ok: false, policyReason: error.message }
  }
  return parseAccess(data)
}

/**
 * Run the access showcase (permisos por rol / por asunto). Offline fixtures only
 * when no DB client is configured. When DB is configured and the RPC fails,
 * returns an error state (not offline examples). Passes the real session persona
 * as p_caller for simulated-denial attribution.
 */
export async function tryAccessDemo(
  persona: DemoPersona,
  scenario: 'rbac' | 'abac'
): Promise<TryAccessDemoResult> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return offlineTryAccess(scenario)

  const args = buildTryAccessDemoArgs(persona, scenario)

  try {
    const { data, error } = await db.rpc('try_access_demo', args)
    if (error) {
      return accessDemoRpcError(scenario, error.message)
    }
    if (!data || typeof data !== 'object') {
      return accessDemoRpcError(scenario, 'Respuesta de acceso no válida.')
    }
    const row = data as Record<string, unknown>
    if (row.ok === false) {
      return accessDemoRpcError(
        scenario,
        typeof row.policy_reason === 'string'
          ? row.policy_reason
          : 'No se pudo evaluar el acceso.'
      )
    }
    return {
      ok: true,
      scenario,
      explainer:
        typeof row.explainer === 'string'
          ? row.explainer
          : offlineTryAccess(scenario).explainer,
      allowed: parseAccess(row.allowed),
      denied: parseAccess(row.denied),
    }
  } catch (err) {
    return accessDemoRpcError(
      scenario,
      err instanceof Error ? err.message : 'Error al evaluar el acceso.'
    )
  }
}
