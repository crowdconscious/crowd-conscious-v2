import 'server-only'

import { cookies } from 'next/headers'
import { CICERON_DEMO_COOKIE } from '@/lib/ciceron/config'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import {
  offlinePersonaByInvite,
  type DemoPersona,
  roleLabel,
} from '@/lib/ciceron/demo/personas'

type PersonaRow = {
  id: string
  firm_id: string
  role: CiceronMembershipRole
  display_name: string
  invite_code: string
  firms: { name: string; slug: string } | { name: string; slug: string }[] | null
}

function mapPersonaRow(row: PersonaRow): DemoPersona {
  const firm = Array.isArray(row.firms) ? row.firms[0] : row.firms
  return {
    id: row.id,
    firmId: row.firm_id,
    role: row.role,
    displayName: row.display_name,
    inviteCode: row.invite_code,
    firmName: firm?.name ?? 'Despacho Demo, S.C.',
    firmSlug: firm?.slug ?? 'despacho-demo',
  }
}

/** Resolve invite code → persona via service role; fall back to offline seed map. */
export async function resolvePersonaByInvite(code: string): Promise<DemoPersona | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  const db = tryCreateCiceronAdminClient()
  if (db) {
    try {
      const { data, error } = await db
        .from('demo_personas')
        .select('id, firm_id, role, display_name, invite_code, firms(name, slug)')
        .eq('invite_code', normalized)
        .limit(1)

      if (!error && Array.isArray(data) && data[0]) {
        return mapPersonaRow(data[0] as PersonaRow)
      }
    } catch {
      // fall through to offline map
    }
  }

  return offlinePersonaByInvite(normalized)
}

export async function getCiceronDemoSession(): Promise<DemoPersona | null> {
  const jar = await cookies()
  const raw = jar.get(CICERON_DEMO_COOKIE)?.value
  if (!raw) return null
  return resolvePersonaByInvite(raw)
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
