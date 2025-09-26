import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

// Client-side auth (for components with "use client")
export const createClientAuth = () => 
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
