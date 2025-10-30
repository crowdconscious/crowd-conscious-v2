import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, TrendingUp, Award, Settings, FileText } from 'lucide-react'

export default async function CorporateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user profile and corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, corporate_account_id, corporate_role, is_corporate_user')
    .eq('id', user.id)
    .single()

  // Check if corporate admin
  if (!profile?.is_corporate_user || profile?.corporate_role !== 'admin') {
    redirect('/dashboard')
  }

  // Get corporate account
  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile.corporate_account_id)
    .single()

  const navigation = [
    { name: 'Dashboard', href: '/corporate/dashboard', icon: TrendingUp },
    { name: 'Empleados', href: '/corporate/employees', icon: Users },
    { name: 'Progreso', href: '/corporate/progress', icon: FileText },
    { name: 'Impacto', href: '/corporate/impact', icon: Award },
    { name: 'Configuración', href: '/corporate/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CC</span>
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  {corporateAccount?.company_name || 'Concientizaciones'}
                </div>
                <div className="text-xs text-slate-500">Panel de Administración</div>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm bg-gradient-to-r from-teal-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:scale-105 transition-transform font-medium"
              >
                🌍 Ir a Comunidad
              </Link>
              <div className="text-sm text-slate-600">
                {profile?.full_name || profile?.email}
              </div>
              <Link
                href="/api/auth/signout"
                className="text-sm text-slate-600 hover:text-teal-600"
              >
                Cerrar Sesión
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* Account Info */}
            {corporateAccount && (
              <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="text-xs text-slate-500 uppercase mb-2">Programa</div>
                <div className="font-bold text-slate-900 capitalize">
                  {corporateAccount.program_tier}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  {corporateAccount.employee_limit} empleados
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

