import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'

export type SalesInviteRow = {
  inviteCodeId: string
  prospectLabel: string
  firmId: string
  firmName: string
  useCount: number
  maxUses: number | null
  expiresAt: string | null
  isActive: boolean
  sessionsOpened: number
  roomsOpenedApprox: number
  maxStoryStepsCompleted: number
  storiesFinished: number
  lastSeenAt: string | null
}

const FIXTURE: SalesInviteRow[] = [
  {
    inviteCodeId: 'e3000000-0000-4000-8000-000000000001',
    prospectLabel: 'Prospecto socio — Despacho Demo',
    firmId: 'a1000000-0000-4000-8000-000000000001',
    firmName: 'Despacho Demo, S.C.',
    useCount: 3,
    maxUses: 500,
    expiresAt: null,
    isActive: true,
    sessionsOpened: 3,
    roomsOpenedApprox: 5,
    maxStoryStepsCompleted: 4,
    storiesFinished: 0,
    lastSeenAt: new Date().toISOString(),
  },
  {
    inviteCodeId: 'e3000000-0000-4000-8000-000000000002',
    prospectLabel: 'Prospecto pasante — Despacho Demo',
    firmId: 'a1000000-0000-4000-8000-000000000001',
    firmName: 'Despacho Demo, S.C.',
    useCount: 1,
    maxUses: 500,
    expiresAt: null,
    isActive: true,
    sessionsOpened: 1,
    roomsOpenedApprox: 2,
    maxStoryStepsCompleted: 1,
    storiesFinished: 0,
    lastSeenAt: new Date().toISOString(),
  },
]

export async function loadSalesInviteProgress(
  persona: DemoPersona
): Promise<{ rows: SalesInviteRow[]; source: 'schema' | 'fixture' }> {
  if (persona.role !== 'admin') {
    return { rows: [], source: 'fixture' }
  }
  const db = tryCreateCiceronAdminClient()
  if (!db) return { rows: FIXTURE.filter((r) => r.firmId === persona.firmId), source: 'fixture' }

  try {
    const { data, error } = await db
      .from('sales_invite_progress')
      .select(
        'invite_code_id, prospect_label, firm_id, firm_name, use_count, max_uses, expires_at, is_active, sessions_opened, rooms_opened_approx, max_story_steps_completed, stories_finished, last_seen_at'
      )
      .eq('firm_id', persona.firmId)
      .order('prospect_label')

    if (error || !Array.isArray(data)) {
      return { rows: FIXTURE.filter((r) => r.firmId === persona.firmId), source: 'fixture' }
    }

    const rows: SalesInviteRow[] = data.map((r) => {
      const row = r as Record<string, unknown>
      return {
        inviteCodeId: String(row.invite_code_id),
        prospectLabel: String(row.prospect_label),
        firmId: String(row.firm_id),
        firmName: String(row.firm_name),
        useCount: Number(row.use_count ?? 0),
        maxUses: row.max_uses == null ? null : Number(row.max_uses),
        expiresAt: row.expires_at == null ? null : String(row.expires_at),
        isActive: Boolean(row.is_active),
        sessionsOpened: Number(row.sessions_opened ?? 0),
        roomsOpenedApprox: Number(row.rooms_opened_approx ?? 0),
        maxStoryStepsCompleted: Number(row.max_story_steps_completed ?? 0),
        storiesFinished: Number(row.stories_finished ?? 0),
        lastSeenAt: row.last_seen_at == null ? null : String(row.last_seen_at),
      }
    })
    return { rows, source: 'schema' }
  } catch {
    return { rows: FIXTURE.filter((r) => r.firmId === persona.firmId), source: 'fixture' }
  }
}

export async function resetDemoFirm(
  persona: DemoPersona
): Promise<{ ok: true } | { ok: false; message: string; policyId?: string }> {
  if (persona.role !== 'admin') {
    return {
      ok: false,
      message: 'Solo un administrador puede restablecer la demostración.',
      policyId: 'rbac_role',
    }
  }
  const db = tryCreateCiceronAdminClient()
  if (!db) {
    return { ok: true }
  }
  const { data, error } = await db.rpc('reset_demo_firm', {
    p_firm_id: persona.firmId,
    p_actor: persona.id,
  })
  if (error) return { ok: false, message: error.message }
  const row = data as Record<string, unknown> | null
  if (row && row.ok === false) {
    return {
      ok: false,
      message: String(row.policy_reason ?? 'No se pudo restablecer.'),
      policyId: typeof row.policy_id === 'string' ? row.policy_id : undefined,
    }
  }
  return { ok: true }
}
