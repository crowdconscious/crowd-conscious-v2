import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'
import type { Database } from '@/types/database'

// Initialize Stripe lazily to avoid build-time errors
let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil'
    })
  }
  return stripe
}

// Lazy-singleton service-role client. Delegates to the canonical
// createAdminClient helper so we don't fork connection setup. The cast to
// `SupabaseClient<Database>` is local to the Stripe webhook surface where
// every queried table is fully modeled in `types/database.ts`.
let supabase: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    supabase = createAdminClient() as unknown as SupabaseClient<Database>
  }
  return supabase
}

