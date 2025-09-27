import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import HeaderClient from './HeaderClient'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { ErrorTracker } from '@/lib/monitoring'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Set user context for error tracking
  if (typeof window !== 'undefined') {
    ErrorTracker.setUserContext(user.id, user.user_metadata?.user_type || 'user')
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors" style={{backgroundColor: '#ffffff', color: '#090909'}}>
      {/* Analytics and error tracking */}
      <AnalyticsTracker />
      
      {/* Enhanced header with notifications and search */}
      <HeaderClient user={user} />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  )
}
