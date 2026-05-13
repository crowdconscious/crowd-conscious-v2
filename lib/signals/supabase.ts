/**
 * Typed Supabase admin client for Citizen Signals routes.
 *
 * The repo-wide `createAdminClient` is intentionally untyped (the broader
 * codebase touches tables we have not modelled in `types/database.ts` yet
 * — see lib/supabase.ts for the longer note). Signal code lives in a clean
 * island where every table is fully modelled, so we re-type the client at
 * the import boundary and never use `(supabase as any)` inside the feature.
 *
 * Use this helper instead of importing `createAdminClient` directly in any
 * file under app/api/signals, app/api/admin/signals,
 * app/api/cron/signal-*, app/signals, or app/(public)/dashboard/target.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient as createUntypedAdminClient } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

export function createSignalsAdminClient(): SupabaseClient<Database> {
  return createUntypedAdminClient() as unknown as SupabaseClient<Database>
}

export type SignalsAdminClient = SupabaseClient<Database>
