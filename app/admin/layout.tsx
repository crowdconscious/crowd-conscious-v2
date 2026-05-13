import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { isAdminUser } from '@/lib/auth/is-admin'

// Mirrors LandingNav: build-time flag, read at module scope so the link
// silently disappears when Signals is disabled in production.
const SIGNALS_ENABLED = process.env.NEXT_PUBLIC_SIGNALS_ENABLED === 'true'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!isAdminUser(user)) {
    redirect('/dashboard?error=unauthorized')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-red-100 text-sm">Community & Sponsorship Moderation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-red-100 text-sm">Logged in as Admin</span>
            <a
              href="/predictions/intelligence"
              className="bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 px-3 py-1 rounded text-sm transition-colors font-medium"
            >
              📈 Intelligence Hub
            </a>
            <a 
              href="/admin/markets" 
              className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-sm transition-colors font-medium"
            >
              📊 Markets
            </a>
            <a
              href="/predictions/admin/locations"
              className="bg-teal-600 hover:bg-teal-500 px-3 py-1 rounded text-sm transition-colors font-medium"
            >
              📍 Locations
            </a>
            {SIGNALS_ENABLED && (
              <a
                href="/admin/signals"
                className="bg-emerald-700 hover:bg-emerald-600 px-3 py-1 rounded text-sm transition-colors font-medium inline-flex items-center gap-1.5"
              >
                <span>📢 Signals</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 ring-1 ring-inset ring-emerald-300/40">
                  Beta
                </span>
              </a>
            )}
            <a 
              href="/admin/promo-codes" 
              className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded text-sm transition-colors font-medium"
            >
              🎁 Promo Codes
            </a>
            <a
              href="/admin/sponsors"
              className="bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded text-sm transition-colors font-medium"
            >
              🤝 Sponsors
            </a>
            <a 
              href="/admin/deletions" 
              className="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors"
            >
              🗑️ Deletions
            </a>
            <a 
              href="/admin/test-systems" 
              className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded text-sm transition-colors"
            >
              🧪 Test Systems
            </a>
            <a 
              href="/dashboard" 
              className="bg-red-500 hover:bg-red-400 px-3 py-1 rounded text-sm transition-colors"
            >
              Back to App
            </a>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
