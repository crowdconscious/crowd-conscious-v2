import 'server-only'

import { cookies } from 'next/headers'
import { CICERON_DEMO_COOKIE, CICERON_FIRM_NAME } from '@/lib/ciceron/config'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import {
  hashSessionToken,
  inviteHashCandidates,
  isSessionTokenShape,
  mintSessionToken,
  normalizeInviteCode,
} from '@/lib/ciceron/demo/invite-hash'
import {
  offlinePersonaById,
  offlinePersonaByInvite,
  offlineSwitchablePersonas,
  roleLabel,
  type DemoPersona,
} from '@/lib/ciceron/demo/personas'

const OFFLINE_PERSONA_COOKIE = 'ciceron_offline_persona'

export type DemoSession = {
  sessionId: string | null
  inviteCodeId: string | null
  persona: DemoPersona
  storyDismissed: boolean
  /** Raw cookie token (opaque) — needed for RPCs. */
  token: string
  offline: boolean
}

type ResolveRow = {
  ok: boolean
  session_id?: string
  firm_id?: string
  firm_name?: string
  firm_slug?: string
  persona_id?: string
  role?: CiceronMembershipRole
  display_name?: string
  invite_code_id?: string
  story_dismissed?: boolean
  last_freshness_at?: string | null
}

function mapResolved(row: ResolveRow, token: string): DemoSession | null {
  if (!row.ok || !row.persona_id || !row.firm_id || !row.role) return null
  return {
    sessionId: row.session_id ?? null,
    inviteCodeId: row.invite_code_id ?? null,
    storyDismissed: Boolean(row.story_dismissed),
    token,
    offline: false,
    persona: {
      id: row.persona_id,
      firmId: row.firm_id,
      role: row.role,
      displayName: row.display_name ?? 'Usuario Demo',
      inviteCode: '',
      firmName: row.firm_name ?? CICERON_FIRM_NAME,
      firmSlug: row.firm_slug ?? 'despacho-demo',
    },
  }
}

function applyOfflinePersonaOverride(
  base: DemoPersona,
  overrideId: string | undefined
): DemoPersona {
  if (!overrideId) return base
  const override = offlinePersonaById(overrideId)
  if (!override || override.firmId !== base.firmId) return base
  if (!['socio', 'asociado', 'pasante'].includes(override.role)) return base
  return override
}

/** Resolve invite code → start session (hashed redeem when DB available). */
export async function redeemInviteCode(opts: {
  code: string
  workEmail?: string | null
}): Promise<
  | { ok: true; session: DemoSession; token: string }
  | { ok: false; error: string; policyId?: string; policyReason?: string }
> {
  const normalized = normalizeInviteCode(opts.code)
  if (!normalized) {
    return { ok: false, error: 'invalid' }
  }

  const db = tryCreateCiceronAdminClient()
  if (db) {
    let candidates: { version: 1 | 2; hash: string }[]
    try {
      candidates = inviteHashCandidates(normalized)
    } catch {
      return {
        ok: false,
        error: 'invalid',
        policyId: 'invite_pepper',
        policyReason: 'Configuración de invitación incompleta.',
      }
    }
    try {
      const token = mintSessionToken()
      const tokenHash = hashSessionToken(token)
      let lastDeny: Record<string, unknown> | null = null

      // Try each configured pepper version until a hash matches a row.
      for (const candidate of candidates) {
        const { data, error } = await db.rpc('redeem_invite', {
          p_code_hash: candidate.hash,
          p_token_hash: tokenHash,
          p_work_email: opts.workEmail?.trim() || null,
          p_session_ttl_hours: 24,
        })
        if (error) {
          return { ok: false, error: 'invalid', policyReason: error.message }
        }
        const row = data as Record<string, unknown> | null
        if (row && row.ok === true) {
          const personaId = String(row.persona_id)
          const offline = offlinePersonaById(personaId)
          const session: DemoSession = {
            sessionId: String(row.session_id),
            inviteCodeId: String(row.invite_code_id),
            storyDismissed: false,
            token,
            offline: false,
            persona: offline ?? {
              id: personaId,
              firmId: String(row.firm_id),
              role: row.role as CiceronMembershipRole,
              displayName: 'Usuario Demo',
              inviteCode: '',
              firmName: CICERON_FIRM_NAME,
              firmSlug: 'despacho-demo',
            },
          }
          return { ok: true, session, token }
        }
        lastDeny = row
        // Soft miss — try next pepper version. Hard denials (expired, etc.) stop.
        const policyId =
          typeof row?.policy_id === 'string' ? row.policy_id : 'invite_invalid'
        if (policyId !== 'invite_invalid' && policyId !== 'invite_hash') {
          return {
            ok: false,
            error: 'invalid',
            policyId,
            policyReason:
              typeof row?.policy_reason === 'string' ? row.policy_reason : undefined,
          }
        }
      }

      return {
        ok: false,
        error: 'invalid',
        policyId:
          typeof lastDeny?.policy_id === 'string' ? lastDeny.policy_id : 'invite_invalid',
        policyReason:
          typeof lastDeny?.policy_reason === 'string'
            ? lastDeny.policy_reason
            : undefined,
      }
    } catch (err) {
      return {
        ok: false,
        error: 'invalid',
        policyReason: err instanceof Error ? err.message : 'invalid',
      }
    }
  }

  const persona = offlinePersonaByInvite(normalized)
  if (!persona) return { ok: false, error: 'invalid' }
  const token = `offline:${normalized}`
  return {
    ok: true,
    token,
    session: {
      sessionId: null,
      inviteCodeId: null,
      persona,
      storyDismissed: false,
      token,
      offline: true,
    },
  }
}

/**
 * When a DB client is configured: ONLY 64-hex session tokens via resolve_demo_session.
 * Offline invite-code fallback runs only when no DB is configured, and never yields admin.
 */
export async function resolveSessionByToken(
  token: string,
  offlinePersonaOverrideId?: string
): Promise<DemoSession | null> {
  const raw = token.trim()
  if (!raw) return null

  const db = tryCreateCiceronAdminClient()
  if (db) {
    if (!isSessionTokenShape(raw)) return null
    try {
      const { data, error } = await db.rpc('resolve_demo_session', {
        p_token_hash: hashSessionToken(raw),
      })
      if (error || !data) return null
      const mapped = mapResolved(data as ResolveRow, raw)
      if (mapped) {
        // supabase-js builders are lazy until awaited/then'd — `void db.rpc(...)`
        // never sends the request. Await so it runs; catch so freshness failure
        // does not fail session resolution.
        try {
          const { error: freshnessError } = await db.rpc('touch_session_freshness', {
            p_token_hash: hashSessionToken(raw),
          })
          if (freshnessError) {
            console.warn(
              '[ciceron] touch_session_freshness failed:',
              freshnessError.message
            )
          }
        } catch (err) {
          console.warn('[ciceron] touch_session_freshness failed:', err)
        }
      }
      return mapped
    } catch {
      return null
    }
  }

  // Offline only — never admin
  let code = raw
  if (raw.startsWith('offline:')) {
    code = raw.slice('offline:'.length)
  } else if (isSessionTokenShape(raw)) {
    return null
  }

  const base = offlinePersonaByInvite(code)
  if (!base) return null
  const persona = applyOfflinePersonaOverride(base, offlinePersonaOverrideId)
  return {
    sessionId: null,
    inviteCodeId: null,
    persona,
    storyDismissed: false,
    token: raw.startsWith('offline:') ? raw : `offline:${base.inviteCode}`,
    offline: true,
  }
}

export async function getCiceronDemoSession(): Promise<DemoPersona | null> {
  const full = await getCiceronDemoSessionFull()
  return full?.persona ?? null
}

export async function getCiceronDemoSessionFull(): Promise<DemoSession | null> {
  const jar = await cookies()
  const raw = jar.get(CICERON_DEMO_COOKIE)?.value
  if (!raw) return null
  const override = jar.get(OFFLINE_PERSONA_COOKIE)?.value
  return resolveSessionByToken(raw, override)
}

export async function switchPersona(
  personaId: string
): Promise<
  | { ok: true; persona: DemoPersona }
  | { ok: false; message: string; policyId?: string; policyReason?: string }
> {
  const full = await getCiceronDemoSessionFull()
  if (!full) return { ok: false, message: 'Sin sesión.' }

  if (full.offline || !isSessionTokenShape(full.token)) {
    const persona = offlinePersonaById(personaId)
    if (!persona || persona.firmId !== full.persona.firmId) {
      return { ok: false, message: 'Persona no disponible.' }
    }
    if (!['socio', 'asociado', 'pasante'].includes(persona.role)) {
      return { ok: false, message: 'Solo Socia, Asociado o Pasante.' }
    }
    const jar = await cookies()
    jar.set(OFFLINE_PERSONA_COOKIE, persona.id, {
      path: '/ciceron',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      httpOnly: true,
    })
    return { ok: true, persona }
  }

  const db = tryCreateCiceronAdminClient()
  if (!db) return { ok: false, message: 'Base no disponible.' }

  const { data, error } = await db.rpc('switch_demo_persona', {
    p_token_hash: hashSessionToken(full.token),
    p_persona_id: personaId,
  })
  if (error) return { ok: false, message: error.message }
  const row = data as Record<string, unknown> | null
  if (!row || row.ok === false) {
    return {
      ok: false,
      message: String(row?.policy_reason ?? 'No se pudo cambiar la persona.'),
      policyId: typeof row?.policy_id === 'string' ? row.policy_id : undefined,
      policyReason:
        typeof row?.policy_reason === 'string' ? row.policy_reason : undefined,
    }
  }
  const persona =
    offlinePersonaById(String(row.persona_id)) ??
    ({
      id: String(row.persona_id),
      firmId: full.persona.firmId,
      role: row.role as CiceronMembershipRole,
      displayName: String(row.display_name ?? 'Usuario Demo'),
      inviteCode: '',
      firmName: full.persona.firmName,
      firmSlug: full.persona.firmSlug,
    } satisfies DemoPersona)
  return { ok: true, persona }
}

export function sessionMeta(persona: DemoPersona) {
  return {
    firmName: persona.firmName,
    userName: persona.displayName,
    role: roleLabel(persona.role),
    roleKey: persona.role,
    personaId: persona.id,
    firmId: persona.firmId,
  }
}

export function switchablePersonasForFirm(firmId: string): DemoPersona[] {
  return offlineSwitchablePersonas(firmId)
}
