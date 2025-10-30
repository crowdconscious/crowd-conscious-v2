import { createClient } from '@/lib/supabase-server'
import { TrendingDown, DollarSign, Droplet, Wind, Recycle, Users, Award, Target, TrendingUp } from 'lucide-react'

export default async function ImpactPage() {
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

  const { data: corporateAccount } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile?.corporate_account_id)
    .single()

  // Get enrollments and completions
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('*, employee:profiles(full_name)')
    .eq('corporate_account_id', profile?.corporate_account_id)

  const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0
  const totalEmployees = new Set(enrollments?.map(e => e.employee_id)).size
  const avgProgress = enrollments?.length 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.completion_percentage || 0), 0) / enrollments.length)
    : 0

  // Get certifications
  const { count: certificationsCount } = await supabase
    .from('certifications')
    .select('*', { count: 'exact', head: true })
    .eq('corporate_account_id', profile?.corporate_account_id)

  // Calculate projected impact based on completed training
  // These are conservative estimates per employee who completed training
  const completedEmployees = certificationsCount || completedCount
  const impactMultiplier = completedEmployees * (avgProgress / 100)
  
  const projectedImpact = {
    // Energy savings (per employee per year)
    energySavings: Math.round(impactMultiplier * 2400), // kWh/year
    energyCost: Math.round(impactMultiplier * 2400 * 0.15 * 20), // MXN (0.15/kWh * 20 pesos)
    
    // Water savings
    waterSavings: Math.round(impactMultiplier * 15000), // Liters/year
    waterCost: Math.round(impactMultiplier * 15000 * 0.03 * 20), // MXN
    
    // Waste reduction
    wasteReduction: Math.round(impactMultiplier * 50), // kg/year
    wasteCost: Math.round(impactMultiplier * 50 * 0.30 * 20), // MXN
    
    // Productivity gains (engagement & efficiency)
    productivityGain: Math.round(impactMultiplier * 18000), // MXN/year per employee
    
    // CO2 reduction
    co2Reduction: Math.round(impactMultiplier * 1200), // kg CO2/year
  }

  const totalSavings = projectedImpact.energyCost + projectedImpact.waterCost + 
                       projectedImpact.wasteCost + projectedImpact.productivityGain

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(num)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Impacto & Ahorros</h1>
        <p className="text-slate-600 mt-1">Mide el retorno de tu inversión en sostenibilidad</p>
      </div>

      {/* Total Impact Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Impacto Total Proyectado</h2>
            <p className="text-emerald-100">Basado en {completedEmployees} empleados capacitados ({avgProgress}% progreso)</p>
          </div>
          <TrendingUp className="w-16 h-16 opacity-20" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="text-sm text-emerald-100 mb-2">Ahorros Anuales Proyectados</div>
            <div className="text-5xl font-bold mb-2">{formatMoney(totalSavings)}</div>
            <div className="text-emerald-100">
              ROI: {corporateAccount?.total_investment 
                ? Math.round((totalSavings / corporateAccount.total_investment) * 100) 
                : 0}%
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="text-sm text-emerald-100 mb-2">Reducción de CO₂</div>
            <div className="text-5xl font-bold mb-2">{formatNumber(projectedImpact.co2Reduction)}</div>
            <div className="text-emerald-100">kg CO₂ equivalente/año</div>
          </div>
        </div>
      </div>

      {/* Impact Breakdown */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Energy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Wind className="w-6 h-6 text-yellow-600" />
            </div>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {formatNumber(projectedImpact.energySavings)} kWh
          </div>
          <div className="text-sm text-slate-600 mb-3">Ahorro energético anual</div>
          <div className="text-lg font-bold text-green-600">
            {formatMoney(projectedImpact.energyCost)}
          </div>
          <div className="text-xs text-slate-500">20% reducción estimada</div>
        </div>

        {/* Water */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Droplet className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {formatNumber(projectedImpact.waterSavings)} L
          </div>
          <div className="text-sm text-slate-600 mb-3">Ahorro de agua anual</div>
          <div className="text-lg font-bold text-green-600">
            {formatMoney(projectedImpact.waterCost)}
          </div>
          <div className="text-xs text-slate-500">18% reducción estimada</div>
        </div>

        {/* Waste */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Recycle className="w-6 h-6 text-green-600" />
            </div>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {formatNumber(projectedImpact.wasteReduction)} kg
          </div>
          <div className="text-sm text-slate-600 mb-3">Reducción de residuos</div>
          <div className="text-lg font-bold text-green-600">
            {formatMoney(projectedImpact.wasteCost)}
          </div>
          <div className="text-xs text-slate-500">25% reducción estimada</div>
        </div>

        {/* Productivity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mb-1">
            {avgProgress}%
          </div>
          <div className="text-sm text-slate-600 mb-3">Engagement promedio</div>
          <div className="text-lg font-bold text-green-600">
            {formatMoney(projectedImpact.productivityGain)}
          </div>
          <div className="text-xs text-slate-500">Ganancia en productividad</div>
        </div>
      </div>

      {/* ESG Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Métricas ESG</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Environmental */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Ambiental</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Reducción CO₂</span>
                <span className="font-bold text-slate-900">{formatNumber(projectedImpact.co2Reduction)} kg</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Ahorro Energético</span>
                <span className="font-bold text-slate-900">{formatNumber(projectedImpact.energySavings)} kWh</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Ahorro de Agua</span>
                <span className="font-bold text-slate-900">{formatNumber(projectedImpact.waterSavings)} L</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">Residuos Evitados</span>
                <span className="font-bold text-slate-900">{formatNumber(projectedImpact.wasteReduction)} kg</span>
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Social</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Empleados Capacitados</span>
                <span className="font-bold text-slate-900">{totalEmployees}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Certificados Emitidos</span>
                <span className="font-bold text-slate-900">{certificationsCount || 0}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Tasa de Completación</span>
                <span className="font-bold text-slate-900">{avgProgress}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">Horas de Capacitación</span>
                <span className="font-bold text-slate-900">{totalEmployees * 30}h</span>
              </div>
            </div>
          </div>

          {/* Governance */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Gobierno</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Programa Activo</span>
                <span className="font-bold text-green-600">✓ Sí</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Cumplimiento ESG</span>
                <span className="font-bold text-slate-900">{avgProgress > 50 ? 'Alto' : 'Medio'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Transparencia</span>
                <span className="font-bold text-green-600">100%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600">Auditoría</span>
                <span className="font-bold text-slate-900">Disponible</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Retorno de Inversión</h2>
            <p className="text-slate-600">Análisis financiero de tu programa de capacitación</p>
          </div>
          <DollarSign className="w-12 h-12 text-green-600" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6">
            <div className="text-sm text-slate-600 mb-2">Inversión Total</div>
            <div className="text-3xl font-bold text-slate-900">
              {formatMoney(corporateAccount?.total_investment || 85000)}
            </div>
            <div className="text-sm text-slate-500 mt-1">Programa {corporateAccount?.program_tier}</div>
          </div>

          <div className="bg-white rounded-xl p-6">
            <div className="text-sm text-slate-600 mb-2">Ahorros Anuales</div>
            <div className="text-3xl font-bold text-green-600">
              {formatMoney(totalSavings)}
            </div>
            <div className="text-sm text-slate-500 mt-1">Proyección conservadora</div>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-green-500">
            <div className="text-sm text-slate-600 mb-2">Recuperación</div>
            <div className="text-3xl font-bold text-green-600">
              {totalSavings > 0 
                ? Math.ceil(((corporateAccount?.total_investment || 85000) / totalSavings) * 12) 
                : 0} meses
            </div>
            <div className="text-sm text-green-700 font-medium mt-1">
              ROI: {totalSavings > 0 
                ? Math.round(((totalSavings - (corporateAccount?.total_investment || 85000)) / (corporateAccount?.total_investment || 85000)) * 100)
                : 0}% anual
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Estas proyecciones se basan en estudios de impacto de programas similares. 
            Los resultados reales varían según el nivel de implementación y compromiso de los empleados.
          </p>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Reportes ESG</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition font-medium">
            📊 Descargar Reporte ESG (PDF)
          </button>
          <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium">
            📈 Exportar Métricas (Excel)
          </button>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            📧 Compartir con Stakeholders
          </button>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          Los reportes incluyen todas las métricas de impacto, certificaciones y progreso de empleados
        </p>
      </div>
    </div>
  )
}
