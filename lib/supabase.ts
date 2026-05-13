import { createClient } from '@supabase/supabase-js'

/**
 * Anon singleton — kept for legacy imports. For new code prefer:
 * - `@/lib/supabase-client` in browser/client components
 * - `@/lib/supabase-server` in server components / route handlers
 * - `@/lib/supabase-admin` for service-role server work
 *
 * Intentionally untyped. The hand-rolled `types/database.ts` is incomplete
 * (many tables — `promo_codes`, `fund_causes`, `xp_transactions`, ... — are
 * missing). Adding the Database generic here would surface 30+ existing
 * type errors at the call sites. Once you regenerate types from the live
 * DB (`supabase gen types`), swap `createClient` for `createClient<Database>`.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
