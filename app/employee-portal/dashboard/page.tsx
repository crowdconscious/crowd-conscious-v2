import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { BookOpen, Award, Target, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import ActionCTA from '../components/ActionCTA'

export default async function EmployeeDashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, corporate_account_id')
    .eq('id', user.id)
    .single()

  // ✅ Get enrollments with module details (FIXED: use purchased_at instead of enrolled_at)
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      module:marketplace_modules(
        id,
        title,
        description,
        core_value,
        slug,
        lesson_count
      )
    `)
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false })

  // ✅ CRITICAL DEBUGGING
  console.log('🔍 DASHBOARD DEBUG:', {
    userId: user.id,
    userEmail: user.email,
    enrollmentCount: enrollments?.length || 0,
    hasError: !!enrollmentError,
    error: enrollmentError,
    rawEnrollments: JSON.stringify(enrollments, null, 2)
  })

  // ✅ If error, log it prominently
  if (enrollmentError) {
    console.error('❌ ENROLLMENT FETCH ERROR:', enrollmentError)
  }

  // ✅ If no enrollments, check why
  if (!enrollments || enrollments.length === 0) {
    console.warn('⚠️ NO ENROLLMENTS FOUND FOR USER:', user.id)
    console.warn('⚠️ Checking if user has purchased anything...')
  }

  const totalModules = enrollments?.length || 0
  const completedModules = enrollments?.filter(e => e.completed).length || 0
  const inProgressModules = enrollments?.filter(e => !e.completed && (e.progress_percentage || 0) > 0).length || 0
  const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
  const averageProgress = totalModules > 0
    ? Math.round(enrollments!.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / totalModules)
    : 0

  // ✅ Get certifications (FIXED: use user_id instead of employee_id)
  const { data: certifications } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', user.id)

  const moduleInfo: Record<string, { name: string; icon: string; description: string; color: string; available: boolean }> = {
    clean_air: {
      name: 'Aire Limpio para Todos',
      icon: '🌬️',
      description: 'Aprende a crear espacios con aire limpio y saludable',
      color: 'from-sky-500 to-blue-600',
      available: true // This module is fully built
    },
    clean_water: {
      name: 'Agua Limpia',
      icon: '💧',
      description: 'Conservación y filtración del agua',
      color: 'from-blue-500 to-cyan-600',
      available: false // Coming soon
    },
    safe_cities: {
      name: 'Ciudades Seguras',
      icon: '🏙️',
      description: 'Creando espacios públicos seguros',
      color: 'from-purple-500 to-pink-600',
      available: false
    },
    zero_waste: {
      name: 'Cero Residuos',
      icon: '♻️',
      description: 'Economía circular en acción',
      color: 'from-green-500 to-emerald-600',
      available: false
    },
    fair_trade: {
      name: 'Comercio Justo',
      icon: '🤝',
      description: 'Compras locales y justas',
      color: 'from-orange-500 to-red-600',
      available: false
    },
    integration: {
      name: 'Integración Comunitaria',
      icon: '🎉',
      description: 'Celebrando el impacto colectivo',
      color: 'from-pink-500 to-purple-600',
      available: false
    }
  }

  const stats = [
    {
      name: 'Módulos Totales',
      value: totalModules,
      icon: BookOpen,
      color: 'blue'
    },
    {
      name: 'Completados',
      value: completedModules,
      icon: CheckCircle,
      color: 'green'
    },
    {
      name: 'En Progreso',
      value: inProgressModules,
      icon: Clock,
      color: 'purple'
    },
    {
      name: 'Certificaciones',
      value: completedModules, // Use completed modules count (same as certifications)
      icon: Award,
      color: 'teal'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header - Mobile Friendly */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ¡Hola, {profile?.full_name?.split(' ')[0] || 'Estudiante'}! 👋
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Bienvenido al Portal de Aprendizaje - Aprende, crece y haz impacto
          </p>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            🌱 Abierto para todos: estudiantes individuales, equipos corporativos y organizaciones
          </p>
        </div>
        <Link
          href="/marketplace"
          className="border-2 border-emerald-500 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px] shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="whitespace-nowrap">Explorar Más Módulos</span>
        </Link>
      </div>

      {/* Action-Inviting CTA - Show when progress is low */}
      {averageProgress < 50 && totalModules > 0 && (
        <ActionCTA
          title="¡Continúa tu Aprendizaje! 🚀"
          description={`Estás al ${averageProgress}% de completar tus módulos. ¡Sigue adelante y gana más XP!`}
          action="Continuar Aprendiendo"
          href="/employee-portal/courses"
          variant="primary"
          icon="trending"
          pulse={true}
        />
      )}

      {/* Action CTA - Show when no modules */}
      {totalModules === 0 && (
        <ActionCTA
          title="¡Comienza tu Viaje de Aprendizaje! 📚"
          description="Explora nuestros módulos y comienza a ganar XP mientras aprendes sobre sostenibilidad."
          action="Explorar Módulos"
          href="/marketplace"
          variant="success"
          icon="sparkles"
          pulse={true}
        />
      )}

      {/* Overall Progress - Mobile Optimized */}
      <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-xl border-2 border-teal-200 p-4 sm:p-6 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-2xl animate-pulse" />
        </div>
        
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div>
            <div className="text-xs sm:text-sm font-medium text-slate-600">Progreso General</div>
            <div className="text-2xl sm:text-3xl font-bold text-teal-900">{averageProgress}%</div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 relative flex-shrink-0">
            {/* Desktop SVG - hidden on mobile */}
            <svg className="hidden sm:block w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
              <circle
                cx="40" cy="40" r="36"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${averageProgress * 2.26} 226`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
            {/* Mobile SVG - smaller */}
            <svg className="sm:hidden w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
              <circle
                cx="32" cy="32" r="28"
                stroke="url(#gradient-mobile)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${averageProgress * 1.76} 176`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient-mobile" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 sm:h-3">
          <div 
            className="bg-gradient-to-r from-teal-600 to-purple-600 h-2 sm:h-3 rounded-full transition-all duration-500"
            style={{ width: `${averageProgress}%` }}
          />
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          {completedModules} de {totalModules} módulos completados
        </p>
      </div>

      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            purple: 'from-purple-500 to-purple-600',
            teal: 'from-teal-500 to-teal-600'
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
              </div>
              <div className="text-xs sm:text-sm text-slate-600">{stat.name}</div>
            </div>
          )
        })}
      </div>

      {/* My Courses - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">Mis Módulos</h3>
          {enrollments && enrollments.length > 0 && (
            <Link
              href="/employee-portal/courses"
              className="text-xs sm:text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              Ver todos <TrendingUp className="w-4 h-4" />
            </Link>
          )}
        </div>
        
        {enrollments && enrollments.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {enrollments.map((enrollment: any) => {
              // Get module info from the joined data or fallback to moduleInfo
              const moduleData = enrollment.module
              const coreValue = moduleData?.core_value || 'unknown'
              const info = moduleInfo[coreValue] || {
                name: moduleData?.title || 'Módulo de capacitación',
                icon: '📚',
                description: moduleData?.description || 'Módulo de capacitación',
                color: 'from-blue-500 to-cyan-600',
                available: true // All modules with lessons are available
              }
              
              const isAvailable = moduleData?.id && moduleData?.lesson_count > 0
              const moduleUrl = isAvailable ? `/employee-portal/modules/${moduleData.id}` : '#'
              const progress = enrollment.progress_percentage || 0
              const isInProgress = progress > 0 && !enrollment.completed
              
              return (
                <Link 
                  key={enrollment.id}
                  href={moduleUrl}
                  className={`block border-2 rounded-lg p-3 sm:p-4 transition-all relative overflow-hidden group ${
                    isAvailable 
                      ? `cursor-pointer hover:shadow-lg ${
                          isInProgress 
                            ? 'border-purple-300 bg-purple-50/50 hover:border-purple-400' 
                            : enrollment.completed
                            ? 'border-green-300 bg-green-50/50 hover:border-green-400'
                            : 'border-slate-200 hover:border-teal-300'
                        }` 
                      : 'cursor-not-allowed opacity-75 border-slate-200'
                  }`}
                >
                  {/* Animated progress indicator */}
                  {isInProgress && (
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-teal-500 animate-pulse" style={{ width: `${progress}%` }} />
                  )}
                  {/* Mobile: Stack vertically, Desktop: Side by side */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="text-3xl sm:text-4xl flex-shrink-0">{info.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{info.name}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 sm:line-clamp-none">{info.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            enrollment.completed ? 'bg-green-100 text-green-700' : 
                            (enrollment.progress_percentage || 0) > 0 ? 'bg-purple-100 text-purple-700' : 
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {enrollment.completed ? '✓ Completado' :
                             (enrollment.progress_percentage || 0) > 0 ? 'En Progreso' :
                             'No Iniciado'}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-500">
                            {enrollment.progress_percentage || 0}% completado
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile: Full width button, Desktop: Inline */}
                    <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                      <div className="text-center sm:hidden">
                        <div className="text-xl font-bold text-slate-900">
                          {enrollment.progress_percentage || 0}%
                        </div>
                        <div className="text-xs text-slate-500">Progreso</div>
                      </div>
                      <div className="hidden sm:block text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {enrollment.progress_percentage || 0}%
                        </div>
                        <div className="text-xs text-slate-500">Progreso</div>
                      </div>
                      <div
                        className={`${isAvailable ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white' : 'bg-slate-300 text-slate-500'} px-4 sm:px-6 py-2 rounded-lg font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] flex items-center justify-center pointer-events-none`}
                      >
                        {isAvailable ? (
                          enrollment.completed ? 'Revisar' :
                          (enrollment.progress_percentage || 0) > 0 ? 'Continuar' :
                          'Empezar'
                        ) : 'Pronto'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3 sm:mt-4 w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-teal-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${enrollment.progress_percentage || 0}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-sm sm:text-base text-slate-600 font-medium mb-2">
              No tienes módulos inscritos aún
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mb-4">
              Explora nuestro catálogo y comienza tu aprendizaje
            </p>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Explorar Módulos
            </Link>
            {enrollmentError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm font-medium text-red-800">Error al cargar módulos:</p>
                <pre className="text-xs text-red-600 mt-2 overflow-auto">{JSON.stringify(enrollmentError, null, 2)}</pre>
                <p className="text-xs text-slate-600 mt-2">
                  👉 Visita <a href="/api/debug/enrollments" className="underline text-teal-600">/api/debug/enrollments</a> para más información
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Certifications - Mobile Optimized */}
      {certifications && certifications.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border-2 border-green-200 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-green-900">
                ¡Felicidades! Has obtenido {certifications.length} certificación{certifications.length > 1 ? 'es' : ''}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Ahora puedes acceder a la comunidad principal y patrocinar necesidades locales.
              </p>
              <Link
                href="/employee-portal/certifications"
                className="inline-block mt-2 sm:mt-3 text-xs sm:text-sm font-medium text-green-700 hover:text-green-900 min-h-[44px] flex items-center"
              >
                Ver mis certificaciones →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

