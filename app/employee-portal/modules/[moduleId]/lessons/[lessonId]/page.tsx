'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, Award, Lightbulb, BookOpen, Target, ExternalLink } from 'lucide-react'
import { cleanAirModule, getLessonById } from '@/app/lib/course-content/clean-air-module'
import {
  CarbonCalculator,
  CostCalculator,
  EvidenceUploader,
  ReflectionJournal,
  ImpactComparison
} from '@/components/module-tools'
import ToolModal from './ToolModal'

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
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [impactData, setImpactData] = useState<any>(null)
  const [toolModalOpen, setToolModalOpen] = useState(false)
  const [currentTool, setCurrentTool] = useState<{ type: string; title: string } | null>(null)

  const module = cleanAirModule

  const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111' // Clean Air course ID

  // Save activity data to database
  const saveActivityData = async (activityType: string, data: any) => {
    try {
      const response = await fetch('/api/corporate/progress/save-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: cleanAirCourseId,
          moduleId,
          lessonId,
          activityType,
          activityData: data
        })
      })

      if (!response.ok) {
        console.error('Failed to save activity data')
      } else {
        console.log(`✅ ${activityType} data saved`)
      }
    } catch (error) {
      console.error(`Error saving ${activityType} data:`, error)
    }
  }

  // Upload evidence images
  const uploadEvidence = async (files: any[]) => {
    try {
      const formData = new FormData()
      formData.append('courseId', cleanAirCourseId)
      formData.append('moduleId', moduleId)
      formData.append('lessonId', lessonId)

      files.forEach(fileData => {
        formData.append('files', fileData.file)
      })

      const response = await fetch('/api/corporate/progress/upload-evidence', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Evidence uploaded:', result.uploadedUrls)
        return result.uploadedUrls
      } else {
        console.error('Failed to upload evidence')
        return []
      }
    } catch (error) {
      console.error('Error uploading evidence:', error)
      return []
    }
  }

  // Handle tool resource clicks
  const handleToolClick = (resource: any) => {
    // Check if this is a tool resource (type === 'tool' or url starts with 'tool:')
    if (resource.type === 'tool' || resource.url?.startsWith('tool:')) {
      const toolType = resource.url?.replace('tool:', '') || 'unknown'
      setCurrentTool({ type: toolType, title: resource.title })
      setToolModalOpen(true)
      return true
    }
    return false
  }

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
        const currentIndex = module.lessons.findIndex((l: any) => l.id === lessonId)
        const nextLesson = module.lessons[currentIndex + 1]

        // Show success message briefly
        const successMsg = data.moduleComplete 
          ? '🎉 ¡Módulo Completado! Redirigiendo...' 
          : `✅ Lección completada! +${data.xpEarned || 0} XP`
        
        // Create a temporary success alert
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-fade-in'
        successDiv.innerHTML = `
          <span class="text-2xl">${data.moduleComplete ? '🎉' : '✅'}</span>
          <span class="font-bold">${successMsg}</span>
        `
        document.body.appendChild(successDiv)
        
        setTimeout(() => {
          successDiv.remove()
        }, 2000)

        // Force refresh to update progress across the app
        router.refresh()

        // Wait a moment for the success message, then navigate
        setTimeout(() => {
          if (nextLesson) {
            router.push(`/employee-portal/modules/${moduleId}/lessons/${nextLesson.id}`)
          } else {
            // Module completed - go to module overview or dashboard
            router.push(`/employee-portal/modules/${moduleId}`)
          }
        }, 1500)
      } else {
        const error = await response.json()
        console.error('❌ Failed to complete lesson:', error)
        console.error('Response status:', response.status)
        console.error('Error details:', error)
        
        // Show more detailed error
        const errorMsg = error.error || error.details?.message || 'No se pudo completar la lección'
        alert(`Error: ${errorMsg}\n\nPor favor intenta de nuevo o contacta soporte.`)
      }
    } catch (error: any) {
      console.error('❌ Error completing lesson:', error)
      console.error('Error stack:', error.stack)
      alert(`Error al completar la lección: ${error.message}\n\nPor favor intenta de nuevo.`)
    }
    setCompleting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - Mobile Optimized */}
      <div className={`bg-gradient-to-r ${module.color} text-white py-4 sm:py-6 md:py-8 px-4`}>
        <div className="max-w-4xl mx-auto">
          <Link 
            href={moduleId ? `/employee-portal/modules/${moduleId}` : '/employee-portal/dashboard'}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-3 sm:mb-4 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Volver al Módulo</span>
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm text-white/80 mb-1 sm:mb-2">
                Lección {lesson.lessonNumber} de {module.totalLessons}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{lesson.title}</h1>
              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
                <span>{lesson.duration}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                  +{lesson.xpReward} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Mobile Optimized */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {/* Story Section - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">La Historia</h2>
              <p className="text-slate-600 text-xs sm:text-sm">Aprende a través de experiencias reales</p>
            </div>
          </div>

          {/* Introduction */}
          <div className="prose max-w-none mb-4 sm:mb-6">
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.introduction}
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {lesson.story.mainContent.map((paragraph: string, index: number) => (
              <p key={index} className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Conclusion */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4 sm:p-6 rounded-r-lg sm:rounded-r-xl mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.conclusion}
            </p>
          </div>

          {/* Character Insight */}
          <div className="bg-gradient-to-r from-teal-50 to-purple-50 border-2 border-teal-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {lesson.story.characterInsight}
            </div>
          </div>
        </div>

        {/* Learning Section - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Aprendizajes Clave</h2>
              <p className="text-slate-600 text-xs sm:text-sm">Conceptos importantes para recordar</p>
            </div>
          </div>

          {/* Key Points */}
          <div className="mb-4 sm:mb-6">
            <h3 className="font-bold text-slate-900 mb-3 sm:mb-4 text-sm sm:text-base">Puntos Clave:</h3>
            <ul className="space-y-2 sm:space-y-3">
              {lesson.learning.keyPoints.map((point: string, index: number) => (
                <li key={index} className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm sm:text-base text-slate-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Did You Know */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="font-bold text-blue-900 mb-3 sm:mb-4 text-sm sm:text-base">💡 ¿Sabías Que...?</h3>
            <ul className="space-y-2">
              {lesson.learning.didYouKnow.map((fact: string, index: number) => (
                <li key={index} className="text-sm sm:text-base text-blue-800">{fact}</li>
              ))}
            </ul>
          </div>

          {/* Real World Example */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <h3 className="font-bold text-green-900 mb-2 sm:mb-3 text-sm sm:text-base">🌍 Ejemplo del Mundo Real</h3>
            <div className="text-sm sm:text-base text-green-800 whitespace-pre-line">
              {lesson.learning.realWorldExample}
            </div>
          </div>
        </div>

        {/* Activity Section - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Actividad Práctica</h2>
              <p className="text-slate-600 text-xs sm:text-sm truncate">{lesson.activity.title}</p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-700 mb-4 sm:mb-6">{lesson.activity.description}</p>

          {!showActivity ? (
            <button
              onClick={() => setShowActivity(true)}
              className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg hover:scale-105 transition-transform min-h-[44px]"
            >
              Comenzar Actividad
            </button>
          ) : (
            <div className="space-y-3 sm:space-y-4">
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
                  className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg hover:scale-105 transition-transform mt-4 sm:mt-6 min-h-[44px]"
                >
                  Completar Actividad
                </button>
              ) : (
                <div className="w-full bg-teal-50 border-2 border-teal-500 text-teal-700 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg mt-4 sm:mt-6 flex items-center justify-center gap-2 min-h-[44px]">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>¡Actividad Completada! Ahora completa la lección abajo ↓</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resources - Mobile Optimized */}
        {lesson.resources && lesson.resources.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Recursos Adicionales</h2>
            <div className="grid gap-3 sm:gap-4">
              {lesson.resources.map((resource: any, index: number) => {
                const isTool = resource.type === 'tool' || resource.url?.startsWith('tool:')
                
                if (isTool) {
                  return (
                    <button
                      key={index}
                      onClick={() => handleToolClick(resource)}
                      className="flex items-center justify-between p-3 sm:p-4 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl hover:border-purple-600 hover:shadow-lg transition-all group min-h-[60px] text-left w-full"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium text-slate-900 group-hover:text-purple-700 text-sm sm:text-base truncate">
                          {resource.title}
                        </div>
                        <div className="text-xs sm:text-sm text-purple-600 capitalize font-medium">
                          🛠️ {resource.type}
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-lg">→</span>
                      </div>
                    </button>
                  )
                }
                
                return (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 sm:p-4 border-2 border-slate-200 rounded-lg sm:rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all group min-h-[60px]"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-medium text-slate-900 group-hover:text-teal-700 text-sm sm:text-base truncate">
                        {resource.title}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 capitalize">
                        {resource.type}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-teal-600 flex-shrink-0" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Next Steps - Mobile Optimized */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Próximos Pasos</h2>
          <ul className="space-y-2 sm:space-y-3">
            {lesson.nextSteps.map((step: string, index: number) => (
              <li key={index} className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs sm:text-sm">
                  {index + 1}
                </div>
                <span className="text-sm sm:text-base text-slate-700">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Complete Lesson Button - Mobile Optimized */}
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center text-white shadow-xl">
          <Award className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">¿Listo para Continuar?</h2>
          <p className="mb-4 sm:mb-6 text-white/90 text-sm sm:text-base">
            Completa esta lección para ganar {lesson.xpReward} XP y desbloquear el siguiente contenido
          </p>
          <button
            onClick={completeLesson}
            disabled={completing || (!activityCompleted && showActivity)}
            data-complete-lesson
            className="bg-white text-teal-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg flex items-center gap-2 mx-auto min-h-[44px]"
          >
            {completing ? (
              'Completando...'
            ) : (
              <>
                <span className="hidden sm:inline">Completar Lección</span>
                <span className="sm:hidden">Completar</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </>
            )}
          </button>
          {showActivity && !activityCompleted && (
            <p className="text-xs sm:text-sm text-white/80 mt-3 sm:mt-4">
              Completa la actividad práctica para continuar
            </p>
          )}
        </div>
      </div>

      {/* Tool Modal */}
      {toolModalOpen && currentTool && (
        <ToolModal
          toolType={currentTool.type}
          toolTitle={currentTool.title}
          onClose={() => {
            setToolModalOpen(false)
            setCurrentTool(null)
          }}
          onDataCapture={(data) => {
            // Save the tool data
            saveActivityData(currentTool.type, data)
            setActivityData((prev: any) => ({ ...prev, [currentTool.type]: data }))
            console.log('Tool data captured:', data)
          }}
        />
      )}
    </div>
  )
}

