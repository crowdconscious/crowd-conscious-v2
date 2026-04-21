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
  // Uses the admin client intentionally: the RLS policy from migration 209
  // is also present, but a count-only query via service role is one round
  // trip regardless of session context and matches the existing pattern
  // used elsewhere in the authed shell.
  let hasSponsorAccounts = false
  try {
    const admin = createAdminClient()
    const userEmail = (user.email ?? '').toLowerCase()
    const orClause = userEmail
      ? `user_id.eq.${user.id},contact_email.ilike.${userEmail}`
      : `user_id.eq.${user.id}`
    const { count } = await admin
      .from('sponsor_accounts')
      .select('id', { count: 'exact', head: true })
      .or(orClause)
    hasSponsorAccounts = (count ?? 0) > 0
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
