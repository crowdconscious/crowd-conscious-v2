import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '@/components/MobileNavigation'
import HeaderClient from './HeaderClient'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
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
