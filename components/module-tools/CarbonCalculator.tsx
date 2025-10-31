'use client'

import { useState } from 'react'
import { Leaf, TrendingDown, AlertCircle } from 'lucide-react'

interface CarbonCalculatorProps {
  onCalculate?: (result: CarbonResult) => void
  showBreakdown?: boolean
  showComparison?: boolean
  className?: string
}

interface CarbonResult {
  total: number // kg CO₂
  breakdown: {
    electricity: number
    gas: number
    gasoline: number
    diesel: number
    waste: number
  }
  comparisons: {
    trees: number
    carTrips: number
    lightBulbs: number
  }
}

const emissionFactors = {
  // kg CO₂ per unit
  electricity: 0.527, // per kWh (Mexico average)
  gas: 2.03, // per m³
  gasoline: 2.31, // per liter
  diesel: 2.68, // per liter
  waste: 0.46 // per kg
}

export default function CarbonCalculator({
  onCalculate,
  showBreakdown = true,
  showComparison = true,
  className = ''
}: CarbonCalculatorProps) {
  const [inputs, setInputs] = useState({
    electricity: '',
    gas: '',
    gasoline: '',
    diesel: '',
    waste: ''
  })
  const [result, setResult] = useState<CarbonResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    // Calculate emissions for each category
    const breakdown = {
      electricity: parseFloat(inputs.electricity || '0') * emissionFactors.electricity,
      gas: parseFloat(inputs.gas || '0') * emissionFactors.gas,
      gasoline: parseFloat(inputs.gasoline || '0') * emissionFactors.gasoline,
      diesel: parseFloat(inputs.diesel || '0') * emissionFactors.diesel,
      waste: parseFloat(inputs.waste || '0') * emissionFactors.waste
    }

    const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0)

    // Calculate comparisons (fun facts)
    const comparisons = {
      trees: Math.round(total / 20), // ~20kg CO₂ absorbed per tree per year
      carTrips: Math.round(total / 4.6), // ~4.6kg CO₂ per 25km car trip
      lightBulbs: Math.round(total / 0.4) // ~0.4kg CO₂ per bulb per year
    }

    const calculatedResult = { total, breakdown, comparisons }
    setResult(calculatedResult)
    setCalculated(true)
    
    if (onCalculate) {
      onCalculate(calculatedResult)
    }
  }

  const reset = () => {
    setInputs({
      electricity: '',
      gas: '',
      gasoline: '',
      diesel: '',
      waste: ''
    })
    setResult(null)
    setCalculated(false)
  }

  return (
    <div className={`bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-green-900">Calculadora de Huella de Carbono</h3>
          <p className="text-xs sm:text-sm text-green-700">Mide tu impacto ambiental mensual</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Electricity */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              ⚡ Electricidad (kWh/mes)
            </label>
            <input
              type="number"
              value={inputs.electricity}
              onChange={(e) => setInputs({ ...inputs, electricity: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 500"
            />
          </div>

          {/* Natural Gas */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              🔥 Gas Natural (m³/mes)
            </label>
            <input
              type="number"
              value={inputs.gas}
              onChange={(e) => setInputs({ ...inputs, gas: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 50"
            />
          </div>

          {/* Gasoline */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              ⛽ Gasolina (litros/mes)
            </label>
            <input
              type="number"
              value={inputs.gasoline}
              onChange={(e) => setInputs({ ...inputs, gasoline: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 200"
            />
          </div>

          {/* Diesel */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              🚛 Diésel (litros/mes)
            </label>
            <input
              type="number"
              value={inputs.diesel}
              onChange={(e) => setInputs({ ...inputs, diesel: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 100"
            />
          </div>

          {/* Waste */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              🗑️ Residuos (kg/mes)
            </label>
            <input
              type="number"
              value={inputs.waste}
              onChange={(e) => setInputs({ ...inputs, waste: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 500"
            />
          </div>

          <button
            onClick={calculate}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform min-h-[44px]"
          >
            Calcular Huella de Carbono
          </button>

          <div className="flex items-start gap-2 text-xs sm:text-sm text-green-700 bg-green-100 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Ingresa los datos que conozcas. Puedes dejar campos vacíos.</p>
          </div>
        </div>
      ) : result && (
        <div className="space-y-4 sm:space-y-6">
          {/* Total Result */}
          <div className="bg-white rounded-xl p-4 sm:p-6 text-center border-2 border-green-300">
            <div className="text-4xl sm:text-5xl font-bold text-green-600 mb-2">
              {result.total.toFixed(0)}
            </div>
            <div className="text-base sm:text-lg text-green-900 font-medium">
              kg CO₂ / mes
            </div>
            <div className="text-xs sm:text-sm text-green-700 mt-2">
              {(result.total * 12).toFixed(0)} kg CO₂ anuales
            </div>
          </div>

          {/* Breakdown */}
          {showBreakdown && (
            <div className="bg-white rounded-xl p-4 sm:p-6">
              <h4 className="font-bold text-green-900 mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                Desglose por Categoría
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(result.breakdown).map(([key, value]) => {
                  if (value === 0) return null
                  const percentage = (value / result.total) * 100
                  const labels: Record<string, string> = {
                    electricity: '⚡ Electricidad',
                    gas: '🔥 Gas Natural',
                    gasoline: '⛽ Gasolina',
                    diesel: '🚛 Diésel',
                    waste: '🗑️ Residuos'
                  }
                  return (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1 text-xs sm:text-sm">
                        <span className="text-green-900">{labels[key]}</span>
                        <span className="font-bold text-green-700">{value.toFixed(0)} kg</span>
                      </div>
                      <div className="w-full bg-green-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comparisons */}
          {showComparison && (
            <div className="bg-white rounded-xl p-4 sm:p-6">
              <h4 className="font-bold text-green-900 mb-3 sm:mb-4 text-sm sm:text-base">
                💡 Equivalencias (Impacto Anual)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl sm:text-3xl mb-1">🌳</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {result.comparisons.trees}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700">Árboles necesarios</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl sm:text-3xl mb-1">🚗</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {result.comparisons.carTrips}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700">Viajes en auto (25km)</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl sm:text-3xl mb-1">💡</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {result.comparisons.lightBulbs}
                  </div>
                  <div className="text-xs sm:text-sm text-green-700">Focos por 1 año</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-green-200 transition-colors min-h-[44px]"
          >
            Calcular de Nuevo
          </button>
        </div>
      )}
    </div>
  )
}

