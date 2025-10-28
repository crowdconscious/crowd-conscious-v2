import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Award, TrendingUp, Home, LogOut } from 'lucide-react'

export default async function EmployeeLayout({
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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, corporate_account_id, corporate_role, is_corporate_user')
    .eq('id', user.id)
    .single()

  // Check if employee
  if (!profile?.is_corporate_user || profile?.corporate_role !== 'employee') {
    redirect('/dashboard')
  }

  // Get corporate account
  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('company_name, program_tier')
    .eq('id', profile.corporate_account_id)
    .single()

  // Check if graduated (has certification)
  const { data: certifications } = await supabase
    .from('certifications')
    .select('id')
    .eq('employee_id', user.id)
    .limit(1)

  const isGraduated = certifications && certifications.length > 0

  const navigation = [
    { name: 'Mi Progreso', href: '/employee-portal/dashboard', icon: Home },
    { name: 'Cursos', href: '/employee-portal/courses', icon: BookOpen },
    { name: 'Certificaciones', href: '/employee-portal/certifications', icon: Award },
    { name: 'Mi Impacto', href: '/employee-portal/impact', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/employee-portal/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CC</span>
              </div>
              <div>
                <div className="font-bold text-slate-900">
                  {corporateAccount?.company_name || 'Concientizaciones'}
                </div>
                <div className="text-xs text-slate-500">Portal de Empleado</div>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              {isGraduated && (
                <Link
                  href="/dashboard"
                  className="text-sm bg-gradient-to-r from-teal-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:scale-105 transition-transform"
                >
                  🎓 Ir a Comunidad
                </Link>
              )}
              <div className="text-sm text-slate-600">
                {profile?.full_name || profile?.email}
              </div>
              <Link
                href="/api/auth/signout"
                className="text-sm text-slate-600 hover:text-red-600 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                Salir
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
            <div className="mt-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="text-xs text-slate-500 uppercase mb-2">Programa</div>
              <div className="font-bold text-slate-900 capitalize">
                {corporateAccount?.program_tier || 'Activo'}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {corporateAccount?.company_name}
              </div>
            </div>

            {/* Graduation Badge */}
            {isGraduated && (
              <div className="mt-4 bg-gradient-to-br from-teal-50 to-purple-50 rounded-xl border-2 border-teal-200 p-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎓</div>
                  <div className="font-bold text-teal-900 text-sm">
                    Certificado
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Ahora puedes acceder a la comunidad
                  </div>
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

