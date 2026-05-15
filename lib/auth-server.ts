import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient, type User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/** Thrown when session is invalid (e.g. refresh token not found). Caller should return 401. */
export class AuthSessionExpiredError extends Error {
  constructor(message = 'Session expired or invalid') {
    super(message)
    this.name = 'AuthSessionExpiredError'
  }
}

// Server-side auth (for server components) - full cookie handling for token refresh + signOut
export const createServerAuth = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component context - ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component context - ignore
          }
        },
      },
    }
  )
}

/**
 * Loose row shape returned by both `getCurrentUser` and
 * `getCurrentUserFromRequest`. The Supabase JS client used here is
 * constructed without a generated `Database` type, so historically these
 * helpers returned an inferred-`any` row. We pin the canonical columns
 * the rest of the app reads (id/email/full_name/user_type/avatar_url) for
 * better intellisense, and keep an index signature so callers that
 * already touch other `profiles` columns continue to compile.
 */
export type AuthProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  user_type: string | null
  avatar_url: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Shared profile fallback used by BOTH the cookie path (`getCurrentUser`)
 * and the Bearer path (`getCurrentUserFromRequest`). Mirrors the historical
 * behavior: try to read profile, and if missing, upsert it via the admin
 * client (race-safe with the ensure-profile trigger).
 */
async function ensureProfileFallback(
  user: User,
  profile: AuthProfileRow | null,
  profileError: { code?: string } | null
): Promise<AuthProfileRow | null> {
  // Original semantics: only fall through to admin upsert when the
  // profile is missing (PGRST116) or unreadable. A valid profile row
  // short-circuits even if `profileError` is set to something else.
  if (profile && profileError?.code !== 'PGRST116') {
    return profile
  }

  try {
    const { createAdminClient } = await import('./supabase-admin')
    const admin = createAdminClient()

    await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          full_name: user.user_metadata?.full_name ?? '',
          user_type: 'user',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

    await admin
      .from('user_stats')
      .upsert(
        {
          user_id: user.id,
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )

    const { data: newProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return newProfile ?? profile ?? null
  } catch (fallbackErr) {
    console.warn('[auth-server] Profile fallback creation failed:', fallbackErr)
    return profile ?? null
  }
}

// Helper to get current user server-side
export async function getCurrentUser() {
  try {
    const supabase = await createServerAuth()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    // Get full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return await ensureProfileFallback(user, profile, profileError)
  } catch (error: unknown) {
    const authError = error as { message?: string; status?: number; code?: string }
    const isRefreshTokenNotFound =
      authError?.code === 'refresh_token_not_found' ||
      authError?.message?.toLowerCase().includes('refresh token not found')

    if (isRefreshTokenNotFound) {
      // Clear invalid session so user gets clean state on next request
      try {
        const supabase = await createServerAuth()
        await supabase.auth.signOut()
      } catch {
        // Best effort - cookies may already be cleared
      }
      // Don't log - expected when users have stale sessions
      throw new AuthSessionExpiredError()
    }

    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Request-aware variant of `getCurrentUser`. Looks for an
 * `Authorization: Bearer <jwt>` header first (mobile + any external client
 * that holds a Supabase access token) and verifies it with the public
 * anon Supabase client. Falls back to the cookie-based `getCurrentUser()`
 * when no Bearer token is present, or when the Bearer path errors.
 *
 * Return shape and error semantics match `getCurrentUser` so route
 * handlers can swap one for the other safely.
 *
 * Notes:
 * - Uses NEXT_PUBLIC_SUPABASE_ANON_KEY only. The service role key never
 *   touches JWT verification — `auth.getUser(jwt)` only needs the anon
 *   client.
 * - The profile load reuses the same admin-client fallback so the row
 *   shape returned to callers is identical to the cookie path.
 */
export async function getCurrentUserFromRequest(request: NextRequest) {
  const authHeader =
    request.headers.get('authorization') ?? request.headers.get('Authorization')
  const match = authHeader ? /^Bearer\s+(.+)$/i.exec(authHeader.trim()) : null
  const jwt = match?.[1]?.trim()

  if (jwt) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !anonKey) {
        throw new Error(
          'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
        )
      }

      // Stateless client used purely to verify the bearer JWT. We
      // disable token refresh / session persistence so this is safe to
      // construct per-request without leaking auth state.
      const supabase = createSupabaseClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: { user }, error } = await supabase.auth.getUser(jwt)
      if (!error && user) {
        const { createAdminClient } = await import('./supabase-admin')
        const admin = createAdminClient()
        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        return await ensureProfileFallback(user, profile, profileError)
      }
      // Bearer was supplied but invalid/expired. Per spec, fall through
      // to the cookie path — for mobile clients (no cookies) this just
      // resolves to null and the route returns 401.
    } catch (err) {
      console.warn(
        '[getCurrentUserFromRequest] bearer verification threw, falling back to cookie path',
        err
      )
    }
  }

  return getCurrentUser()
}
