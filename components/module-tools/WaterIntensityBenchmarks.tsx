'use client'

import { useState } from 'react'
import { Droplet, TrendingDown, TrendingUp, Download, Info } from 'lucide-react'

interface IndustryBenchmark {
  industry: string
  unit: string
  low: number
  medium: number
  high: number
  best: number
  source: string
}

const benchmarks: IndustryBenchmark[] = [
  {
    industry: 'Manufactura General',
    unit: 'm³/ton producto',
    low: 15,
    medium: 10,
    high: 5,
    best: 2,
    source: 'CONAGUA México'
  },
  {
    industry: 'Alimentos y Bebidas',
    unit: 'm³/ton producto',
    low: 25,
    medium: 15,
    high: 8,
    best: 3,
    source: 'GRI 303'
  },
  {
    industry: 'Textiles',
    unit: 'm³/kg producto',
    low: 200,
    medium: 120,
    high: 60,
    best: 30,
    source: 'Water Footprint Network'
  },
  {
    industry: 'Papel y Celulosa',
    unit: 'm³/ton producto',
    low: 100,
    medium: 60,
    high: 30,
    best: 15,
    source: 'GRI 303'
  },
  {
    industry: 'Química',
    unit: 'm³/ton producto',
    low: 50,
    medium: 30,
    high: 15,
    best: 8,
    source: 'CDP Water Security'
  },
  {
    industry: 'Metales',
    unit: 'm³/ton producto',
    low: 40,
    medium: 25,
    high: 12,
    best: 6,
    source: 'CONAGUA México'
  },
  {
    industry: 'Servicios (Oficinas)',
    unit: 'm³/empleado/año',
    low: 50,
    medium: 30,
    high: 15,
    best: 8,
    source: 'EPA WaterSense'
  },
  {
    industry: 'Hotelería',
    unit: 'm³/habitación/noche',
    low: 0.5,
    medium: 0.3,
    high: 0.15,
    best: 0.08,
    source: 'GRI 303'
  }
]

export default function WaterIntensityBenchmarks() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [userIntensity, setUserIntensity] = useState<string>('')
  const [userUnit, setUserUnit] = useState<string>('')
  const [comparison, setComparison] = useState<any>(null)

  const calculateComparison = () => {
    if (!selectedIndustry || !userIntensity) return

    const benchmark = benchmarks.find(b => b.industry === selectedIndustry)
    if (!benchmark) return

    const userValue = parseFloat(userIntensity)
    if (isNaN(userValue)) return

    // Normalize units if needed (simplified - assumes same unit)
    const normalizedValue = userValue

    let performance: 'excellent' | 'good' | 'fair' | 'poor' = 'poor'
    let recommendation = ''
    let improvementPotential = 0

    if (normalizedValue <= benchmark.best) {
      performance = 'excellent'
      recommendation = '¡Excelente! Estás en el nivel de mejores prácticas. Mantén este desempeño y comparte tus estrategias.'
      improvementPotential = 0
    } else if (normalizedValue <= benchmark.high) {
      performance = 'good'
      recommendation = 'Buen desempeño. Puedes mejorar implementando tecnologías de reutilización y optimización de procesos.'
      improvementPotential = ((normalizedValue - benchmark.best) / normalizedValue) * 100
    } else if (normalizedValue <= benchmark.medium) {
      performance = 'fair'
      recommendation = 'Desempeño medio. Prioriza auditorías de agua, detección de fugas y mejoras operativas.'
      improvementPotential = ((normalizedValue - benchmark.high) / normalizedValue) * 100
    } else {
      performance = 'poor'
      recommendation = 'Hay oportunidades significativas de mejora. Comienza con auditoría completa, detección de fugas y optimización de procesos básicos.'
      improvementPotential = ((normalizedValue - benchmark.medium) / normalizedValue) * 100
    }

    setComparison({
      benchmark,
      userValue: normalizedValue,
      performance,
      recommendation,
      improvementPotential,
      vsLow: ((benchmark.low - normalizedValue) / benchmark.low) * 100,
      vsMedium: ((benchmark.medium - normalizedValue) / benchmark.medium) * 100,
      vsHigh: ((benchmark.high - normalizedValue) / benchmark.high) * 100,
      vsBest: ((benchmark.best - normalizedValue) / benchmark.best) * 100
    })
  }

  const exportReport = () => {
    if (!comparison) return

    const csv = [
      ['Reporte de Comparación de Intensidad de Agua'],
      [],
      ['Industria', selectedIndustry],
      ['Tu Intensidad', `${userIntensity} ${userUnit || comparison.benchmark.unit}`],
      ['Unidad', comparison.benchmark.unit],
      [],
      ['Benchmarks de Industria'],
      ['Nivel', 'Valor', 'Unidad'],
      ['Mejores Prácticas', comparison.benchmark.best, comparison.benchmark.unit],
      ['Alto', comparison.benchmark.high, comparison.benchmark.unit],
      ['Medio', comparison.benchmark.medium, comparison.benchmark.unit],
      ['Bajo', comparison.benchmark.low, comparison.benchmark.unit],
      [],
      ['Comparación'],
      ['Tu desempeño', comparison.performance === 'excellent' ? 'Excelente' : comparison.performance === 'good' ? 'Bueno' : comparison.performance === 'fair' ? 'Medio' : 'Bajo'],
      ['Potencial de mejora', `${comparison.improvementPotential.toFixed(1)}%`],
      [],
      ['Recomendación', comparison.recommendation],
      [],
      ['Fuente', comparison.benchmark.source]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `benchmarks-intensidad-agua-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Benchmarks: Intensidad de Agua por Industria</h2>
        <p className="text-slate-600">Compara tu intensidad de agua con benchmarks de tu industria</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">¿Qué es la Intensidad de Agua?</p>
            <p>La intensidad de agua mide cuánta agua se utiliza por unidad de producción o servicio. Permite comparar tu desempeño con otras empresas de tu industria.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Selecciona tu Industria</label>
          <select
            value={selectedIndustry}
            onChange={(e) => {
              setSelectedIndustry(e.target.value)
              const benchmark = benchmarks.find(b => b.industry === e.target.value)
              if (benchmark) {
                setUserUnit(benchmark.unit)
              }
              setComparison(null)
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Selecciona una industria...</option>
            {benchmarks.map(b => (
              <option key={b.industry} value={b.industry}>
                {b.industry} ({b.unit})
              </option>
            ))}
          </select>
        </div>

        {selectedIndustry && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tu Intensidad de Agua
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={userIntensity}
                  onChange={(e) => setUserIntensity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                <input
                  type="text"
                  value={userUnit}
                  onChange={(e) => setUserUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="m³/ton, m³/empleado, etc."
                />
              </div>
            </div>

            <button
              onClick={calculateComparison}
              disabled={!userIntensity}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Droplet className="w-5 h-5" />
              Comparar con Benchmarks
            </button>
          </>
        )}
      </div>

      {selectedIndustry && !comparison && (
        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Benchmarks de Referencia</h3>
          <div className="space-y-3">
            {benchmarks
              .filter(b => b.industry === selectedIndustry)
              .map(b => (
                <div key={b.industry} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-600 mb-1">Mejores Prácticas</div>
                      <div className="font-bold text-green-600">{b.best} {b.unit}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 mb-1">Alto</div>
                      <div className="font-bold text-blue-600">{b.high} {b.unit}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 mb-1">Medio</div>
                      <div className="font-bold text-yellow-600">{b.medium} {b.unit}</div>
                    </div>
                    <div>
                      <div className="text-slate-600 mb-1">Bajo</div>
                      <div className="font-bold text-red-600">{b.low} {b.unit}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Fuente: {b.source}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {comparison && (
        <div className="space-y-6">
          <div className={`rounded-lg p-6 border-2 ${
            comparison.performance === 'excellent' ? 'bg-green-50 border-green-200' :
            comparison.performance === 'good' ? 'bg-blue-50 border-blue-200' :
            comparison.performance === 'fair' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {comparison.performance === 'excellent' ? (
                <TrendingDown className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingUp className="w-8 h-8 text-red-600" />
              )}
              <div>
                <div className="text-sm text-slate-600">Tu Desempeño</div>
                <div className={`text-2xl font-bold ${
                  comparison.performance === 'excellent' ? 'text-green-600' :
                  comparison.performance === 'good' ? 'text-blue-600' :
                  comparison.performance === 'fair' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {comparison.performance === 'excellent' ? 'Excelente' :
                   comparison.performance === 'good' ? 'Bueno' :
                   comparison.performance === 'fair' ? 'Medio' : 'Bajo'}
                </div>
              </div>
            </div>
            <div className="text-slate-700 mb-2">
              <strong>Tu Intensidad:</strong> {comparison.userValue.toFixed(2)} {comparison.benchmark.unit}
            </div>
            <div className="text-sm text-slate-600">{comparison.recommendation}</div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Comparación Detallada</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="text-slate-700">vs. Mejores Prácticas</span>
                <span className={`font-bold ${comparison.vsBest <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.vsBest <= 0 ? 'Mejor' : `${comparison.vsBest.toFixed(1)}% más alto`}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="text-slate-700">vs. Alto</span>
                <span className={`font-bold ${comparison.vsHigh <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.vsHigh <= 0 ? 'Mejor' : `${comparison.vsHigh.toFixed(1)}% más alto`}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <span className="text-slate-700">vs. Medio</span>
                <span className={`font-bold ${comparison.vsMedium <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.vsMedium <= 0 ? 'Mejor' : `${comparison.vsMedium.toFixed(1)}% más alto`}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="text-slate-700">vs. Bajo</span>
                <span className={`font-bold ${comparison.vsLow <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {comparison.vsLow <= 0 ? 'Mejor' : `${comparison.vsLow.toFixed(1)}% más alto`}
                </span>
              </div>
            </div>
          </div>

          {comparison.improvementPotential > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-teal-900 mb-1">Potencial de Mejora</div>
              <div className="text-2xl font-bold text-teal-600">{comparison.improvementPotential.toFixed(1)}%</div>
              <div className="text-sm text-teal-700 mt-1">
                Reducción potencial si alcanzas el siguiente nivel de desempeño
              </div>
            </div>
          )}

          <button
            onClick={exportReport}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>
      )}
    </div>
  )
}

