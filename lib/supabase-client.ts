import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

// Client-side Supabase client with proper browser configuration
export const createSupabaseClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Pre-configured client for immediate use
export const supabaseClient = createSupabaseClient()
