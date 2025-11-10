'use client'

import { useState, useEffect } from 'react'
import { Wind, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

interface AirQualityAssessmentProps {
  onComplete?: (result: AssessmentResult) => void
  className?: string
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

interface AssessmentResult {
  score: number // 0-100
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  issues: string[]
  recommendations: string[]
  estimatedPM25: number // Estimated PM2.5 level
  answers: {
    windows: number
    ventilationFrequency: string
    plants: number
    hasFilter: boolean
    proximityToRoad: string
    occupants: number
  }
}

export default function AirQualityAssessment({
  onComplete,
  className = '',
  enrollmentId,
  moduleId,
  lessonId
}: AirQualityAssessmentProps) {
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState({
    windows: 0,
    ventilationFrequency: '',
    plants: 0,
    hasFilter: false,
    proximityToRoad: '',
    occupants: 0
  })
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [completed, setCompleted] = useState(false)
  
  // ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()
  
  // Load previous assessment data if available
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'air-quality-assessment'
        })
        
        if (savedData && savedData.answers) {
          setAnswers(savedData.answers)
          if (savedData.score) {
            setResult(savedData)
            setCompleted(true)
          }
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const calculateScore = async () => {
    let score = 50 // Base score

    // Windows (0-15 points)
    score += Math.min(answers.windows * 3, 15)

    // Ventilation frequency (0-20 points)
    const ventilationPoints: Record<string, number> = {
      'never': 0,
      'rarely': 5,
      'sometimes': 10,
      'frequently': 15,
      'always': 20
    }
    score += ventilationPoints[answers.ventilationFrequency] || 0

    // Plants (0-10 points)
    score += Math.min(answers.plants * 2, 10)

    // Air filter (0-15 points)
    if (answers.hasFilter) score += 15

    // Proximity to road (penalty or bonus)
    const roadImpact: Record<string, number> = {
      'very-close': -20, // <50m
      'close': -10, // 50-100m
      'moderate': -5, // 100-200m
      'far': 0, // >200m
      'very-far': 5 // >500m
    }
    score += roadImpact[answers.proximityToRoad] || 0

    // Occupancy density (penalty if overcrowded)
    const spacePerPerson = answers.windows * 10 / answers.occupants // Rough estimate
    if (spacePerPerson < 5) score -= 10
    else if (spacePerPerson < 10) score -= 5

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score))

    // Determine rating
    let rating: AssessmentResult['rating']
    if (score >= 80) rating = 'excellent'
    else if (score >= 60) rating = 'good'
    else if (score >= 40) rating = 'fair'
    else if (score >= 20) rating = 'poor'
    else rating = 'critical'

    // Estimate PM2.5 (inverse of score, scaled)
    const estimatedPM25 = Math.round(150 - (score * 1.3))

    // Generate issues
    const issues: string[] = []
    if (answers.windows < 2) issues.push('Pocas ventanas para ventilación natural')
    if (answers.ventilationFrequency === 'never' || answers.ventilationFrequency === 'rarely') {
      issues.push('Ventilación insuficiente')
    }
    if (answers.plants === 0) issues.push('Sin plantas purificadoras de aire')
    if (!answers.hasFilter) issues.push('No hay sistema de filtración de aire')
    if (answers.proximityToRoad === 'very-close' || answers.proximityToRoad === 'close') {
      issues.push('Proximidad alta a fuentes de contaminación')
    }

    // Generate recommendations
    const recommendations: string[] = []
    if (answers.windows < 3) recommendations.push('Aumentar ventilación: abrir ventanas cada hora por 10 minutos')
    if (answers.plants < 5) recommendations.push(`Agregar ${5 - answers.plants} plantas purificadoras (Pothos, Sansevieria)`)
    if (!answers.hasFilter) recommendations.push('Instalar filtros HEPA portátiles en áreas clave')
    if (score < 60) recommendations.push('Realizar auditoría profesional de calidad del aire')
    recommendations.push('Medir PM2.5 con monitor de calidad del aire')

    const assessmentResult: AssessmentResult = {
      score,
      rating,
      issues,
      recommendations,
      estimatedPM25,
      answers
    }

    setResult(assessmentResult)
    setCompleted(true)
    
    // 💾 Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'air-quality-assessment',
        tool_data: assessmentResult,
        tool_type: 'assessment'
      })
    }

    if (onComplete) {
      onComplete(assessmentResult)
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-teal-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-slate-600'
    }
  }

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'Excelente'
      case 'good': return 'Buena'
      case 'fair': return 'Regular'
      case 'poor': return 'Mala'
      case 'critical': return 'Crítica'
      default: return 'Desconocida'
    }
  }

  if (completed && result) {
    return (
      <div className={`bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-sky-900">Evaluación Completa</h3>
            <p className="text-xs sm:text-sm text-sky-700">Resultados de tu espacio</p>
          </div>
        </div>

        {/* Score */}
        <div className="bg-white rounded-xl p-4 sm:p-6 mb-4 text-center border-2 border-sky-300">
          <div className={`text-5xl sm:text-6xl font-bold mb-2 ${getRatingColor(result.rating)}`}>
            {result.score}
          </div>
          <div className="text-base sm:text-lg font-medium text-slate-900 mb-1">
            Calidad del Aire: <span className={getRatingColor(result.rating)}>{getRatingLabel(result.rating)}</span>
          </div>
          <div className="text-xs sm:text-sm text-slate-600">
            PM2.5 estimado: <strong>{result.estimatedPM25} μg/m³</strong>
            {result.estimatedPM25 > 50 && <span className="text-orange-600"> (⚠️ Por encima del límite recomendado)</span>}
          </div>
        </div>

        {/* Issues */}
        {result.issues.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-red-900 text-sm sm:text-base">Problemas Identificados:</h4>
            </div>
            <ul className="space-y-2">
              {result.issues.map((issue, i) => (
                <li key={i} className="text-xs sm:text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-500 flex-shrink-0">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-green-900 text-sm sm:text-base">Recomendaciones:</h4>
          </div>
          <ul className="space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => {
            setCompleted(false)
            setResult(null)
            setStep(1)
            setAnswers({
              windows: 0,
              ventilationFrequency: '',
              plants: 0,
              hasFilter: false,
              proximityToRoad: '',
              occupants: 0
            })
          }}
          className="w-full mt-4 bg-sky-100 text-sky-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-sky-200 transition-colors min-h-[44px]"
        >
          Hacer Nueva Evaluación
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-sky-50 to-blue-50 border-2 border-sky-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Wind className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-sky-900">Evaluación de Calidad del Aire</h3>
          <p className="text-xs sm:text-sm text-sky-700">Responde 6 preguntas sobre tu espacio</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs sm:text-sm text-sky-700 mb-2">
          <span>Pregunta {step} de 6</span>
          <span>{Math.round((step / 6) * 100)}%</span>
        </div>
        <div className="w-full bg-sky-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-sky-500 to-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {step === 1 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              1. ¿Cuántas ventanas hay en tu espacio de trabajo?
            </label>
            <input
              type="number"
              value={answers.windows || ''}
              onChange={(e) => setAnswers({ ...answers, windows: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border-2 border-sky-200 focus:border-sky-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 4"
              min="0"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              2. ¿Con qué frecuencia se ventila el espacio?
            </label>
            <select
              value={answers.ventilationFrequency}
              onChange={(e) => setAnswers({ ...answers, ventilationFrequency: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-sky-200 focus:border-sky-500 focus:outline-none text-sm sm:text-base"
            >
              <option value="">Selecciona...</option>
              <option value="never">Nunca</option>
              <option value="rarely">Rara vez (1-2 veces/semana)</option>
              <option value="sometimes">A veces (3-4 veces/semana)</option>
              <option value="frequently">Frecuentemente (1-2 veces/día)</option>
              <option value="always">Siempre (cada hora)</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              3. ¿Cuántas plantas hay en el espacio?
            </label>
            <input
              type="number"
              value={answers.plants || ''}
              onChange={(e) => setAnswers({ ...answers, plants: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border-2 border-sky-200 focus:border-sky-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 5"
              min="0"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              4. ¿Hay sistema de filtración de aire (HEPA, AC con filtro)?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAnswers({ ...answers, hasFilter: true })}
                className={`py-3 rounded-lg border-2 font-medium transition-all text-sm sm:text-base ${
                  answers.hasFilter
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-sky-200 text-slate-700 hover:border-sky-300'
                }`}
              >
                Sí
              </button>
              <button
                onClick={() => setAnswers({ ...answers, hasFilter: false })}
                className={`py-3 rounded-lg border-2 font-medium transition-all text-sm sm:text-base ${
                  !answers.hasFilter && answers.hasFilter !== undefined
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-sky-200 text-slate-700 hover:border-sky-300'
                }`}
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              5. ¿Qué tan cerca está el espacio de calles principales/industrias?
            </label>
            <select
              value={answers.proximityToRoad}
              onChange={(e) => setAnswers({ ...answers, proximityToRoad: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-sky-200 focus:border-sky-500 focus:outline-none text-sm sm:text-base"
            >
              <option value="">Selecciona...</option>
              <option value="very-close">Muy cerca (&lt;50m)</option>
              <option value="close">Cerca (50-100m)</option>
              <option value="moderate">Moderado (100-200m)</option>
              <option value="far">Lejos (&gt;200m)</option>
              <option value="very-far">Muy lejos (&gt;500m)</option>
            </select>
          </div>
        )}

        {step === 6 && (
          <div>
            <label className="block text-sm font-medium text-sky-900 mb-3">
              6. ¿Cuántas personas ocupan regularmente el espacio?
            </label>
            <input
              type="number"
              value={answers.occupants || ''}
              onChange={(e) => setAnswers({ ...answers, occupants: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-lg border-2 border-sky-200 focus:border-sky-500 focus:outline-none text-sm sm:text-base"
              placeholder="Ej: 20"
              min="1"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 bg-sky-100 text-sky-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-sky-200 transition-colors min-h-[44px]"
          >
            Anterior
          </button>
        )}
        
        {step < 6 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={
              (step === 1 && answers.windows === 0) ||
              (step === 2 && !answers.ventilationFrequency) ||
              (step === 5 && !answers.proximityToRoad) ||
              (step === 6 && answers.occupants === 0)
            }
            className="flex-1 bg-gradient-to-r from-sky-600 to-blue-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={calculateScore}
            disabled={answers.occupants === 0}
            className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Ver Resultados
          </button>
        )}
      </div>
    </div>
  )
}

