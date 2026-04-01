import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import type { PulseListingLocale } from '@/lib/i18n/pulse-listing'

export type PulseListingMarketRow = {
  id: string
  title: string
  translations: unknown
  pulse_client_name: string | null
  pulse_client_logo: string | null
  cover_image_url: string | null
  status: string
  total_votes: number | null
  resolution_date: string | null
  created_at: string
  market_type: string | null
  category: string | null
  is_pulse: boolean | null
}

const PULSE_SELECT =
  'id, title, translations, pulse_client_name, pulse_client_logo, cover_image_url, status, total_votes, resolution_date, created_at, market_type, category, is_pulse'

/** Or: pulse flag, pulse category, or legacy government multi surveys */
const PULSE_OR =
  'is_pulse.eq.true,category.eq.pulse,and(market_type.eq.multi,category.eq.government)'

export async function getPulseListingLocale(): Promise<PulseListingLocale> {
  const cookieStore = await cookies()
  return cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

export type PulseListingContext = {
  locale: PulseListingLocale
  isAdmin: boolean
  sponsorAccount: { id: string; company_name: string } | null
}

export async function getPulseListingContext(): Promise<PulseListingContext> {
  const locale = await getPulseListingLocale()
  const user = await getCurrentUser()
  if (!user) {
    return { locale, isAdmin: false, sponsorAccount: null }
  }

  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: prof } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = prof?.email?.toLowerCase().trim()
  const isAdmin =
    prof?.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)

  let sponsorAccount: { id: string; company_name: string } | null = null
  if (!isAdmin && prof?.email?.trim()) {
    const { data: sa } = await admin
      .from('sponsor_accounts')
      .select('id, company_name')
      .eq('is_pulse_client', true)
      .ilike('contact_email', prof.email.trim())
      .maybeSingle()
    if (sa) sponsorAccount = { id: sa.id, company_name: sa.company_name }
  }

  return { locale, isAdmin, sponsorAccount }
}

export async function fetchPulseMarketsForListing(ctx: PulseListingContext): Promise<PulseListingMarketRow[]> {
  const publicClient = await createClient()
  const admin = createAdminClient()

  if (ctx.isAdmin) {
    const { data: rows } = await admin
      .from('prediction_markets')
      .select(PULSE_SELECT)
      .is('archived_at', null)
      .or(PULSE_OR)
      .order('created_at', { ascending: false })
    return (rows ?? []) as PulseListingMarketRow[]
  }

  if (ctx.sponsorAccount) {
    const { data: rows } = await admin
      .from('prediction_markets')
      .select(PULSE_SELECT)
      .is('archived_at', null)
      .eq('sponsor_account_id', ctx.sponsorAccount.id)
      .or(PULSE_OR)
      .order('created_at', { ascending: false })
    return (rows ?? []) as PulseListingMarketRow[]
  }

  const { data: rows } = await publicClient
    .from('prediction_markets')
    .select(PULSE_SELECT)
    .is('archived_at', null)
    .in('status', ['active', 'trading'])
    .or(PULSE_OR)
    .order('created_at', { ascending: false })

  return (rows ?? []) as PulseListingMarketRow[]
}
