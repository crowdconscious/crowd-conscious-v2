'use client'

import { useState } from 'react'
import { Droplets, TrendingUp, Building, Users, Save, AlertCircle } from 'lucide-react'

interface WaterUsage {
  production: number
  bathrooms: number
  cooling: number
  irrigation: number
  cleaning: number
  cafeteria: number
}

interface WaterFootprintResult {
  totalDaily: number
  totalMonthly: number
  totalYearly: number
  costDaily: number
  costMonthly: number
  costYearly: number
  perEmployeeDaily: number
  breakdown: WaterUsage
  benchmarkComparison: {
    industry: string
    yourUsage: number
    industryAverage: number
    status: 'excellent' | 'good' | 'average' | 'high' | 'very-high'
  }
  environmentalImpact: {
    treesEquivalent: number
    poolsEquivalent: number
  }
}

interface WaterFootprintCalculatorProps {
  onCalculate?: (result: WaterFootprintResult) => void
  className?: string
}

const industryBenchmarks: Record<string, number> = {
  'office': 50, // liters per employee per day
  'manufacturing': 200,
  'hospitality': 300,
  'healthcare': 400,
  'retail': 80,
  'education': 60,
  'food-service': 250
}

export default function WaterFootprintCalculator({
  onCalculate,
  className = ''
}: WaterFootprintCalculatorProps) {
  const [inputs, setInputs] = useState({
    employees: '',
    industry: 'office',
    waterPrice: '15' // MXN per m³ (average in Mexico)
  })

  const [usage, setUsage] = useState<WaterUsage>({
    production: 0,
    bathrooms: 0,
    cooling: 0,
    irrigation: 0,
    cleaning: 0,
    cafeteria: 0
  })

  const [result, setResult] = useState<WaterFootprintResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    const employees = parseInt(inputs.employees) || 0
    const waterPrice = parseFloat(inputs.waterPrice) || 15

    // Calculate total daily usage (liters)
    const totalDaily = Object.values(usage).reduce((sum, val) => sum + val, 0)
    const totalMonthly = totalDaily * 22 // working days
    const totalYearly = totalDaily * 250 // working days

    // Calculate costs (convert liters to m³, then multiply by price)
    const costDaily = (totalDaily / 1000) * waterPrice
    const costMonthly = (totalMonthly / 1000) * waterPrice
    const costYearly = (totalYearly / 1000) * waterPrice

    // Per employee calculation
    const perEmployeeDaily = employees > 0 ? totalDaily / employees : 0

    // Benchmark comparison
    const industryAverage = industryBenchmarks[inputs.industry] || 100
    let status: 'excellent' | 'good' | 'average' | 'high' | 'very-high'
    
    if (perEmployeeDaily <= industryAverage * 0.7) status = 'excellent'
    else if (perEmployeeDaily <= industryAverage) status = 'good'
    else if (perEmployeeDaily <= industryAverage * 1.3) status = 'average'
    else if (perEmployeeDaily <= industryAverage * 1.7) status = 'high'
    else status = 'very-high'

    // Environmental impact
    // 1 tree absorbs ~100 liters of water per day
    const treesEquivalent = Math.round(totalDaily / 100)
    // Olympic pool = 2,500,000 liters
    const poolsEquivalent = parseFloat((totalYearly / 2500000).toFixed(2))

    const calculatedResult: WaterFootprintResult = {
      totalDaily,
      totalMonthly,
      totalYearly,
      costDaily,
      costMonthly,
      costYearly,
      perEmployeeDaily,
      breakdown: usage,
      benchmarkComparison: {
        industry: inputs.industry,
        yourUsage: perEmployeeDaily,
        industryAverage,
        status
      },
      environmentalImpact: {
        treesEquivalent,
        poolsEquivalent
      }
    }

    setResult(calculatedResult)
    setCalculated(true)

    if (onCalculate) {
      onCalculate(calculatedResult)
    }
  }

  const reset = () => {
    setUsage({
      production: 0,
      bathrooms: 0,
      cooling: 0,
      irrigation: 0,
      cleaning: 0,
      cafeteria: 0
    })
    setResult(null)
    setCalculated(false)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(Math.round(num))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-teal-600'
      case 'average': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'very-high': return 'text-red-600'
      default: return 'text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelente'
      case 'good': return 'Bueno'
      case 'average': return 'Promedio'
      case 'high': return 'Alto'
      case 'very-high': return 'Muy Alto'
      default: return status
    }
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Calculadora de Huella Hídrica</h3>
          <p className="text-xs sm:text-sm text-blue-700">Calcula tu consumo de agua corporativo</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                👥 Número de Empleados
              </label>
              <input
                type="number"
                value={inputs.employees}
                onChange={(e) => setInputs({ ...inputs, employees: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                🏢 Industria
              </label>
              <select
                value={inputs.industry}
                onChange={(e) => setInputs({ ...inputs, industry: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="office">Oficinas</option>
                <option value="manufacturing">Manufactura</option>
                <option value="hospitality">Hospitalidad</option>
                <option value="healthcare">Salud</option>
                <option value="retail">Retail</option>
                <option value="education">Educación</option>
                <option value="food-service">Servicios de Alimentos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              💰 Precio del Agua (MXN/m³)
            </label>
            <input
              type="number"
              step="0.1"
              value={inputs.waterPrice}
              onChange={(e) => setInputs({ ...inputs, waterPrice: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
              placeholder="15"
            />
            <p className="text-xs text-blue-600 mt-1">Promedio en México: $15-25 MXN/m³</p>
          </div>

          <div className="border-t-2 border-blue-200 pt-4">
            <h4 className="font-bold text-blue-900 mb-3 text-sm sm:text-base">💧 Consumo Diario por Área (litros):</h4>
          </div>

          {/* Water Usage by Area */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                🏭 Producción / Operaciones
              </label>
              <input
                type="number"
                value={usage.production || ''}
                onChange={(e) => setUsage({ ...usage, production: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                🚽 Baños / Sanitarios
              </label>
              <input
                type="number"
                value={usage.bathrooms || ''}
                onChange={(e) => setUsage({ ...usage, bathrooms: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="200"
              />
              <p className="text-xs text-blue-600 mt-1">~10 litros por empleado por día</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                ❄️ Enfriamiento / Clima
              </label>
              <input
                type="number"
                value={usage.cooling || ''}
                onChange={(e) => setUsage({ ...usage, cooling: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="150"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                🌱 Riego / Áreas Verdes
              </label>
              <input
                type="number"
                value={usage.irrigation || ''}
                onChange={(e) => setUsage({ ...usage, irrigation: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                🧹 Limpieza / Mantenimiento
              </label>
              <input
                type="number"
                value={usage.cleaning || ''}
                onChange={(e) => setUsage({ ...usage, cleaning: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="80"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                ☕ Cafetería / Cocina
              </label>
              <input
                type="number"
                value={usage.cafeteria || ''}
                onChange={(e) => setUsage({ ...usage, cafeteria: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="120"
              />
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={!inputs.employees}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Calcular Huella Hídrica
          </button>
        </div>
      ) : result && (
        <div className="space-y-4">
          {/* Hero Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-blue-200 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-900">
                {formatNumber(result.totalDaily)}
              </div>
              <div className="text-xs sm:text-sm text-blue-700">Litros / Día</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border-2 border-orange-200 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-orange-900">
                {formatCurrency(result.costYearly)}
              </div>
              <div className="text-xs sm:text-sm text-orange-700">Costo Anual</div>
            </div>
          </div>

          {/* Benchmark Comparison */}
          <div className={`rounded-lg p-4 border-2 ${
            result.benchmarkComparison.status === 'excellent' ? 'bg-green-50 border-green-200' :
            result.benchmarkComparison.status === 'good' ? 'bg-teal-50 border-teal-200' :
            result.benchmarkComparison.status === 'average' ? 'bg-yellow-50 border-yellow-200' :
            result.benchmarkComparison.status === 'high' ? 'bg-orange-50 border-orange-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5" />
              <h4 className="font-bold text-sm sm:text-base">Comparación con tu Industria:</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Tu consumo por empleado:</span>
                <span className={`font-bold ${getStatusColor(result.benchmarkComparison.status)}`}>
                  {result.perEmployeeDaily.toFixed(1)} L/día
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Promedio de la industria:</span>
                <span className="font-bold text-slate-700">
                  {result.benchmarkComparison.industryAverage} L/día
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Estado:</span>
                <span className={`font-bold ${getStatusColor(result.benchmarkComparison.status)}`}>
                  {getStatusLabel(result.benchmarkComparison.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <h4 className="font-bold text-blue-900 mb-3 text-sm sm:text-base">📊 Desglose de Consumo:</h4>
            <div className="space-y-2">
              {Object.entries(result.breakdown).map(([key, value]) => {
                if (value === 0) return null
                const labels: Record<string, string> = {
                  production: '🏭 Producción',
                  bathrooms: '🚽 Baños',
                  cooling: '❄️ Enfriamiento',
                  irrigation: '🌱 Riego',
                  cleaning: '🧹 Limpieza',
                  cafeteria: '☕ Cafetería'
                }
                const percentage = ((value / result.totalDaily) * 100).toFixed(1)
                return (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm">{labels[key]}</span>
                    <div className="text-right">
                      <span className="font-bold text-blue-900">{formatNumber(value)} L</span>
                      <span className="text-xs text-slate-600 ml-2">({percentage}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-4">
            <h4 className="font-bold text-orange-900 mb-3 text-sm sm:text-base">💰 Resumen de Costos:</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Diario:</span>
                <span className="font-bold text-orange-900">{formatCurrency(result.costDaily)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Mensual:</span>
                <span className="font-bold text-orange-900">{formatCurrency(result.costMonthly)}</span>
              </div>
              <div className="border-t border-orange-300 pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Anual:</span>
                <span className="font-bold text-orange-900 text-lg">{formatCurrency(result.costYearly)}</span>
              </div>
            </div>
          </div>

          {/* Environmental Impact */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-3 text-sm sm:text-base">🌍 Impacto Ambiental:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌳</span>
                <div>
                  <div className="font-bold text-green-900">{result.environmentalImpact.treesEquivalent} árboles</div>
                  <div className="text-xs text-green-700">Consumen esta agua diariamente</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏊</span>
                <div>
                  <div className="font-bold text-green-900">{result.environmentalImpact.poolsEquivalent} piscinas olímpicas</div>
                  <div className="text-xs text-green-700">Equivalente anual</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {result.benchmarkComparison.status !== 'excellent' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-blue-900 text-sm sm:text-base">💡 Recomendaciones:</h4>
              </div>
              <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Realizar auditoría detallada de fugas y desperdicios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Instalar dispositivos ahorradores en sanitarios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Implementar sistema de reutilización de aguas grises</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Capacitar al personal en prácticas de ahorro</span>
                </li>
              </ul>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-blue-200 transition-colors min-h-[44px]"
          >
            Calcular de Nuevo
          </button>
        </div>
      )}
    </div>
  )
}

