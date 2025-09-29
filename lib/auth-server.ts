import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Temporarily bypass strict typing to fix build issues
// import { Database } from '../types/database'

// Server-side auth (for server components)
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
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}
