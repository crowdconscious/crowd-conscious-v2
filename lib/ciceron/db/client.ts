import 'server-only'

import { createAdminClient } from '@/lib/supabase-admin'
import { createClient as createServerUserClient } from '@/lib/supabase-server'

/** Minimal binder until `types/database.ts` surgically gains a `ciceron` namespace. */
type SchemaCapable = {
  schema: (name: 'ciceron') => {
    from: (table: string) => unknown
    rpc: (fn: string, args?: Record<string, unknown>) => unknown
  }
}

/** RLS-respecting client for server components / route handlers. */
export async function createCiceronUserClient() {
  const supabase = (await createServerUserClient()) as unknown as SchemaCapable
  return supabase.schema('ciceron')
}

/** Service-role client — pipelines, seed repair, cron. Bypasses RLS. */
export function createCiceronAdminClient() {
  const supabase = createAdminClient() as unknown as SchemaCapable
  return supabase.schema('ciceron')
}
