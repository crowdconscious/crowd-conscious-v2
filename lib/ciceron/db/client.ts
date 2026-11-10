import 'server-only'

import { createAdminClient } from '@/lib/supabase-admin'
import { createClient as createServerUserClient } from '@/lib/supabase-server'

/** Minimal PostgREST filter chain until `types/database.ts` gains `ciceron`. */
export type CiceronQuery = {
  select: (columns: string, opts?: { count?: 'exact'; head?: boolean }) => CiceronQuery
  eq: (column: string, value: string | boolean | number) => CiceronQuery
  in: (column: string, values: readonly string[]) => CiceronQuery
  order: (column: string, opts?: { ascending?: boolean }) => CiceronQuery
  limit: (count: number) => CiceronQuery
  then: Promise<{
    data: unknown
    error: { message: string } | null
  }>['then']
}

type SchemaCapable = {
  schema: (name: 'ciceron') => {
    from: (table: string) => CiceronQuery
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{
      data: unknown
      error: { message: string } | null
    }>
  }
}

/** RLS-respecting client for server components / route handlers (JWT actor). */
export async function createCiceronUserClient() {
  const supabase = (await createServerUserClient()) as unknown as SchemaCapable
  return supabase.schema('ciceron')
}

/**
 * Service-role client for invite-cookie demo sessions.
 * Bypasses RLS — callers MUST filter by persona firm_id / matter memberships.
 */
export function createCiceronAdminClient() {
  const supabase = createAdminClient() as unknown as SchemaCapable
  return supabase.schema('ciceron')
}

export function tryCreateCiceronAdminClient() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null
    }
    return createCiceronAdminClient()
  } catch {
    return null
  }
}
