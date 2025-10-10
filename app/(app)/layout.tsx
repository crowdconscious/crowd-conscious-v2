import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import HeaderClient from './HeaderClient'
import Footer from '@/components/Footer'
import StreakTracker from './StreakTracker'

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
    <div className="min-h-screen bg-white text-slate-900 transition-colors" style={{backgroundColor: '#ffffff', color: '#090909'}}>
      {/* Track daily streaks and award XP */}
      <StreakTracker />
      
      {/* Enhanced header with notifications and search */}
      <HeaderClient user={user} />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Footer */}
      <Footer />
    </div>
  )
}
