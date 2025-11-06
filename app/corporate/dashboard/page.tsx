import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, BookOpen, Award, TrendingUp, Plus, AlertCircle } from 'lucide-react'

export default async function CorporateDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get profile and corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('corporate_account_id, full_name')
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

  // Get admin's enrolled modules - use same query as stats
  const { data: rawEnrollments } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('corporate_account_id', profile?.corporate_account_id)
    .eq('user_id', user.id)
    .not('module_id', 'is', null)

  // Get module details separately
  let adminEnrollments: any[] = []
  if (rawEnrollments && rawEnrollments.length > 0) {
    const moduleIds = rawEnrollments.map(e => e.module_id)
    const { data: modules } = await supabase
      .from('marketplace_modules')
      .select('id, title, slug, thumbnail_url, difficulty_level, estimated_duration_hours')
      .in('id', moduleIds)

    // Combine enrollments with module data
    adminEnrollments = rawEnrollments.map(enrollment => ({
      ...enrollment,
      marketplace_modules: modules?.find(m => m.id === enrollment.module_id) || null
    })).filter(e => e.marketplace_modules !== null)
  }

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
      {/* Page Header - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Bienvenido de vuelta, {profile?.full_name || 'Admin'}
          </p>
        </div>
        
        <Link
          href="/corporate/employees"
          className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-4 sm:px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="whitespace-nowrap">Invitar Empleados</span>
        </Link>
      </div>

      {/* Admin's Enrolled Courses - ALWAYS show if admin has enrollments */}
      {adminEnrollments && adminEnrollments.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Mis Cursos</h3>
              <p className="text-sm text-slate-600 mt-1">
                Tienes {adminEnrollments.length} módulo{adminEnrollments.length !== 1 ? 's' : ''} disponible{adminEnrollments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminEnrollments.map((enrollment: any) => {
              const module = enrollment.marketplace_modules
              const progress = enrollment.completion_percentage || 0
              const isCompleted = enrollment.status === 'completed'
              
              // Skip if module data is missing
              if (!module) return null
              
              return (
                <Link
                  key={enrollment.id}
                  href={`/marketplace/${module.slug || module.id}`}
                  className="group border-2 border-slate-200 rounded-xl p-4 hover:border-purple-500 hover:shadow-lg transition-all bg-white"
                >
                  {/* Thumbnail */}
                  {module.thumbnail_url ? (
                    <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-3 overflow-hidden">
                      <img 
                        src={module.thumbnail_url} 
                        alt={module.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-3 flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-purple-400" />
                    </div>
                  )}

                  {/* Title & Status */}
                  <h4 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {module.title}
                  </h4>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Progreso</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          isCompleted ? 'bg-green-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isCompleted 
                        ? 'bg-green-100 text-green-700' 
                        : progress > 0 
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isCompleted ? '✓ Completado' : progress > 0 ? 'En progreso' : 'Sin iniciar'}
                    </span>
                    <span className="text-xs text-purple-600 font-medium group-hover:text-purple-700">
                      {isCompleted ? 'Revisar' : progress > 0 ? 'Continuar' : 'Comenzar'} →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

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

          {/* Stats Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              const colorClasses = {
                teal: 'from-teal-500 to-teal-600',
                purple: 'from-purple-500 to-purple-600',
                blue: 'from-blue-500 to-blue-600',
                green: 'from-green-500 to-green-600'
              }
              
              return (
                <div key={stat.name} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                    {stat.value}
                    {stat.max && (
                      <span className="text-base sm:text-lg text-slate-500 font-normal">
                        /{stat.max}
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">{stat.name}</div>
                  {stat.subtext && (
                    <div className="text-xs text-slate-500 mt-1">{stat.subtext}</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Actions - Mobile Optimized */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Link
                href="/corporate/employees"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-teal-600 hover:bg-teal-50 transition-colors group min-h-[100px] flex flex-col"
              >
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 group-hover:text-teal-600 mb-2" />
                <div className="font-medium text-slate-900 text-sm sm:text-base">Gestionar Empleados</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Invitar o ver empleados</div>
              </Link>
              
              <Link
                href="/corporate/progress"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-colors group min-h-[100px] flex flex-col"
              >
                <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 group-hover:text-purple-600 mb-2" />
                <div className="font-medium text-slate-900 text-sm sm:text-base">Ver Progreso</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Revisar avance detallado</div>
              </Link>
              
              <Link
                href="/corporate/impact"
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors group min-h-[100px] flex flex-col"
              >
                <Award className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 group-hover:text-green-600 mb-2" />
                <div className="font-medium text-slate-900 text-sm sm:text-base">Métricas de Impacto</div>
                <div className="text-xs sm:text-sm text-slate-500 mt-1">Ver impacto y ahorros</div>
              </Link>

              {/* Link to take courses as learner */}
              <Link
                href={(adminEnrollments && adminEnrollments.length > 0 && adminEnrollments[0].marketplace_modules) 
                  ? `/marketplace/${adminEnrollments[0].marketplace_modules.slug || adminEnrollments[0].marketplace_modules.id}` 
                  : "/marketplace"}
                className="p-4 border-2 border-purple-300 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-500 hover:shadow-lg transition-all group min-h-[100px] flex flex-col"
              >
                <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500 group-hover:text-purple-600 mb-2" />
                <div className="font-medium text-slate-900 text-sm sm:text-base flex items-center gap-1">
                  {(adminEnrollments && adminEnrollments.length > 0) ? 'Tomar el Curso' : 'Explorar Marketplace'}
                  <span className="text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded-full">TÚ</span>
                </div>
                <div className="text-xs sm:text-sm text-purple-700 mt-1">
                  {(adminEnrollments && adminEnrollments.length > 0 && adminEnrollments[0].marketplace_modules) 
                    ? `Inscríbete en ${adminEnrollments[0].marketplace_modules.title}`
                    : 'Agregar más módulos'}
                </div>
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

          {/* Explore Modules Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Explorar Más Módulos
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">PREVIEW</span>
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Amplía tu programa con módulos adicionales del marketplace
                </p>
              </div>
              <Link
                href="/marketplace"
                className="text-teal-600 hover:text-teal-700 font-medium text-sm"
              >
                Ver Todos →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { 
                  icon: '🌱', 
                  name: 'Biodiversidad Urbana', 
                  desc: 'Jardines y espacios verdes',
                  price: '$18,000 MXN',
                  badge: 'Nuevo'
                },
                { 
                  icon: '📊', 
                  name: 'Reportes ESG', 
                  desc: 'Métricas y cumplimiento',
                  price: '$18,000 MXN',
                  badge: 'Popular'
                },
                { 
                  icon: '💡', 
                  name: 'Innovación Verde', 
                  desc: 'Ideas de empleados',
                  price: '$18,000 MXN',
                  badge: 'Recomendado'
                },
              ].map((module, i) => (
                <Link
                  key={i}
                  href="/marketplace"
                  className="border-2 border-slate-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer group block"
                >
                  <div className="text-4xl mb-3">{module.icon}</div>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-purple-700">
                      {module.name}
                    </h4>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {module.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{module.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{module.price}</span>
                    <span className="text-xs text-teal-600 font-medium group-hover:text-teal-700">
                      Ver detalles →
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-900">
                <strong>💡 Próximamente:</strong> Marketplace completo donde podrás explorar módulos creados por comunidades 
                reales con filtros por industria, precio y calificaciones. ¡Mantente atento!
              </p>
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

