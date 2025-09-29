import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { redirect } from 'next/navigation'

async function checkAdminAccess(userId: string) {
  try {
    console.log('🔍 Checking admin access for user:', userId)
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Error fetching profile for admin check:', error)
      return false
    }

    console.log('👤 User profile:', profile)
    const isAdmin = (profile as any)?.user_type === 'admin'
    console.log('🛡️ Is admin:', isAdmin)
    
    return isAdmin
  } catch (error) {
    console.error('💥 Admin check failed:', error)
    return false
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const hasAdminAccess = await checkAdminAccess((user as any).id)

  if (!hasAdminAccess) {
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
