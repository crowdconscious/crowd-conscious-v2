import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// Helper to get current user server-side
export async function getCurrentUser() {
  try {
    const supabase = await createServerAuth()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    // Get full profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return profile
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
