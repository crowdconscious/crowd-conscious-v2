'use client'

import { useState } from 'react'
import { Heart, Users, Sparkles, TrendingUp } from 'lucide-react'

interface AirQualityImpactProps {
  beforePM25?: number
  afterPM25?: number
  employees?: number
  onCalculate?: (result: ImpactResult) => void
  className?: string
}

interface ImpactResult {
  pm25Reduction: number
  reductionPercent: number
  healthImpact: {
    lifeYearsGained: number
    respiratoryIssuesAvoided: number
    asthmaReductionPercent: number
    heartDisease ReductionPercent: number
  }
  equivalents: {
    smokingCigarettes: number
    treesPlanted: number
    carTripsSaved: number
    cleanAirDays: number
  }
  employeeWellbeing: {
    betterSleep: number
    lessFatigue: number
    improvedMood: number
  }
}

export default function AirQualityImpact({
  beforePM25: initialBefore,
  afterPM25: initialAfter,
  employees: initialEmployees,
  onCalculate,
  className = ''
}: AirQualityImpactProps) {
  const [inputs, setInputs] = useState({
    beforePM25: initialBefore?.toString() || '',
    afterPM25: initialAfter?.toString() || '',
    employees: initialEmployees?.toString() || ''
  })
  const [result, setResult] = useState<ImpactResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    const before = parseFloat(inputs.beforePM25) || 0
    const after = parseFloat(inputs.afterPM25) || 0
    const employees = parseInt(inputs.employees) || 0

    const pm25Reduction = before - after
    const reductionPercent = before > 0 ? (pm25Reduction / before) * 100 : 0

    // Health impact calculations (based on WHO and EPA research)
    // For every 10 μg/m³ reduction in PM2.5, mortality decreases by ~6-8%
    const mortalityReductionFactor = 0.07 // 7% per 10 μg/m³
    const lifeYearsGainedPerPerson = (pm25Reduction / 10) * mortalityReductionFactor * 2 // ~2 years at max
    const lifeYearsGained = lifeYearsGainedPerPerson * employees

    // Respiratory issues (30% reduction for good air quality)
    const respiratoryIssuesAvoided = Math.round(employees * 0.3)

    // Specific conditions
    const asthmaReductionPercent = Math.min(35, reductionPercent * 1.2) // Up to 35%
    const heartDiseaseReductionPercent = Math.min(25, reductionPercent * 0.8) // Up to 25%

    // Equivalents
    // Smoking: PM2.5 of 22 μg/m³ ≈ smoking 1 cigarette per day
    const smokingCigarettes = Math.round((pm25Reduction / 22) * 365) // Annual cigarettes avoided

    // Trees: One mature tree absorbs ~20kg CO₂/year, indirectly affecting air quality
    const treesPlanted = Math.round(pm25Reduction * employees / 5)

    // Car trips: Average car trip (25km) produces ~4.6kg CO₂
    const carTripsSaved = Math.round((pm25Reduction * employees) / 2)

    // Clean air days: Days meeting WHO guidelines (15 μg/m³)
    const cleanAirDays = after <= 15 ? 365 : Math.round((365 * reductionPercent) / 100)

    // Employee wellbeing (% of employees experiencing improvements)
    const betterSleep = Math.round(employees * 0.62) // 62% report better sleep
    const lessFatigue = Math.round(employees * 0.71) // 71% report less fatigue
    const improvedMood = Math.round(employees * 0.68) // 68% report better mood

    const calculatedResult: ImpactResult = {
      pm25Reduction,
      reductionPercent,
      healthImpact: {
        lifeYearsGained,
        respiratoryIssuesAvoided,
        asthmaReductionPercent,
        heartDiseaseReductionPercent
      },
      equivalents: {
        smokingCigarettes,
        treesPlanted,
        carTripsSaved,
        cleanAirDays
      },
      employeeWellbeing: {
        betterSleep,
        lessFatigue,
        improvedMood
      }
    }

    setResult(calculatedResult)
    setCalculated(true)

    if (onCalculate) {
      onCalculate(calculatedResult)
    }
  }

  const reset = () => {
    setInputs({
      beforePM25: '',
      afterPM25: '',
      employees: ''
    })
    setResult(null)
    setCalculated(false)
  }

  const getAirQualityLevel = (pm25: number) => {
    if (pm25 <= 12) return { label: 'Excelente', color: 'text-green-600' }
    if (pm25 <= 35) return { label: 'Buena', color: 'text-teal-600' }
    if (pm25 <= 55) return { label: 'Moderada', color: 'text-yellow-600' }
    if (pm25 <= 150) return { label: 'Mala', color: 'text-orange-600' }
    return { label: 'Muy Mala', color: 'text-red-600' }
  }

  return (
    <div className={`bg-gradient-to-br from-cyan-50 to-sky-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-cyan-900">Tu Huella de Aire Limpio</h3>
          <p className="text-xs sm:text-sm text-cyan-700">Impacto real en salud y bienestar</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-cyan-900 mb-2">
              📊 PM2.5 Inicial (antes de mejoras)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={inputs.beforePM25}
                onChange={(e) => setInputs({ ...inputs, beforePM25: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-sm sm:text-base"
                placeholder="Ej: 85"
              />
              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-cyan-600 text-xs sm:text-sm">
                μg/m³
              </span>
            </div>
            {inputs.beforePM25 && (
              <p className={`text-xs mt-1 font-medium ${getAirQualityLevel(parseFloat(inputs.beforePM25)).color}`}>
                Calidad inicial: {getAirQualityLevel(parseFloat(inputs.beforePM25)).label}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-900 mb-2">
              ✨ PM2.5 Actual (después de mejoras)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={inputs.afterPM25}
                onChange={(e) => setInputs({ ...inputs, afterPM25: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-sm sm:text-base"
                placeholder="Ej: 35"
              />
              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-cyan-600 text-xs sm:text-sm">
                μg/m³
              </span>
            </div>
            {inputs.afterPM25 && (
              <p className={`text-xs mt-1 font-medium ${getAirQualityLevel(parseFloat(inputs.afterPM25)).color}`}>
                Calidad actual: {getAirQualityLevel(parseFloat(inputs.afterPM25)).label}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-900 mb-2">
              👥 Número de Empleados Impactados
            </label>
            <input
              type="number"
              value={inputs.employees}
              onChange={(e) => setInputs({ ...inputs, employees: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 50"
            />
          </div>

          <div className="bg-cyan-100 rounded-lg p-3 text-xs sm:text-sm text-cyan-800">
            <strong>💡 Referencia:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Excelente: 0-12 μg/m³</li>
              <li>Buena: 12-35 μg/m³ (límite OMS)</li>
              <li>Moderada: 35-55 μg/m³</li>
              <li>Mala: 55-150 μg/m³</li>
            </ul>
          </div>

          <button
            onClick={calculate}
            disabled={!inputs.beforePM25 || !inputs.afterPM25 || !inputs.employees}
            className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Ver Mi Impacto
          </button>
        </div>
      ) : result && (
        <div className="space-y-4">
          {/* Main Impact */}
          <div className="bg-white rounded-xl p-4 sm:p-6 text-center border-2 border-cyan-300">
            <div className="text-4xl sm:text-5xl font-bold text-cyan-600 mb-2">
              -{result.pm25Reduction.toFixed(1)}
            </div>
            <div className="text-base sm:text-lg text-cyan-900 font-medium mb-1">
              μg/m³ de PM2.5 Reducido
            </div>
            <div className="text-xs sm:text-sm text-cyan-700">
              {result.reductionPercent.toFixed(0)}% de mejora en calidad del aire
            </div>
          </div>

          {/* Health Impact */}
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-xl p-4 sm:p-6">
            <h4 className="font-bold text-pink-900 mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              Impacto en Salud
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                  {result.healthImpact.lifeYearsGained.toFixed(1)}
                </div>
                <div className="text-xs sm:text-sm text-pink-700">Años de vida ganados</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                  {result.healthImpact.respiratoryIssuesAvoided}
                </div>
                <div className="text-xs sm:text-sm text-pink-700">Problemas respiratorios evitados</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                  -{result.healthImpact.asthmaReductionPercent.toFixed(0)}%
                </div>
                <div className="text-xs sm:text-sm text-pink-700">Asma</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl sm:text-2xl font-bold text-pink-600">
                  -{result.healthImpact.heartDiseaseReductionPercent.toFixed(0)}%
                </div>
                <div className="text-xs sm:text-sm text-pink-700">Enfermedad cardíaca</div>
              </div>
            </div>
          </div>

          {/* Equivalents */}
          <div className="bg-white rounded-xl p-4 sm:p-6">
            <h4 className="font-bold text-cyan-900 mb-3 sm:mb-4 text-sm sm:text-base">
              💡 Equivalencias del Mundo Real
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg">
                <div className="text-2xl flex-shrink-0">🚭</div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-cyan-600">
                    {result.equivalents.smokingCigarettes}
                  </div>
                  <div className="text-xs sm:text-sm text-cyan-800">
                    Cigarrillos anuales evitados (por empleado)
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="text-2xl flex-shrink-0">🌳</div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {result.equivalents.treesPlanted}
                  </div>
                  <div className="text-xs sm:text-sm text-green-800">
                    Árboles plantados equivalentes
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl flex-shrink-0">🚗</div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-blue-600">
                    {result.equivalents.carTripsSaved}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-800">
                    Viajes en auto evitados
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl flex-shrink-0">☀️</div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-yellow-600">
                    {result.equivalents.cleanAirDays}
                  </div>
                  <div className="text-xs sm:text-sm text-yellow-800">
                    Días de aire limpio al año
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Wellbeing */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
            <h4 className="font-bold text-purple-900 mb-3 sm:mb-4 text-sm sm:text-base flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Bienestar de Empleados
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-purple-800">😴 Mejor calidad de sueño</span>
                <span className="font-bold text-purple-600 text-sm sm:text-base">
                  {result.employeeWellbeing.betterSleep} empleados (62%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-purple-800">⚡ Menos fatiga</span>
                <span className="font-bold text-purple-600 text-sm sm:text-base">
                  {result.employeeWellbeing.lessFatigue} empleados (71%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-purple-800">😊 Estado de ánimo mejorado</span>
                <span className="font-bold text-purple-600 text-sm sm:text-base">
                  {result.employeeWellbeing.improvedMood} empleados (68%)
                </span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-xl p-4 sm:p-6 text-center">
            <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3" />
            <h4 className="text-base sm:text-lg font-bold mb-2">
              ¡Felicidades por Tu Compromiso!
            </h4>
            <p className="text-xs sm:text-sm text-cyan-100">
              Has mejorado significativamente la calidad del aire de tu espacio.
              Este impacto positivo se multiplica cada día que mantienes estas prácticas.
            </p>
          </div>

          <button
            onClick={reset}
            className="w-full bg-cyan-100 text-cyan-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-cyan-200 transition-colors min-h-[44px]"
          >
            Calcular de Nuevo
          </button>
        </div>
      )}
    </div>
  )
}

