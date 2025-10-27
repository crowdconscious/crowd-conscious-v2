import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, BookOpen, Award, TrendingUp, Plus, AlertCircle } from 'lucide-react'

export default async function CorporateDashboard() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get profile and corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('corporate_account_id')
    .eq('id', user.id)
    .single()

  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile?.corporate_account_id)
    .single()

  // Get employee count
  const { count: employeeCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('corporate_account_id', profile?.corporate_account_id)
    .eq('is_corporate_user', true)

  // Get enrollment stats
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('status, completion_percentage')
    .eq('corporate_account_id', profile?.corporate_account_id)

  const totalEnrollments = enrollments?.length || 0
  const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0
  const averageProgress = enrollments?.length 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length)
    : 0

  // Get certifications
  const { count: certificationCount } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true })
    .eq('corporate_account_id', profile?.corporate_account_id)

  const stats = [
    {
      name: 'Empleados Inscritos',
      value: employeeCount || 0,
      max: corporateAccount?.employee_limit || 100,
      icon: Users,
      color: 'teal'
    },
    {
      name: 'Progreso Promedio',
      value: `${averageProgress}%`,
      subtext: `${totalEnrollments} cursos activos`,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      name: 'Cursos Completados',
      value: completedEnrollments,
      subtext: `de ${totalEnrollments} totales`,
      icon: BookOpen,
      color: 'blue'
    },
    {
      name: 'Certificados',
      value: certificationCount || 0,
      subtext: 'empleados certificados',
      icon: Award,
      color: 'green'
    }
  ]

  const hasEmployees = (employeeCount || 0) > 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Bienvenido de vuelta, {profile?.full_name || 'Admin'}
          </p>
        </div>
        
        <Link
          href="/corporate/employees"
          className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Invitar Empleados
        </Link>
      </div>

      {/* Empty State or Stats */}
      {!hasEmployees ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              ¡Comencemos!
            </h2>
            <p className="text-slate-600 mb-6">
              Tu cuenta está configurada. El siguiente paso es invitar a tus empleados para comenzar su capacitación.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/corporate/employees"
                className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Invitar Empleados
              </Link>
              <Link
                href="/concientizaciones"
                className="border-2 border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:border-teal-600 hover:text-teal-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                Ver Información del Programa
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              const colorClasses = {
                teal: 'from-teal-500 to-teal-600',
                purple: 'from-purple-500 to-purple-600',
                blue: 'from-blue-500 to-blue-600',
                green: 'from-green-500 to-green-600'
              }
              
              return (
                <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {stat.value}
                    {stat.max && (
                      <span className="text-lg text-slate-500 font-normal">
                        /{stat.max}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">{stat.name}</div>
                  {stat.subtext && (
                    <div className="text-xs text-slate-500 mt-1">{stat.subtext}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                href="/corporate/employees"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition-colors group"
              >
                <Users className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2" />
                <div className="font-medium text-slate-900">Gestionar Empleados</div>
                <div className="text-sm text-slate-500">Invitar o ver empleados</div>
              </Link>
              
              <Link
                href="/corporate/progress"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-colors group"
              >
                <TrendingUp className="w-8 h-8 text-slate-400 group-hover:text-purple-600 mb-2" />
                <div className="font-medium text-slate-900">Ver Progreso</div>
                <div className="text-sm text-slate-500">Revisar avance detallado</div>
              </Link>
              
              <Link
                href="/corporate/impact"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors group"
              >
                <Award className="w-8 h-8 text-slate-400 group-hover:text-green-600 mb-2" />
                <div className="font-medium text-slate-900">Métricas de Impacto</div>
                <div className="text-sm text-slate-500">Ver impacto y ahorros</div>
              </Link>
            </div>
          </div>

          {/* Program Info */}
          <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-xl p-6 border border-teal-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-teal-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  Programa: {corporateAccount?.program_tier?.toUpperCase()}
                </h4>
                <p className="text-slate-600 text-sm">
                  Tienes capacidad para {corporateAccount?.employee_limit} empleados. 
                  {corporateAccount?.modules_included && (
                    <> Módulos incluidos: {corporateAccount.modules_included.join(', ')}.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Status Footer */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">
            Estado del programa: <span className="font-medium text-slate-900 capitalize">
              {corporateAccount?.status || 'active'}
            </span>
          </div>
          {corporateAccount?.program_start_date && (
            <div className="text-slate-500">
              Inicio: <span className="font-medium text-slate-900">
                {new Date(corporateAccount.program_start_date).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
          {corporateAccount?.program_end_date && (
            <div className="text-slate-500">
              Finaliza: <span className="font-medium text-slate-900">
                {new Date(corporateAccount.program_end_date).toLocaleDateString('es-MX')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

