'use client'

import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface QualityFeedbackProps {
  validation: {
    errors: string[]
    warnings: string[]
    score: number
    minimumRequired?: number
  }
  className?: string
}

/**
 * Quality Control Feedback Component
 * 
 * Shows users why their responses didn't pass quality control
 * and what they need to do to improve
 */
export default function QualityFeedback({ validation, className = '' }: QualityFeedbackProps) {
  const { errors, warnings, score, minimumRequired = 70 } = validation

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className={`bg-green-50 border-2 border-green-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-900 text-lg mb-2">
              ✅ Respuesta de Calidad Aceptable
            </h3>
            <p className="text-green-700">
              Tu respuesta cumple con los estándares de calidad. ¡Buen trabajo!
            </p>
            {score >= 90 && (
              <p className="text-green-600 text-sm mt-2 font-medium">
                🌟 ¡Excelente! Respuesta muy completa (Puntuación: {score}/100)
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Card */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-lg mb-2">
                ⚠️ Respuesta Insuficiente
              </h3>
              <p className="text-red-700 mb-4">
                Tu respuesta no cumple con los estándares mínimos de calidad. 
                Por favor completa lo siguiente:
              </p>
              
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2 text-red-700">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>

              {/* Quality Score */}
              <div className="mt-6 pt-4 border-t border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-900">
                    Puntuación de Calidad
                  </span>
                  <span className={`text-sm font-bold ${
                    score >= minimumRequired ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {score}/{minimumRequired} requerido
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-red-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      score >= minimumRequired ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
                
                <p className="text-xs text-red-600 mt-2">
                  {score < minimumRequired 
                    ? `Necesitas ${minimumRequired - score} puntos más para continuar`
                    : '¡Puntuación suficiente!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Card */}
      {warnings.length > 0 && errors.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Info className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 text-lg mb-2">
                💡 Sugerencias para Mejorar
              </h3>
              <ul className="space-y-2">
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2 text-yellow-700">
                    <span className="text-yellow-500">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Tips */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Tips para Respuestas de Calidad
        </h4>
        <ul className="space-y-2 text-blue-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Reflexiona con profundidad:</strong> No copies/pegues. Usa tus propias palabras.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Sé específico:</strong> Da ejemplos concretos de tu empresa o experiencia.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Aplica lo aprendido:</strong> Explica cómo usarás esto en tu trabajo.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">✓</span>
            <span><strong>Completa todas las secciones:</strong> Cada parte es importante para el aprendizaje.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

/**
 * Compact version for inline feedback
 */
export function CompactQualityFeedback({ validation }: { validation: any }) {
  const { errors, score, minimumRequired = 70 } = validation

  if (!errors || errors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>Calidad aceptable ({score}/100)</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-red-600 text-sm">
      <AlertCircle className="w-4 h-4" />
      <span>Respuesta insuficiente ({score}/{minimumRequired})</span>
    </div>
  )
}

