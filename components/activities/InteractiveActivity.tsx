'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Upload, Save } from 'lucide-react'

interface ActivityQuestion {
  id: string
  type: 'text' | 'textarea' | 'multiple_choice' | 'checkbox' | 'rating' | 'file_upload'
  question: string
  options?: string[]
  required?: boolean
  placeholder?: string
}

interface InteractiveActivityProps {
  activity: {
    title: string
    description: string
    instructions?: string[]
    reflectionPrompts?: string[]
    successCriteria?: string[]
  }
  moduleId: string
  lessonId: string
  enrollmentId: string
  activityType: string
  onComplete?: () => void
}

export default function InteractiveActivity({
  activity,
  moduleId,
  lessonId,
  enrollmentId,
  activityType,
  onComplete
}: InteractiveActivityProps) {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [startTime] = useState(Date.now())

  // Load existing responses
  useEffect(() => {
    loadExistingResponses()
  }, [lessonId])

  const loadExistingResponses = async () => {
    try {
      const response = await fetch(`/api/activities/save-response?lesson_id=${lessonId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.response) {
          setResponses(data.response.responses || {})
        }
      }
    } catch (error) {
      console.error('Error loading responses:', error)
    }
  }

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
    setSaved(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setEvidenceFiles(prev => [...prev, ...newFiles])
    }
  }

  const uploadEvidence = async (): Promise<string[]> => {
    if (evidenceFiles.length === 0) return []

    setUploading(true)
    try {
      const formData = new FormData()
      evidenceFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('moduleId', moduleId)
      formData.append('lessonId', lessonId)

      const response = await fetch('/api/activities/upload-evidence', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        return data.urls || []
      }
      return []
    } catch (error) {
      console.error('Error uploading files:', error)
      return []
    } finally {
      setUploading(false)
    }
  }

  const saveResponses = async () => {
    setSaving(true)
    try {
      // Upload evidence files first
      const evidenceUrls = await uploadEvidence()

      // Calculate time spent
      const timeSpentMinutes = Math.floor((Date.now() - startTime) / 60000)

      // Calculate completion percentage
      const totalQuestions = Object.keys(generateQuestions()).length
      const answeredQuestions = Object.keys(responses).filter(key => {
        const value = responses[key]
        return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '')
      }).length
      const completionPercentage = Math.round((answeredQuestions / totalQuestions) * 100)

      const response = await fetch('/api/activities/save-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: enrollmentId,
          module_id: moduleId,
          lesson_id: lessonId,
          activity_type: activityType,
          responses,
          evidence_urls: evidenceUrls,
          completion_data: {
            completion_percentage: completionPercentage,
            time_spent_minutes: timeSpentMinutes,
            questions_answered: answeredQuestions,
            total_questions: totalQuestions
          }
        })
      })

      if (response.ok) {
        setSaved(true)
        
        // Show success notification
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3'
        successDiv.innerHTML = `
          <span class="text-2xl">✅</span>
          <span class="font-bold">Respuestas guardadas exitosamente</span>
        `
        document.body.appendChild(successDiv)
        setTimeout(() => successDiv.remove(), 3000)

        if (onComplete && completionPercentage === 100) {
          onComplete()
        }
      }
    } catch (error) {
      console.error('Error saving responses:', error)
      alert('Error al guardar respuestas. Por favor, intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // Generate questions from activity data
  const generateQuestions = (): ActivityQuestion[] => {
    const questions: ActivityQuestion[] = []

    // Add reflection prompts as textarea questions
    if (activity.reflectionPrompts && activity.reflectionPrompts.length > 0) {
      activity.reflectionPrompts.forEach((prompt, index) => {
        questions.push({
          id: `reflection_${index}`,
          type: 'textarea',
          question: prompt,
          required: true,
          placeholder: 'Escribe tu reflexión aquí...'
        })
      })
    }

    // Add success criteria as checklist
    if (activity.successCriteria && activity.successCriteria.length > 0) {
      questions.push({
        id: 'success_criteria_checklist',
        type: 'checkbox',
        question: '¿Qué criterios de éxito has completado?',
        options: activity.successCriteria,
        required: false
      })
    }

    // Add file upload for evidence
    questions.push({
      id: 'evidence_upload',
      type: 'file_upload',
      question: 'Sube evidencia de tu trabajo (fotos, documentos, etc.)',
      required: false
    })

    return questions
  }

  const questions = generateQuestions()

  return (
    <div className="space-y-6">
      {/* Activity Header */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
        <h3 className="font-bold text-orange-900 text-xl mb-3">{activity.title}</h3>
        <p className="text-orange-800 mb-4">{activity.description}</p>
        
        {/* Instructions */}
        {activity.instructions && activity.instructions.length > 0 && (
          <div className="mt-4">
            <h4 className="font-bold text-orange-900 mb-2">📋 Instrucciones:</h4>
            <ol className="space-y-2 list-decimal list-inside text-orange-900">
              {activity.instructions.map((instruction, index) => (
                <li key={index} className="text-sm">{instruction}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Interactive Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <label className="block font-semibold text-slate-900 mb-3">
              {index + 1}. {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Text Input */}
            {question.type === 'text' && (
              <input
                type="text"
                value={responses[question.id] || ''}
                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-teal-500 focus:outline-none"
              />
            )}

            {/* Textarea */}
            {question.type === 'textarea' && (
              <textarea
                value={responses[question.id] || ''}
                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                placeholder={question.placeholder}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-teal-500 focus:outline-none resize-none"
              />
            )}

            {/* Multiple Choice */}
            {question.type === 'multiple_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, optIndex) => (
                  <label key={optIndex} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={responses[question.id] === option}
                      onChange={(e) => handleResponseChange(question.id, e.target.value)}
                      className="w-5 h-5 text-teal-600"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Checkbox */}
            {question.type === 'checkbox' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, optIndex) => {
                  const selectedOptions = responses[question.id] || []
                  return (
                    <label key={optIndex} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(option)}
                        onChange={(e) => {
                          const newSelection = e.target.checked
                            ? [...selectedOptions, option]
                            : selectedOptions.filter((item: string) => item !== option)
                          handleResponseChange(question.id, newSelection)
                        }}
                        className="w-5 h-5 text-teal-600 rounded"
                      />
                      <span className="text-slate-700">{option}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* File Upload */}
            {question.type === 'file_upload' && (
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id={`file-upload-${question.id}`}
                />
                <label
                  htmlFor={`file-upload-${question.id}`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  Seleccionar Archivos
                </label>
                
                {evidenceFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Archivos seleccionados ({evidenceFiles.length}):
                    </p>
                    {evidenceFiles.map((file, fileIndex) => (
                      <div key={fileIndex} className="text-sm text-slate-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="sticky bottom-4 bg-white border-2 border-slate-200 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {saved ? (
              <span className="flex items-center gap-2 text-green-600 font-semibold">
                <CheckCircle className="w-5 h-5" />
                Respuestas guardadas
              </span>
            ) : (
              <span>
                {Object.keys(responses).filter(k => responses[k]).length} de {questions.length} preguntas respondidas
              </span>
            )}
          </div>
          
          <button
            onClick={saveResponses}
            disabled={saving || uploading}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving || uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {uploading ? 'Subiendo archivos...' : 'Guardando...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Respuestas
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

