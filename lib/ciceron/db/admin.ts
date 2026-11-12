/**
 * Service-role helpers safe to import from gateway code under test.
 * Prefer `lib/ciceron/db/client.ts` in App Router server modules.
 */
import { createClient } from '@supabase/supabase-js'

type CiceronQueryResult = {
  data: unknown
  error: { message: string } | null
  count?: number | null
}

type CiceronQuery = {
  select: (columns?: string, opts?: { count?: 'exact'; head?: boolean }) => CiceronQuery
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => CiceronQuery
  upsert: (
    values: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  ) => CiceronQuery
  update: (values: Record<string, unknown>) => CiceronQuery
  eq: (column: string, value: string | boolean | number | null) => CiceronQuery
  gte: (column: string, value: string | number) => CiceronQuery
  in: (column: string, values: readonly string[]) => CiceronQuery
  is: (column: string, value: null) => CiceronQuery
  or: (filters: string) => CiceronQuery
  not: (column: string, operator: string, value: string) => CiceronQuery
  order: (column: string, opts?: { ascending?: boolean }) => CiceronQuery
  limit: (count: number) => CiceronQuery
  then: Promise<CiceronQueryResult>['then']
}

type SchemaCapable = {
  schema: (name: 'ciceron') => {
    from: (table: string) => CiceronQuery
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  }
}

export function tryCreateCiceronAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as SchemaCapable
    return supabase.schema('ciceron')
  } catch {
    return null
  }
}
