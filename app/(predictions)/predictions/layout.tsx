import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase-server'
import PredictionsShell from './PredictionsShell'
import { PendingVoteSubmitter } from './components/PendingVoteSubmitter'
import LandingNav from '@/app/components/landing/LandingNav'
import { lookupSponsorAccountsForUser } from '@/lib/sponsor-account-lookup'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * Public: no login required.
 *
 * Anonymous users can browse markets and vote via guest_id (see migrations
 * 147_guest_market_votes, 158_anonymous_alias_system, 169_xp_anonymous_resolution,
 * 190_alias_vote_conscious_locations).
 *
 * `EXACT` paths must match the URL exactly — used for `/predictions` so the
 * dashboard root is reachable without making `/predictions/admin/*` public.
 *
 * `PREFIX` paths match the URL or any sub-path. Authenticated-only routes
 * (NOT listed): /predictions/wallet, /predictions/notifications, /predictions/trades,
 * /predictions/insights, /predictions/intelligence, /predictions/admin/*.
 */
const PUBLIC_EXACT_PATHS = ['/predictions']
const PUBLIC_PREFIX_PATHS = [
  '/predictions/leaderboard',
  '/predictions/fund',
  '/predictions/markets',
  '/predictions/inbox',
  '/predictions/pulse',
]

async function getNavCounts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [inboxRes, marketsRes, liveRes] = await Promise.all([
    supabase
      .from('conscious_inbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('archived_at', null),
    supabase
      .from('prediction_markets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'trading'])
      .is('archived_at', null),
    supabase
      .from('live_events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live'),
  ])
  return {
    inboxPending: inboxRes.count ?? 0,
    activeMarkets: marketsRes.count ?? 0,
    liveNowCount: liveRes.count ?? 0,
  }
}

export default async function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isPublicPath =
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIX_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const user = await getCurrentUser()

  if (!isPublicPath && !user) {
    redirect('/login')
  }

  let isAdmin = false
  let navCounts = { inboxPending: 0, activeMarkets: 0, liveNowCount: 0 }
  // Sponsor nav surface: rendered only when a logged-in user owns (or
  // has email access to) at least one sponsor_account. A coupon redeem
  // creates a sponsor row either linked via user_id (if the redeemer
  // was logged in) or only by contact_email (if not). Both paths are
  // resolved by the shared helper.
  let sponsorNav: {
    count: number
    primaryToken: string | null
    primaryCompany: string | null
  } = { count: 0, primaryToken: null, primaryCompany: null }

  if (user) {
    const supabase = await createClient()
    const [profileRes, counts, sponsorSummary] = await Promise.all([
      supabase.from('profiles').select('user_type, email').eq('id', user.id).single(),
      getNavCounts(supabase),
      lookupSponsorAccountsForUser(user),
    ])
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const profileEmail = profileRes.data?.email?.toLowerCase().trim()
    isAdmin =
      profileRes.data?.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail)
    navCounts = counts
    sponsorNav = {
      count: sponsorSummary.count,
      primaryToken: sponsorSummary.primary?.access_token ?? null,
      primaryCompany: sponsorSummary.primary?.company_name ?? null,
    }
  }

  // Anonymous visitors on any public-conversion surface get the LandingNav +
  // Footer wrapper instead of the authed-looking PredictionsShell sidebar.
  // The shell is reserved for logged-in users; showing it to anon on /fund
  // or /markets/<id> looked like a logged-in dashboard and confused visitors
  // who clicked the landing thermometer.
  const isPublicMarketDetail =
    pathname.startsWith('/predictions/markets/') && pathname !== '/predictions/markets/'
  const isPublicFund =
    pathname === '/predictions/fund' || pathname.startsWith('/predictions/fund/')
  const useLandingShellForAnon = !user && (isPublicMarketDetail || isPublicFund)
  if (useLandingShellForAnon) {
    // The root body is `bg-white` (see app/layout.tsx); every "dark" page
    // opts into it explicitly. The landing page uses
    // `min-h-screen bg-cc-bg text-cc-text-primary`, so this wrapper must
    // match or the dark UI shows through as a light-theme page.
    return (
      <div className="min-h-screen bg-cc-bg text-cc-text-primary">
        <LandingNav />
        <main className="pt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8 lg:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <PredictionsShell
      isAdmin={isAdmin}
      isAuthenticated={!!user}
      navCounts={navCounts}
      sponsorNav={sponsorNav}
    >
      {user ? <PendingVoteSubmitter /> : null}
      {children}
    </PredictionsShell>
  )
}
