import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import HeaderClient from './HeaderClient'
import Footer from '@/components/Footer'
import StreakTracker from './StreakTracker'
import { TierThemeProvider } from '@/components/gamification/TierThemeProvider'

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

  return (
    <TierThemeProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 transition-colors overflow-x-hidden">
        {/* Track daily streaks and award XP */}
        <StreakTracker />
        
        {/* Enhanced header with notifications and search */}
        <HeaderClient user={user} />

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
