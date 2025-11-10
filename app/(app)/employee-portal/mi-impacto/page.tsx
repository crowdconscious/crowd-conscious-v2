import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  TrendingUp, 
  Droplet, 
  Trash2, 
  DollarSign, 
  TreePine,
  Award,
  Calendar,
  Target,
  BarChart3,
  Leaf,
  ArrowLeft
} from 'lucide-react'
import ESGReportDownloader from '@/components/esg/ESGReportDownloader'

export const dynamic = 'force-dynamic'

export default async function MiImpactoPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get user's enrollments with module details
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      marketplace_modules (
        id,
        title,
        core_value,
        xp_reward
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get all activity responses for the user
  const enrollmentIds = enrollments?.map(e => e.id) || []
  const { data: activities } = await supabase
    .from('activity_responses')
    .select('*')
    .in('enrollment_id', enrollmentIds)

  // Calculate impact metrics from tool data
  let totalCO2 = 0
  let totalWater = 0
  let totalWaste = 0
  let totalSavings = 0
  let toolsUsed = 0
  let activitiesCompleted = 0

  const toolResultsByModule: Record<string, any[]> = {}

  if (activities) {
    for (const activity of activities) {
      if (activity.completed) activitiesCompleted++
      
      if (activity.custom_responses) {
        Object.entries(activity.custom_responses).forEach(([key, value]: [string, any]) => {
          if (key.startsWith('tool_')) {
            toolsUsed++
            
            // Calculate impact based on tool type
            const toolName = key.replace('tool_', '')
            
            // Track by module
            const moduleId = activity.module_id
            if (!toolResultsByModule[moduleId]) {
              toolResultsByModule[moduleId] = []
            }
            toolResultsByModule[moduleId].push({ name: toolName, data: value })
            
            // Air Quality ROI
            if (toolName === 'air-quality-roi' && value.annualSavings) {
              totalSavings += value.annualSavings || 0
              totalCO2 += 500 // Estimated
            }
            
            // Water Footprint
            if (toolName === 'water-footprint-calculator' && value.totalWater) {
              totalWater += (value.totalWater || 0) * 0.2 // 20% reduction
            }
            
            // Waste Analyzer
            if (toolName === 'waste-stream-analyzer' && value.totalWaste) {
              totalWaste += (value.totalWaste || 0) * 0.3 // 30% reduction
            }
            
            // Any calculator with savings
            if (value.tool_type === 'calculator' && value.annualSavings) {
              totalSavings += value.annualSavings || 0
            }
            
            // Cost calculator
            if (toolName === 'cost-calculator' && value.totalCost) {
              totalSavings += (value.totalCost || 0) * 0.1 // 10% savings estimate
            }
          }
        })
      }
    }
  }

  // Round metrics
  totalCO2 = Math.round(totalCO2)
  totalWater = Math.round(totalWater)
  totalWaste = Math.round(totalWaste)
  totalSavings = Math.round(totalSavings)

  // Calculate trees equivalent (1 tree = 21kg CO2/year)
  const treesEquivalent = Math.round(totalCO2 / 21)

  // Calculate total XP
  const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0

  // Calculate completion stats
  const totalEnrollments = enrollments?.length || 0
  const completedEnrollments = enrollments?.filter(e => e.completed).length || 0
  const inProgressEnrollments = enrollments?.filter(e => e.status === 'in_progress').length || 0

  // Get profile for corporate info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, corporate_account_id, corporate_role')
    .eq('id', user.id)
    .single()

  const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link 
          href="/employee-portal/dashboard"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver al Portal</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            🌍 Mi Impacto Ambiental
          </h1>
          <p className="text-lg text-slate-600">
            Mide el impacto positivo de tu aprendizaje en el medio ambiente
          </p>
        </div>

        {/* Impact Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* CO2 Reduced */}
          <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">CO₂ Reducido</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">{totalCO2} kg</div>
            <p className="text-xs text-slate-500">Equivalente a {treesEquivalent} árboles plantados</p>
          </div>

          {/* Water Saved */}
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Droplet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Agua Ahorrada</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">{totalWater.toLocaleString('es-MX')} L</div>
            <p className="text-xs text-slate-500">Litros de agua conservados</p>
          </div>

          {/* Waste Reduced */}
          <div className="bg-white border-2 border-orange-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Residuos Reducidos</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-1">{totalWaste} kg</div>
            <p className="text-xs text-slate-500">Kilogramos de basura evitados</p>
          </div>

          {/* Cost Savings */}
          <div className="bg-white border-2 border-purple-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Ahorro en Costos</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              ${totalSavings.toLocaleString('es-MX')}
            </div>
            <p className="text-xs text-slate-500">Pesos MXN ahorrados</p>
          </div>
        </div>

        {/* Learning Stats */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-slate-700" />
            <h2 className="text-xl font-bold text-slate-900">Estadísticas de Aprendizaje</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600 mb-1">{totalEnrollments}</div>
              <p className="text-sm text-slate-600">Módulos Inscritos</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">{completedEnrollments}</div>
              <p className="text-sm text-slate-600">Completados</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{inProgressEnrollments}</div>
              <p className="text-sm text-slate-600">En Progreso</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">{totalXP}</div>
              <p className="text-sm text-slate-600">XP Total</p>
            </div>
          </div>

          <div className="border-t-2 border-slate-200 mt-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Actividades Completadas</p>
                  <p className="text-2xl font-bold text-teal-600">{activitiesCompleted}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Herramientas Utilizadas</p>
                  <p className="text-2xl font-bold text-orange-600">{toolsUsed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Impact by Module */}
        {Object.keys(toolResultsByModule).length > 0 && (
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <TreePine className="w-6 h-6 text-slate-700" />
              <h2 className="text-xl font-bold text-slate-900">Impacto por Módulo</h2>
            </div>

            <div className="space-y-4">
              {Object.entries(toolResultsByModule).map(([moduleId, tools]) => {
                const moduleEnrollment = enrollments?.find(e => e.module_id === moduleId)
                const moduleName = moduleEnrollment?.marketplace_modules?.title || 'Módulo Desconocido'
                const coreValue = moduleEnrollment?.marketplace_modules?.core_value
                
                return (
                  <div key={moduleId} className="border-2 border-slate-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-900">{moduleName}</h3>
                      <span className="text-sm px-3 py-1 bg-teal-100 text-teal-700 rounded-full">
                        {tools.length} {tools.length === 1 ? 'herramienta' : 'herramientas'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tools.map((tool, i) => (
                        <span 
                          key={i} 
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md"
                        >
                          {tool.name.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Download Reports */}
        {completedEnrollments > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Descargar Reportes ESG
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Individual Reports - Show ALL completed modules */}
              {enrollments?.filter(e => e.completed).map((enrollment) => (
                <ESGReportDownloader
                  key={enrollment.id}
                  type="individual"
                  enrollmentId={enrollment.id}
                  moduleId={enrollment.module_id || undefined}
                  moduleName={enrollment.marketplace_modules?.title}
                  coreValue={enrollment.marketplace_modules?.core_value}
                />
              ))}
            </div>

            {completedEnrollments > 0 && (
              <p className="text-sm text-slate-600 mt-4 text-center font-medium">
                ✅ Mostrando todos los {completedEnrollments} {completedEnrollments === 1 ? 'reporte disponible' : 'reportes disponibles'}
              </p>
            )}
          </div>
        )}

        {/* Empty State */}
        {totalEnrollments === 0 && (
          <div className="bg-white border-2 border-slate-200 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Leaf className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              ¡Comienza tu Viaje de Impacto!
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Inscríbete en módulos de aprendizaje y utiliza las herramientas para empezar a generar un impacto positivo medible.
            </p>
            <a
              href="/marketplace"
              className="inline-block bg-gradient-to-r from-teal-600 to-green-600 text-white px-8 py-4 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Explorar Módulos
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

