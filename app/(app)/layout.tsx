import { getCurrentUser } from '../../lib/auth-server'
import { redirect } from 'next/navigation'
import MobileNavigation from '../../components/MobileNavigation'

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
    <div className="min-h-screen bg-slate-50">
      {/* Enhanced header with notifications and search */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-slate-900">Crowd Conscious</h1>
              <button className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors">
                <span>🔍</span>
                <span>Search...</span>
                <kbd className="px-1.5 py-0.5 bg-white text-xs rounded">⌘K</kbd>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="hidden md:block text-sm text-slate-600">
                Welcome, {user.full_name || user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button 
                  type="submit"
                  className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  )
}
