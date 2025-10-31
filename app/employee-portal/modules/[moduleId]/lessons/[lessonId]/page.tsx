'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, Award, Lightbulb, BookOpen, Target, ExternalLink } from 'lucide-react'
import { cleanAirModule, getLessonById } from '@/app/lib/course-content/clean-air-module'

export default function LessonPage({ 
  params 
}: { 
  params: Promise<{ moduleId: string; lessonId: string }> 
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [activityCompleted, setActivityCompleted] = useState(false)
  const [activityData, setActivityData] = useState<any>({})
  const [moduleId, setModuleId] = useState<string>('')
  const [lessonId, setLessonId] = useState<string>('')
  const [lesson, setLesson] = useState<any>(null)
  const [startTime] = useState(Date.now()) // Track when lesson started

  const module = cleanAirModule

  useEffect(() => {
    params.then((p) => {
      setModuleId(p.moduleId)
      setLessonId(p.lessonId)
      const lessonData = getLessonById(p.moduleId, p.lessonId)
      setLesson(lessonData)
    })
  }, [])

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Lección no encontrada</h1>
          <Link href="/employee-portal/dashboard" className="text-teal-600 hover:text-teal-700">
            Volver al portal
          </Link>
        </div>
      </div>
    )
  }

  const completeLesson = async () => {
    setCompleting(true)
    try {
      const response = await fetch('/api/corporate/progress/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          lessonId,
          xpEarned: lesson.xpReward,
          responses: activityData, // Send activity data as responses
          timeSpent: Math.floor((Date.now() - startTime) / 60000) // Calculate time spent in minutes
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Lesson completed:', data)
        
        // Find next lesson
        const currentIndex = module.lessons.findIndex(l => l.id === lessonId)
        const nextLesson = module.lessons[currentIndex + 1]

        // Force refresh to update progress across the app
        router.refresh()

        if (nextLesson) {
          router.push(`/employee-portal/modules/${moduleId}/lessons/${nextLesson.id}`)
        } else {
          // Module completed
          router.push(`/employee-portal/modules/${moduleId}`)
        }
      } else {
        const error = await response.json()
        console.error('❌ Failed to complete lesson:', error)
        alert(`Error: ${error.error || 'No se pudo completar la lección'}`)
      }
    } catch (error) {
      console.error('❌ Error completing lesson:', error)
      alert('Error al completar la lección. Por favor intenta de nuevo.')
    }
    setCompleting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className={`bg-gradient-to-r ${module.color} text-white py-8 px-4`}>
        <div className="max-w-4xl mx-auto">
          <Link 
            href={moduleId ? `/employee-portal/modules/${moduleId}` : '/employee-portal/dashboard'}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Módulo
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/80 mb-2">
                Lección {lesson.lessonNumber} de {module.totalLessons}
              </div>
              <h1 className="text-3xl font-bold mb-2">{lesson.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span>{lesson.duration}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  +{lesson.xpReward} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Story Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">La Historia</h2>
              <p className="text-slate-600 text-sm">Aprende a través de experiencias reales</p>
            </div>
          </div>

          {/* Introduction */}
          <div className="prose max-w-none mb-6">
            <p className="text-lg text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.introduction}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-4 mb-6">
            {lesson.story.mainContent.map((paragraph: string, index: number) => (
              <p key={index} className="text-slate-700 leading-relaxed whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Conclusion */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-6">
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.conclusion}
            </p>
          </div>

          {/* Character Insight */}
          <div className="bg-gradient-to-r from-teal-50 to-purple-50 border-2 border-teal-200 rounded-xl p-6">
            <div className="text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.characterInsight}
            </div>
          </div>
        </div>

        {/* Learning Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Aprendizajes Clave</h2>
              <p className="text-slate-600 text-sm">Conceptos importantes para recordar</p>
            </div>
          </div>

          {/* Key Points */}
          <div className="mb-6">
            <h3 className="font-bold text-slate-900 mb-4">Puntos Clave:</h3>
            <ul className="space-y-3">
              {lesson.learning.keyPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Did You Know */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-blue-900 mb-4">💡 ¿Sabías Que...?</h3>
            <ul className="space-y-2">
              {lesson.learning.didYouKnow.map((fact: string, index: number) => (
                <li key={index} className="text-blue-800">{fact}</li>
              ))}
            </ul>
          </div>

          {/* Real World Example */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="font-bold text-green-900 mb-3">🌍 Ejemplo del Mundo Real</h3>
            <div className="text-green-800 whitespace-pre-line">
              {lesson.learning.realWorldExample}
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Actividad Práctica</h2>
              <p className="text-slate-600 text-sm">{lesson.activity.title}</p>
            </div>
          </div>

          <p className="text-slate-700 mb-6">{lesson.activity.description}</p>

          {!showActivity ? (
            <button
              onClick={() => setShowActivity(true)}
              className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
            >
              Comenzar Actividad
            </button>
          ) : (
            <div className="space-y-4">
              {/* Activity Content - Reflection Prompts */}
              {lesson.activity.reflectionPrompts && (
                <div className="space-y-4">
                  {lesson.activity.reflectionPrompts.map((prompt: string, index: number) => (
                    <div key={index} className="border-2 border-slate-200 rounded-xl p-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {prompt}
                      </label>
                      <textarea
                        className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none min-h-[100px]"
                        placeholder="Escribe tu respuesta aquí..."
                        onChange={(e) => setActivityData({
                          ...activityData,
                          [`prompt_${index}`]: e.target.value
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Calculator Inputs */}
              {lesson.activity.calculatorInputs && (
                <div className="space-y-4">
                  {lesson.activity.calculatorInputs.map((input: any, index: number) => (
                    <div key={index} className="border-2 border-slate-200 rounded-xl p-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {input.label}
                      </label>
                      {input.type === 'number' && (
                        <input
                          type="number"
                          className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                          placeholder={`Ej: 5 ${input.unit}`}
                          onChange={(e) => setActivityData({
                            ...activityData,
                            [`input_${index}`]: e.target.value
                          })}
                        />
                      )}
                      {input.type === 'select' && (
                        <select
                          className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
                          onChange={(e) => setActivityData({
                            ...activityData,
                            [`input_${index}`]: e.target.value
                          })}
                        >
                          <option value="">Seleccionar...</option>
                          <option value="low">Bajo</option>
                          <option value="medium">Medio</option>
                          <option value="high">Alto</option>
                        </select>
                      )}
                      {input.type === 'boolean' && (
                        <div className="flex gap-4">
                          <button
                            onClick={() => setActivityData({
                              ...activityData,
                              [`input_${index}`]: 'yes'
                            })}
                            className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                              activityData[`input_${index}`] === 'yes'
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 text-slate-700 hover:border-teal-300'
                            }`}
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setActivityData({
                              ...activityData,
                              [`input_${index}`]: 'no'
                            })}
                            className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                              activityData[`input_${index}`] === 'no'
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-slate-200 text-slate-700 hover:border-teal-300'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!activityCompleted ? (
                <button
                  onClick={() => {
                    setActivityCompleted(true)
                    // Scroll to complete lesson button
                    setTimeout(() => {
                      const completeLessonButton = document.querySelector('[data-complete-lesson]')
                      completeLessonButton?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }, 100)
                  }}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform mt-6"
                >
                  Completar Actividad
                </button>
              ) : (
                <div className="w-full bg-teal-50 border-2 border-teal-500 text-teal-700 py-4 rounded-xl font-bold text-lg mt-6 flex items-center justify-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  ¡Actividad Completada! Ahora completa la lección abajo ↓
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resources */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Recursos Adicionales</h2>
            <div className="grid gap-4">
              {lesson.resources.map((resource: any, index: number) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all group"
                >
                  <div>
                    <div className="font-medium text-slate-900 group-hover:text-teal-700">
                      {resource.title}
                    </div>
                    <div className="text-sm text-slate-600 capitalize">
                      {resource.type}
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-teal-600" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Próximos Pasos</h2>
          <ul className="space-y-3">
            {lesson.nextSteps.map((step: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {index + 1}
                </div>
                <span className="text-slate-700">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Complete Lesson Button */}
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 rounded-2xl p-8 text-center text-white shadow-xl">
          <Award className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¿Listo para Continuar?</h2>
          <p className="mb-6 text-white/90">
            Completa esta lección para ganar {lesson.xpReward} XP y desbloquear el siguiente contenido
          </p>
          <button
            onClick={completeLesson}
            disabled={completing || (!activityCompleted && showActivity)}
            data-complete-lesson
            className="bg-white text-teal-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center gap-2 mx-auto"
          >
            {completing ? (
              'Completando...'
            ) : (
              <>
                Completar Lección
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          {showActivity && !activityCompleted && (
            <p className="text-sm text-white/80 mt-4">
              Completa la actividad práctica para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

