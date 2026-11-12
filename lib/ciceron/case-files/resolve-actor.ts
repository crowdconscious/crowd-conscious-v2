import 'server-only'

import { createClient } from '@/lib/supabase-server'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export type CiceronActionActor = {
  actorId: string
  firmId: string
  role: CiceronMembershipRole
  /** Demo invite → persona columns; real JWT → auth.users columns. */
  mode: 'persona' | 'auth'
}

const ROLES: ReadonlySet<string> = new Set(['socio', 'asociado', 'pasante', 'admin'])

function asRole(value: unknown): CiceronMembershipRole | null {
  return typeof value === 'string' && ROLES.has(value)
    ? (value as CiceronMembershipRole)
    : null
}

/**
 * Prefer demo invite cookie; otherwise resolve a real authenticated user
 * via memberships (future auth path).
 */
export async function resolveCiceronActionActor(): Promise<CiceronActionActor | null> {
  const persona = await getCiceronDemoSession()
  if (persona) {
    return {
      actorId: persona.id,
      firmId: persona.firmId,
      role: persona.role,
      mode: 'persona',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return null

    const db = tryCreateCiceronAdminClient()
    if (!db) return null

    const { data, error } = await db
      .from('memberships')
      .select('firm_id, role')
      .eq('user_id', user.id)
      .limit(1)

    if (error || !Array.isArray(data) || !data[0]) return null
    const row = data[0] as { firm_id: string; role: string }
    const role = asRole(row.role)
    if (!role || !row.firm_id) return null

    return {
      actorId: user.id,
      firmId: row.firm_id,
      role,
      mode: 'auth',
    }
  } catch {
    return null
  }
}
