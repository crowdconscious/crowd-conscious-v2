import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../types/database'

// Singleton pattern to prevent multiple GoTrueClient instances
let clientAuthInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

// Client-side auth (for components with "use client")
// Uses singleton pattern to avoid "Multiple GoTrueClient instances" warning
export const createClientAuth = () => {
  if (!clientAuthInstance) {
    clientAuthInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return clientAuthInstance
}
