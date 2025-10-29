import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { BookOpen, Award, Target, TrendingUp, Clock, CheckCircle } from 'lucide-react'

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

  // Get enrollments
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  const totalModules = enrollments?.length || 0
  const completedModules = enrollments?.filter(e => e.status === 'completed').length || 0
  const inProgressModules = enrollments?.filter(e => e.status === 'in_progress').length || 0
  const averageProgress = totalModules > 0
    ? Math.round(enrollments!.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / totalModules)
    : 0

  // Get certifications
  const { data: certifications } = await supabase
    .from('certifications')
    .select('*')
    .eq('employee_id', user.id)

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
      value: certifications?.length || 0,
      icon: Award,
      color: 'teal'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          ¡Hola, {profile?.full_name?.split(' ')[0] || 'Empleado'}! 👋
        </h1>
        <p className="text-slate-600 mt-1">
          Continúa tu camino hacia la certificación
        </p>
      </div>

      {/* Overall Progress */}
      <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-xl border-2 border-teal-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-slate-600">Progreso General</div>
            <div className="text-3xl font-bold text-teal-900">{averageProgress}%</div>
          </div>
          <div className="w-20 h-20 relative">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
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
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-teal-600 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${averageProgress}%` }}
          />
        </div>
        <p className="text-sm text-slate-600 mt-2">
          {completedModules} de {totalModules} módulos completados
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'from-blue-500 to-blue-600',
            green: 'from-green-500 to-green-600',
            purple: 'from-purple-500 to-purple-600',
            teal: 'from-teal-500 to-teal-600'
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
              </div>
              <div className="text-sm text-slate-600">{stat.name}</div>
            </div>
          )
        })}
      </div>

      {/* My Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Mis Módulos</h3>
        
        {enrollments && enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const info = moduleInfo[enrollment.module_id] || {
                name: enrollment.module_id,
                icon: '📚',
                description: 'Módulo de capacitación'
              }
              
              return (
                <div 
                  key={enrollment.id}
                  className="border-2 border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{info.icon}</div>
                      <div>
                        <h4 className="font-bold text-slate-900">{info.name}</h4>
                        <p className="text-sm text-slate-600">{info.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="px-2 py-1 rounded-full text-xs font-medium capitalize
                            {enrollment.status === 'completed' ? 'bg-green-100 text-green-700' : 
                             enrollment.status === 'in_progress' ? 'bg-purple-100 text-purple-700' : 
                             'bg-slate-100 text-slate-700'}
                          ">
                            {enrollment.status === 'completed' ? '✓ Completado' :
                             enrollment.status === 'in_progress' ? 'En Progreso' :
                             'No Iniciado'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {enrollment.completion_percentage}% completado
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {enrollment.completion_percentage}%
                        </div>
                        <div className="text-xs text-slate-500">Progreso</div>
                      </div>
                      <Link
                        href={info.available ? `/employee-portal/modules/${enrollment.module_id}` : '#'}
                        className={`${info.available ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white hover:scale-105' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} px-6 py-2 rounded-lg font-medium transition-transform`}
                      >
                        {info.available ? (
                          enrollment.status === 'completed' ? 'Revisar' :
                          enrollment.status === 'in_progress' ? 'Continuar' :
                          'Comenzar'
                        ) : 'Próximamente'}
                      </Link>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-teal-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${enrollment.completion_percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-600">
            <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p>No tienes módulos asignados aún.</p>
            <p className="text-sm">Contacta a tu administrador.</p>
          </div>
        )}
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-900">
                ¡Felicidades! Has obtenido {certifications.length} certificación{certifications.length > 1 ? 'es' : ''}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Ahora puedes acceder a la comunidad principal y patrocinar necesidades locales.
              </p>
              <Link
                href="/employee-portal/certifications"
                className="inline-block mt-3 text-sm font-medium text-green-700 hover:text-green-900"
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

