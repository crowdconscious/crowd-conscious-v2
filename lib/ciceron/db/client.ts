import 'server-only'

import { createAdminClient } from '@/lib/supabase-admin'
import { createClient as createServerUserClient } from '@/lib/supabase-server'

/** Minimal PostgREST filter chain until `types/database.ts` gains `ciceron`. */
export type CiceronQuery = {
  select: (columns?: string, opts?: { count?: 'exact'; head?: boolean }) => CiceronQuery
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => CiceronQuery
  upsert: (
    values: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string; ignoreDuplicates?: boolean }
  ) => CiceronQuery
  update: (values: Record<string, unknown>) => CiceronQuery
  eq: (column: string, value: string | boolean | number | null) => CiceronQuery
  in: (column: string, values: readonly string[]) => CiceronQuery
  is: (column: string, value: null) => CiceronQuery
  order: (column: string, opts?: { ascending?: boolean }) => CiceronQuery
  limit: (count: number) => CiceronQuery
  single: () => Promise<{ data: unknown; error: { message: string } | null }>
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: Promise<{
    data: unknown
    error: { message: string } | null
  }>['then']
}

type StorageBucket = {
  upload: (
    path: string,
    body: string | Buffer | Blob,
    opts?: { contentType?: string; upsert?: boolean }
  ) => Promise<{ data: unknown; error: { message: string } | null }>
  download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>
}

type SchemaCapable = {
  schema: (name: 'ciceron') => {
    from: (table: string) => CiceronQuery
    rpc: (
      fn: string,
      args?: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>
  }
  storage: { from: (bucket: string) => StorageBucket }
}

/** RLS-respecting client for server components / route handlers (JWT actor). */
export async function createCiceronUserClient() {
  const supabase = (await createServerUserClient()) as unknown as SchemaCapable
  return supabase.schema('ciceron')
}

/**
 * Service-role client for invite-cookie demo sessions and pipelines.
 * Bypasses RLS — callers MUST filter by persona firm_id / matter memberships
 * when serving tenant data.
 */
export function createCiceronAdminClient() {
  const supabase = createAdminClient() as unknown as SchemaCapable
  return supabase.schema('ciceron')
}

export function createCiceronAdminStorage() {
  const supabase = createAdminClient() as unknown as SchemaCapable
  return supabase.storage.from('ciceron')
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

export function tryCreateCiceronAdminStorage() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null
    }
    return createCiceronAdminStorage()
  } catch {
    return null
  }
}
