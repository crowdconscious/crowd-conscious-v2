import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import HeaderClient from './HeaderClient'
import Footer from '@/components/Footer'
import StreakTracker from './StreakTracker'
import { TierThemeProvider } from '@/components/gamification/TierThemeProvider'
import { createAdminClient } from '@/lib/supabase-admin'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔍 AppLayout: Checking user authentication...')
  const user = await getCurrentUser()

  if (!user) {
    console.log('❌ AppLayout: No user found, redirecting to login')
    redirect('/login')
  }

  console.log('✅ AppLayout: User authenticated:', user.id)

  // Does this user own or have email access to any sponsor_accounts?
  // Only used to conditionally render the "Mis cuentas" sidebar entry —
  // users with zero sponsor rows continue to see an unchanged UI.
  //
  // Implementation note: we run TWO separate queries instead of a single
  // PostgREST `.or()` filter-string because `.or()` uses a mini-language
  // where `.` is a reserved delimiter. Email TLDs (`.mx`, `.com`, …)
  // therefore silently mis-parse — a user who redeemed a coupon with
  // `admin@jager.mx` would see zero rows even though the data is right
  // there. supabase-js's typed `.eq()` / `.ilike()` methods URL-encode
  // values correctly, so splitting into two indexed queries is both
  // correct and cheap.
  //
  // Uses the admin client: service-role bypasses RLS for a count-only
  // check, matching the pattern used elsewhere in the authed shell.
  let hasSponsorAccounts = false
  try {
    const admin = createAdminClient()
    const userEmail = (user.email ?? '').toLowerCase().trim()
    const [byId, byEmail] = await Promise.all([
      admin
        .from('sponsor_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      userEmail
        ? admin
            .from('sponsor_accounts')
            .select('id', { count: 'exact', head: true })
            .ilike('contact_email', userEmail)
        : Promise.resolve({ count: 0 as number | null, error: null }),
    ])
    const total = (byId.count ?? 0) + (byEmail.count ?? 0)
    hasSponsorAccounts = total > 0
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AppLayout] sponsor_accounts lookup:', {
        userId: user.id,
        userEmail,
        byIdCount: byId.count,
        byEmailCount: byEmail.count,
        hasSponsorAccounts,
      })
    }
  } catch (err) {
    console.warn('[AppLayout] sponsor_accounts count failed:', err)
  }

  return (
    <TierThemeProvider>
      <div className="min-h-screen bg-cc-bg text-cc-text-primary transition-colors overflow-x-hidden">
        {/* Track daily streaks and award XP */}
        <StreakTracker />
        
        {/* Enhanced header with notifications and search */}
        <HeaderClient user={user} hasSponsorAccounts={hasSponsorAccounts} />

        {/* Main content */}
        <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-8 pb-20 md:pb-8 overflow-x-hidden box-border">
          {children}
        </main>

        {/* Mobile Navigation */}
        <MobileNavigation />

        {/* Footer */}
        <Footer />
      </div>
    </TierThemeProvider>
  )
}
