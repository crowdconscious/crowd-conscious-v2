import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with admin privileges (service role key)
 * 
 * **USE CASES**:
 * - Server-side API routes that need to bypass RLS
 * - Admin operations (user management, bulk updates)
 * - Background jobs and webhooks
 * 
 * **⚠️ SECURITY WARNING**:
 * - ONLY use in API routes (server-side)
 * - NEVER expose service role key to client
 * - NEVER use in client components or pages
 * - Always validate user permissions before using
 * 
 * **EXAMPLE**:
 * ```typescript
 * // In API route
 * import { createAdminClient } from '@/lib/supabase-admin'
 * 
 * export async function POST(req: Request) {
 *   const adminClient = createAdminClient()
 *   
 *   // Bypass RLS for admin operations
 *   const { data } = await adminClient
 *     .from('cart_items')
 *     .select('*')
 *     .eq('user_id', userId)
 *   
 *   return NextResponse.json(data)
 * }
 * ```
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env.local file.'
    )
  }

  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This should ONLY be used server-side. ' +
      'Please add it to your .env.local file.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

