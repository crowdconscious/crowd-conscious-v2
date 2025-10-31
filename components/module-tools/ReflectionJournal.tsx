'use client'

import { useState } from 'react'
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react'

interface ReflectionJournalProps {
  prompts: string[]
  onSave?: (reflection: ReflectionData) => void
  minWords?: number
  showWordCount?: boolean
  label?: string
  className?: string
}

interface ReflectionData {
  responses: { [key: number]: string }
  wordCount: number
  completedAt: string
}

export default function ReflectionJournal({
  prompts,
  onSave,
  minWords = 50,
  showWordCount = true,
  label = "Reflexión Personal",
  className = ''
}: ReflectionJournalProps) {
  const [responses, setResponses] = useState<{ [key: number]: string }>(
    prompts.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {})
  )
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getTotalWordCount = () => {
    return Object.values(responses).reduce((total, response) => {
      return total + countWords(response)
    }, 0)
  }

  const handleSave = () => {
    const totalWords = getTotalWordCount()
    
    if (totalWords < minWords) {
      setError(`Por favor escribe al menos ${minWords} palabras en total. Actualmente: ${totalWords} palabras.`)
      return
    }

    // Check if all prompts have responses
    const emptyResponses = prompts.filter((_, i) => !responses[i]?.trim())
    if (emptyResponses.length > 0) {
      setError('Por favor responde a todas las preguntas.')
      return
    }

    const reflectionData: ReflectionData = {
      responses,
      wordCount: totalWords,
      completedAt: new Date().toISOString()
    }

    setSaved(true)
    setError(null)

    if (onSave) {
      onSave(reflectionData)
    }
  }

  const handleReset = () => {
    setResponses(prompts.reduce((acc, _, i) => ({ ...acc, [i]: '' }), {}))
    setSaved(false)
    setError(null)
  }

  const totalWords = getTotalWordCount()
  const progress = Math.min((totalWords / minWords) * 100, 100)

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-amber-900">{label}</h3>
          <p className="text-xs sm:text-sm text-amber-700">Documenta tus aprendizajes y compromisos</p>
        </div>
      </div>

      {!saved ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Prompts */}
          {prompts.map((prompt, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-amber-900 mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-amber-200 text-amber-900 rounded-full text-xs font-bold mr-2">
                  {index + 1}
                </span>
                {prompt}
              </label>
              <textarea
                value={responses[index] || ''}
                onChange={(e) => {
                  setResponses({ ...responses, [index]: e.target.value })
                  setError(null)
                }}
                className="w-full px-3 sm:px-4 py-3 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none min-h-[100px] sm:min-h-[120px] resize-y text-sm sm:text-base"
                placeholder="Escribe tu respuesta aquí..."
              />
              {showWordCount && (
                <div className="text-xs text-amber-600 mt-1">
                  {countWords(responses[index] || '')} palabras
                </div>
              )}
            </div>
          ))}

          {/* Word Count Progress */}
          {showWordCount && (
            <div className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-medium text-amber-900">
                  Progreso de Escritura
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-700">
                  {totalWords} / {minWords} palabras
                </span>
              </div>
              <div className="w-full bg-amber-100 rounded-full h-2 sm:h-3">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 sm:h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {totalWords < minWords && (
                <div className="text-xs text-amber-600 mt-2">
                  Faltan {minWords - totalWords} palabras para completar
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border-2 border-red-200 rounded-lg p-3 text-xs sm:text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Tips */}
          <div className="bg-amber-100 rounded-lg p-3 text-xs sm:text-sm text-amber-800">
            <strong>✍️ Consejos para una buena reflexión:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Sé específico y concreto en tus respuestas</li>
              <li>Conecta los conceptos con tu experiencia personal</li>
              <li>Identifica acciones concretas que puedes tomar</li>
              <li>Comparte tus dudas o desafíos</li>
            </ul>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={totalWords < minWords}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 sm:py-4 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed min-h-[44px]"
          >
            {totalWords < minWords ? 
              `Escribe ${minWords - totalWords} palabras más` : 
              'Guardar Reflexión'
            }
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-white rounded-xl p-6 sm:p-8 text-center border-2 border-green-300">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
            <h4 className="text-lg sm:text-xl font-bold text-green-900 mb-2">
              ¡Reflexión Guardada!
            </h4>
            <p className="text-sm sm:text-base text-green-700 mb-1">
              Has escrito <strong>{totalWords} palabras</strong>
            </p>
            <p className="text-xs sm:text-sm text-green-600">
              Tu reflexión ha sido guardada exitosamente
            </p>
          </div>

          {/* Review Responses */}
          <div className="bg-white rounded-lg p-4 sm:p-6 space-y-4">
            <h4 className="font-bold text-amber-900 text-sm sm:text-base mb-3">
              📝 Tu Reflexión:
            </h4>
            {prompts.map((prompt, index) => (
              <div key={index} className="border-l-4 border-amber-300 pl-3 sm:pl-4">
                <div className="text-xs sm:text-sm font-medium text-amber-700 mb-1">
                  {prompt}
                </div>
                <div className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">
                  {responses[index]}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Button */}
          <button
            onClick={handleReset}
            className="w-full bg-amber-100 text-amber-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-amber-200 transition-colors min-h-[44px]"
          >
            Editar Reflexión
          </button>
        </div>
      )}
    </div>
  )
}

