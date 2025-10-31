'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Calendar } from 'lucide-react'

interface CostCalculatorProps {
  onCalculate?: (result: CostResult) => void
  showROI?: boolean
  showPaybackPeriod?: boolean
  className?: string
}

interface CostResult {
  currentMonthlyCost: number
  reductionPercentage: number
  monthlySavings: number
  annualSavings: number
  threeYearSavings: number
  implementationCost?: number
  paybackMonths?: number
  roi?: number
}

export default function CostCalculator({
  onCalculate,
  showROI = true,
  showPaybackPeriod = true,
  className = ''
}: CostCalculatorProps) {
  const [inputs, setInputs] = useState({
    currentCost: '',
    reduction: '',
    implementationCost: ''
  })
  const [result, setResult] = useState<CostResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    const currentCost = parseFloat(inputs.currentCost || '0')
    const reductionPercent = parseFloat(inputs.reduction || '0')
    const implCost = parseFloat(inputs.implementationCost || '0')

    const monthlySavings = (currentCost * reductionPercent) / 100
    const annualSavings = monthlySavings * 12
    const threeYearSavings = annualSavings * 3

    let paybackMonths = undefined
    let roi = undefined

    if (implCost > 0) {
      paybackMonths = implCost / monthlySavings
      roi = ((threeYearSavings - implCost) / implCost) * 100
    }

    const calculatedResult: CostResult = {
      currentMonthlyCost: currentCost,
      reductionPercentage: reductionPercent,
      monthlySavings,
      annualSavings,
      threeYearSavings,
      implementationCost: implCost > 0 ? implCost : undefined,
      paybackMonths,
      roi
    }

    setResult(calculatedResult)
    setCalculated(true)

    if (onCalculate) {
      onCalculate(calculatedResult)
    }
  }

  const reset = () => {
    setInputs({
      currentCost: '',
      reduction: '',
      implementationCost: ''
    })
    setResult(null)
    setCalculated(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Calculadora de Ahorros</h3>
          <p className="text-xs sm:text-sm text-blue-700">Mide el impacto financiero</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-3 sm:space-y-4">
          {/* Current Monthly Cost */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              💰 Costo Mensual Actual
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.currentCost}
                onChange={(e) => setInputs({ ...inputs, currentCost: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                placeholder="10,000"
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">Por ejemplo: electricidad, agua, combustible</p>
          </div>

          {/* Reduction Percentage */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              📉 Reducción Esperada (%)
            </label>
            <div className="relative">
              <input
                type="number"
                value={inputs.reduction}
                onChange={(e) => setInputs({ ...inputs, reduction: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                placeholder="20"
                min="0"
                max="100"
              />
              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold">
                %
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">¿Cuánto esperas reducir?</p>
          </div>

          {/* Implementation Cost (Optional) */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              🛠️ Costo de Implementación (Opcional)
            </label>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold">
                $
              </span>
              <input
                type="number"
                value={inputs.implementationCost}
                onChange={(e) => setInputs({ ...inputs, implementationCost: e.target.value })}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
                placeholder="5,000"
              />
            </div>
            <p className="text-xs text-blue-600 mt-1">Inversión inicial para lograr la reducción</p>
          </div>

          <button
            onClick={calculate}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform min-h-[44px]"
          >
            Calcular Ahorros
          </button>
        </div>
      ) : result && (
        <div className="space-y-3 sm:space-y-4">
          {/* Monthly Savings */}
          <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-blue-300">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">
                {formatCurrency(result.monthlySavings)}
              </div>
              <div className="text-sm sm:text-base text-blue-900 font-medium">
                Ahorro Mensual
              </div>
              <div className="text-xs text-blue-700 mt-1">
                {result.reductionPercentage}% de reducción
              </div>
            </div>
          </div>

          {/* Timeline Projections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Annual */}
            <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
              <div className="text-xs sm:text-sm text-blue-700 mb-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                Anual
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatCurrency(result.annualSavings)}
              </div>
            </div>

            {/* 3 Years */}
            <div className="bg-white rounded-lg p-4 text-center border border-blue-200">
              <div className="text-xs sm:text-sm text-blue-700 mb-1 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                3 Años
              </div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatCurrency(result.threeYearSavings)}
              </div>
            </div>
          </div>

          {/* ROI & Payback (if implementation cost provided) */}
          {result.implementationCost && result.implementationCost > 0 && (
            <>
              {showPaybackPeriod && result.paybackMonths && (
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm text-green-700 font-medium mb-1">
                        ⏱️ Periodo de Recuperación
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {result.paybackMonths.toFixed(1)} meses
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Inversión inicial: {formatCurrency(result.implementationCost)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showROI && result.roi !== undefined && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs sm:text-sm text-purple-700 font-medium mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                        Retorno de Inversión (ROI a 3 años)
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                        {result.roi.toFixed(0)}%
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        Ganancia neta: {formatCurrency(result.threeYearSavings - result.implementationCost)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Impact Summary */}
          <div className="bg-blue-100 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-900">
              <strong>💡 Resumen:</strong> Al reducir {result.reductionPercentage}% tu costo mensual de {formatCurrency(result.currentMonthlyCost)}, 
              ahorrarás <strong>{formatCurrency(result.annualSavings)}</strong> al año.
              {result.paybackMonths && result.paybackMonths < 12 && (
                <> ¡Tu inversión se recupera en menos de un año!</>
              )}
            </p>
          </div>

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

