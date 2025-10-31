import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Users, BookOpen, Clock, TrendingUp, Eye, CheckCircle, XCircle } from 'lucide-react'

export default async function ProgressPage() {
  const supabase = await createClient()
  
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

  // Get all employees with their enrollments and progress
  const { data: enrollmentsData } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      employee:profiles!course_enrollments_employee_id_fkey(id, full_name, email),
      course:courses(id, title, core_value)
    `)
    .eq('corporate_account_id', profile?.corporate_account_id)
    .order('last_accessed_at', { ascending: false })

  const enrollments = (enrollmentsData as any) || []

  // Get lesson responses for detailed view
  const { data: responsesData } = await supabase
    .from('lesson_responses')
    .select('*')
    .eq('corporate_account_id', profile?.corporate_account_id)
    .order('completed_at', { ascending: false })

  const responses = (responsesData as any) || []

  // Calculate summary stats
  const totalEmployees = new Set(enrollments.map((e: any) => e.employee_id)).size
  const totalEnrollments = enrollments.length
  const completedEnrollments = enrollments.filter((e: any) => e.status === 'completed').length
  const avgCompletion = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.completion_percentage || 0), 0) / enrollments.length)
    : 0
  const totalTimeSpent = responses.reduce((sum: number, r: any) => sum + (r.time_spent_minutes || 0), 0)

  return (
    <div className="space-y-6">
      {/* Page Header - Mobile Friendly */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Progreso Detallado</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">Monitorea el avance de tus empleados en tiempo real</p>
      </div>

      {/* Summary Stats - Mobile Optimized */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalEmployees}</div>
          <div className="text-xs sm:text-sm text-slate-600">Empleados Activos</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalEnrollments}</div>
          <div className="text-xs sm:text-sm text-slate-600">Cursos Asignados</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{completedEnrollments}</div>
          <div className="text-xs sm:text-sm text-slate-600">Cursos Completados</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{avgCompletion}%</div>
          <div className="text-xs sm:text-sm text-slate-600">Progreso Promedio</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 col-span-2 sm:col-span-1">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 mb-2" />
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">{Math.round(totalTimeSpent / 60)}h</div>
          <div className="text-xs sm:text-sm text-slate-600">Tiempo Total</div>
        </div>
      </div>

      {/* Employee Progress Table - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Progreso por Empleado</h2>
          <p className="text-xs text-slate-500 mt-1 sm:hidden">← Desliza para ver más →</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-600">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base">No hay empleados inscritos todavía</p>
            <Link href="/corporate/employees" className="text-teal-600 hover:text-teal-700 mt-2 inline-block text-sm sm:text-base">
              Invitar empleados →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-px">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Empleado</th>
                  <th className="text-left p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Curso</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Progreso</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Estado</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Lecciones</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">XP</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Última Actividad</th>
                  <th className="text-center p-3 sm:p-4 font-medium text-slate-700 text-xs sm:text-sm whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {enrollments.map((enrollment: any) => {
                  const employeeResponses = responses.filter((r: any) => r.employee_id === enrollment.employee_id)
                  const timeSpent = employeeResponses.reduce((sum: number, r: any) => sum + (r.time_spent_minutes || 0), 0)

                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">
                          {enrollment.employee?.full_name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {enrollment.employee?.email}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">
                          {enrollment.course?.title || 'Sin título'}
                        </div>
                        <div className="text-sm text-slate-500 capitalize">
                          {enrollment.course?.core_value || ''}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${enrollment.completion_percentage || 0}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 text-sm">
                            {enrollment.completion_percentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {enrollment.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Completado
                          </span>
                        ) : enrollment.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            En Progreso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                            <XCircle className="w-4 h-4" />
                            No Iniciado
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center font-medium text-slate-900">
                        {enrollment.modules_completed || 0} / 3
                      </td>
                      <td className="p-4 text-center font-medium text-purple-600">
                        {enrollment.xp_earned || 0} XP
                      </td>
                      <td className="p-4 text-center text-sm text-slate-600">
                        {enrollment.last_accessed_at 
                          ? new Date(enrollment.last_accessed_at).toLocaleDateString('es-MX', { 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          : 'Nunca'}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          href={`/corporate/progress/${enrollment.employee_id}`}
                          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalle
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Responses (Last 10) */}
      {responses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Respuestas Recientes</h2>
            <p className="text-sm text-slate-600 mt-1">Últimas actividades completadas por tus empleados</p>
          </div>

          <div className="divide-y divide-slate-200">
            {responses.slice(0, 10).map((response: any) => {
              const employee = enrollments.find((e: any) => e.employee_id === response.employee_id)?.employee
              
              return (
                <div key={response.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {employee?.full_name || 'Empleado'}
                      </div>
                      <div className="text-sm text-slate-500">
                        Lección: {response.lesson_id} • Módulo: {response.module_id}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(response.completed_at).toLocaleDateString('es-MX', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {response.reflection && (
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 mb-3">
                      <div className="font-medium text-slate-900 mb-1">Reflexión:</div>
                      {response.reflection}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {response.time_spent_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {response.time_spent_minutes} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Actividad completada
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
