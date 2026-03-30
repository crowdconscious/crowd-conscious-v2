import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import PredictionsShell from './PredictionsShell'
import { PendingVoteSubmitter } from './components/PendingVoteSubmitter'

/** Public: no login required (market detail pages allow guest voting) */
const PUBLIC_PATHS = ['/predictions/leaderboard', '/predictions/fund', '/predictions/markets']

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
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const user = await getCurrentUser()

  if (!isPublicPath && !user) {
    redirect('/login')
  }

  let isAdmin = false
  let navCounts = { inboxPending: 0, activeMarkets: 0, liveNowCount: 0 }
  if (user) {
    const supabase = await createClient()
    const [profileRes, counts] = await Promise.all([
      supabase.from('profiles').select('user_type, email').eq('id', user.id).single(),
      getNavCounts(supabase),
    ])
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const profileEmail = profileRes.data?.email?.toLowerCase().trim()
    isAdmin =
      profileRes.data?.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail)
    navCounts = counts
  }

  return (
    <PredictionsShell isAdmin={isAdmin} isAuthenticated={!!user} navCounts={navCounts}>
      {user ? <PendingVoteSubmitter /> : null}
      {children}
    </PredictionsShell>
  )
}
