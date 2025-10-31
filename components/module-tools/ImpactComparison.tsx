'use client'

import { TrendingUp, Sparkles } from 'lucide-react'

interface Comparison {
  icon: string
  label: string
  value: number
  unit?: string
}

interface ImpactComparisonProps {
  value: number
  unit: string
  comparisons: Comparison[]
  title?: string
  description?: string
  className?: string
}

export default function ImpactComparison({
  value,
  unit,
  comparisons,
  title = "Tu Impacto en Perspectiva",
  description = "Equivalencias del mundo real",
  className = ''
}: ImpactComparisonProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString('es-MX')
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-indigo-900">{title}</h3>
          <p className="text-xs sm:text-sm text-indigo-700">{description}</p>
        </div>
      </div>

      {/* Main Impact Value */}
      <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 text-center border-2 border-indigo-300">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          <span className="text-xs sm:text-sm font-medium text-indigo-700">Tu Impacto</span>
        </div>
        <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-indigo-600 mb-1">
          {formatNumber(value)}
        </div>
        <div className="text-sm sm:text-base text-indigo-900 font-medium">
          {unit}
        </div>
      </div>

      {/* Comparisons Grid */}
      <div className="space-y-3">
        <div className="text-xs sm:text-sm font-bold text-indigo-900 mb-2">
          💡 Esto es equivalente a:
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {comparisons.map((comparison, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-4 border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl sm:text-4xl flex-shrink-0">
                  {comparison.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-indigo-600 mb-0.5">
                    {formatNumber(comparison.value)}
                  </div>
                  <div className="text-xs sm:text-sm text-indigo-900 leading-tight">
                    {comparison.label}
                    {comparison.unit && (
                      <span className="text-indigo-600 font-medium">
                        {' '}({comparison.unit})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fun Fact */}
      <div className="mt-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 sm:p-4">
        <div className="text-xs sm:text-sm text-purple-900">
          <strong className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            ¿Sabías que...?
          </strong>
          <p className="mt-1 text-purple-800">
            Pequeñas acciones tienen grandes impactos. Si todos en tu organización adoptaran esta práctica, 
            el impacto se multiplicaría exponencialmente. ¡Comparte tu éxito!
          </p>
        </div>
      </div>
    </div>
  )
}

