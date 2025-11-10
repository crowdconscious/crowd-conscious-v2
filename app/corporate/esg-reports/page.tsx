import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  FileText,
  Download,
  TrendingUp,
  Users,
  Award,
  Calendar,
  ArrowLeft,
  Leaf,
  Droplet,
  Wind,
  Recycle,
  DollarSign,
  BarChart3
} from 'lucide-react'
import ESGReportDownloader from '@/components/esg/ESGReportDownloader'

export const dynamic = 'force-dynamic'

export default async function CorporateESGReports() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Get corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('corporate_account_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.corporate_account_id) {
    redirect('/corporate/dashboard')
  }

  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile.corporate_account_id)
    .single()

  // Get all employees in the company
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('corporate_account_id', profile.corporate_account_id)
    .eq('is_corporate_user', true)

  const employeeIds = employees?.map(e => e.id) || []

  // Get all enrollments for company employees
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      marketplace_modules (
        id,
        title,
        core_value,
        xp_reward,
        lesson_count
      )
    `)
    .in('user_id', employeeIds)
    .order('created_at', { ascending: false })

  // Get activity responses for ESG data
  const enrollmentIds = enrollments?.map(e => e.id) || []
  const { data: activities } = await supabase
    .from('activity_responses')
    .select('*')
    .in('enrollment_id', enrollmentIds)

  // Calculate company-wide metrics
  const totalEmployees = employees?.length || 0
  const enrolledEmployees = new Set(enrollments?.map(e => e.user_id)).size
  const completedModules = enrollments?.filter(e => e.completed).length || 0
  const totalEnrollments = enrollments?.length || 0
  const participationRate = totalEmployees > 0 
    ? Math.round((enrolledEmployees / totalEmployees) * 100) 
    : 0

  // Calculate XP and progress
  const totalXP = enrollments?.reduce((sum, e) => sum + (e.xp_earned || 0), 0) || 0
  const avgProgress = enrollments && enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
    : 0

  // Calculate impact metrics from tool data
  let totalCO2 = 0
  let totalWater = 0
  let totalWaste = 0
  let totalSavings = 0
  let toolsUsed = 0

  if (activities) {
    for (const activity of activities) {
      if (activity.custom_responses) {
        Object.entries(activity.custom_responses).forEach(([key, value]: [string, any]) => {
          if (key.startsWith('tool_')) {
            toolsUsed++
            
            // Air Quality ROI
            if (key === 'tool_air-quality-roi' && value.annualSavings) {
              totalSavings += value.annualSavings || 0
              totalCO2 += 500 // Estimated
            }
            
            // Water Footprint
            if (key === 'tool_water-footprint-calculator' && value.totalWater) {
              totalWater += (value.totalWater || 0) * 0.2 // 20% reduction
            }
            
            // Waste Analyzer
            if (key === 'tool_waste-stream-analyzer' && value.totalWaste) {
              totalWaste += (value.totalWaste || 0) * 0.3 // 30% reduction
            }
            
            // Any calculator with savings
            if (value.annualSavings) {
              totalSavings += value.annualSavings || 0
            }
          }
        })
      }
    }
  }

  // Group enrollments by module
  const moduleStats: Record<string, {
    title: string
    enrollments: number
    completed: number
    avgProgress: number
    coreValue: string
  }> = {}

  enrollments?.forEach(enrollment => {
    const moduleId = enrollment.module_id
    if (!moduleId || !enrollment.marketplace_modules) return

    if (!moduleStats[moduleId]) {
      moduleStats[moduleId] = {
        title: enrollment.marketplace_modules.title,
        enrollments: 0,
        completed: 0,
        avgProgress: 0,
        coreValue: enrollment.marketplace_modules.core_value
      }
    }

    moduleStats[moduleId].enrollments++
    if (enrollment.completed) moduleStats[moduleId].completed++
    moduleStats[moduleId].avgProgress += enrollment.progress_percentage || 0
  })

  // Calculate averages
  Object.keys(moduleStats).forEach(moduleId => {
    const stats = moduleStats[moduleId]
    stats.avgProgress = Math.round(stats.avgProgress / stats.enrollments)
  })

  const trees = Math.round(totalCO2 / 21)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Back Navigation */}
        <Link
          href="/corporate/dashboard"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver al Dashboard</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reportes ESG Corporativos</h1>
              <p className="text-slate-600">{corporateAccount?.company_name}</p>
            </div>
          </div>
        </div>

        {/* Company-Wide Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Participation Card */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Participación</p>
                <p className="text-2xl font-bold text-slate-900">{participationRate}%</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {enrolledEmployees} de {totalEmployees} empleados activos
            </p>
          </div>

          {/* Modules Completed */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Completados</p>
                <p className="text-2xl font-bold text-slate-900">{completedModules}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              {totalEnrollments} inscripciones totales
            </p>
          </div>

          {/* Total XP */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">XP Total</p>
                <p className="text-2xl font-bold text-slate-900">{totalXP.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Progreso promedio: {avgProgress}%
            </p>
          </div>

          {/* Tools Used */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Herramientas</p>
                <p className="text-2xl font-bold text-slate-900">{toolsUsed}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Usos registrados
            </p>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-600" />
            Impacto Ambiental Corporativo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* CO2 Reduction */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Wind className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-slate-700">CO₂ Reducido</span>
              </div>
              <p className="text-3xl font-bold text-green-600 mb-1">
                {totalCO2.toLocaleString()} kg
              </p>
              <p className="text-xs text-slate-600">≈ {trees} árboles plantados</p>
            </div>

            {/* Water Saved */}
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Agua Ahorrada</span>
              </div>
              <p className="text-3xl font-bold text-blue-600 mb-1">
                {totalWater.toLocaleString()} L
              </p>
              <p className="text-xs text-slate-600">Litros conservados</p>
            </div>

            {/* Waste Reduced */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Recycle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-semibold text-slate-700">Residuos Evitados</span>
              </div>
              <p className="text-3xl font-bold text-orange-600 mb-1">
                {totalWaste.toLocaleString()} kg
              </p>
              <p className="text-xs text-slate-600">Desviados del relleno</p>
            </div>

            {/* Cost Savings */}
            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">Ahorro Estimado</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600 mb-1">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600">MXN por año</p>
            </div>
          </div>
        </div>

        {/* Module Performance */}
        {Object.keys(moduleStats).length > 0 && (
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Rendimiento por Módulo</h2>
            
            <div className="space-y-4">
              {Object.entries(moduleStats).map(([moduleId, stats]) => {
                const completionRate = stats.enrollments > 0 
                  ? Math.round((stats.completed / stats.enrollments) * 100) 
                  : 0

                return (
                  <div key={moduleId} className="border-2 border-slate-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-1">{stats.title}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                          <span>{stats.enrollments} empleados inscritos</span>
                          <span>•</span>
                          <span>{stats.completed} completados</span>
                          <span>•</span>
                          <span className="font-medium">{completionRate}% tasa de completación</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-teal-600">{stats.avgProgress}%</div>
                        <div className="text-xs text-slate-500">progreso promedio</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-green-500 h-3 rounded-full transition-all"
                        style={{ width: `${stats.avgProgress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Download Reports Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Download className="w-6 h-6" />
            Descargar Reportes ESG
          </h2>

          {/* Corporate-Wide Report */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Reporte Corporativo Completo</h3>
            <ESGReportDownloader
              type="corporate"
              corporateAccountId={profile.corporate_account_id}
              moduleName={corporateAccount?.company_name || 'Reporte Corporativo'}
              coreValue="corporate"
            />
          </div>

          {/* Module-Specific Reports */}
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Reportes por Módulo</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(moduleStats).map(([moduleId, stats]) => (
              <ESGReportDownloader
                key={moduleId}
                type="module"
                moduleId={moduleId}
                corporateAccountId={profile.corporate_account_id}
                moduleName={stats.title}
                coreValue={stats.coreValue}
              />
            ))}
          </div>
        </div>

        {/* Report Features Info */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="font-bold text-purple-900 mb-3">📊 ¿Qué incluyen los reportes?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
            <div>
              <p className="font-semibold mb-2">Métricas de Aprendizaje:</p>
              <ul className="space-y-1 ml-4">
                <li>• Participación de empleados</li>
                <li>• Tasas de completación</li>
                <li>• XP y progreso total</li>
                <li>• Tiempo invertido</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Impacto Ambiental:</p>
              <ul className="space-y-1 ml-4">
                <li>• Reducción de CO₂</li>
                <li>• Ahorro de agua</li>
                <li>• Residuos evitados</li>
                <li>• Ahorro económico estimado</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-purple-700 mt-4">
            ✨ Estos reportes son ideales para cumplimiento ESG, presentaciones a stakeholders, y certificaciones ISO.
          </p>
        </div>

      </div>
    </div>
  )
}

