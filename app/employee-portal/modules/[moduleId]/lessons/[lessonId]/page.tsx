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
  ImpactComparison,
  AirQualityAssessment,
  EmissionSourceIdentifier,
  AirQualityROI,
  ImplementationTimelinePlanner,
  AirQualityMonitorTracker,
  EmissionInventoryTemplate,
  SustainabilityROICalculator,
  WaterAuditTemplate,
  SecurityAuditChecklist,
  WasteAuditTemplate,
  WaterIntensityBenchmarks,
  LeakCostCalculator,
  NinetyDayActionPlan,
  WaterFootprintCalculator,
  WaterAuditTool,
  WaterConservationTracker,
  WaterQualityTestLog,
  RecyclingSystemDesigner
} from '@/components/module-tools'
import { SecurityAuditTool, CommunitySurveyTool, CostCalculatorTool } from '@/components/module-tools/Module3Tools'
import { WasteStreamAnalyzer, FiveRsChecklist, CompostingCalculator, ZeroWasteCertificationRoadmap } from '@/components/module-tools'
import { SupplyChainMapper, FairWageCalculator, LocalSupplierFinder, ResponsibleProcurementScorecard, ImpactReportGenerator } from '@/components/module-tools'
import { ImpactDashboardBuilder, ESGReportGenerator, StakeholderCommunicationPlanner, CertificationHub, ContinuousImprovementTracker } from '@/components/module-tools'
import InteractiveActivity from '@/components/activities/InteractiveActivity'
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
  const [enrollmentId, setEnrollmentId] = useState<string>('')
  const [startTime] = useState(Date.now()) // Track when lesson started
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [impactData, setImpactData] = useState<any>(null)
  const [toolModalOpen, setToolModalOpen] = useState(false)
  const [currentTool, setCurrentTool] = useState<{ type: string; title: string } | null>(null)

  const [module, setModule] = useState<any>(null)

  const cleanAirCourseId = 'a1a1a1a1-1111-1111-1111-111111111111' // Clean Air course ID (legacy)

  // ✅ PHASE 2: Save activity data using unified endpoint
  const saveActivityData = async (activityType: string, data: any) => {
    if (!enrollmentId) {
      console.warn('⚠️ Cannot save activity: enrollmentId not available')
      return
    }

    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          lesson_id: lessonId,
          activity_type: activityType,
          activity_data: data,
          write_to_legacy: false // Don't write to legacy table (deprecated)
        })
      })

      if (!response.ok) {
        console.error('Failed to save activity data')
      } else {
        console.log(`✅ ${activityType} data saved via unified endpoint`)
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
    const fetchLesson = async () => {
      try {
        const p = await params
        setModuleId(p.moduleId)
        setLessonId(p.lessonId)
        
        console.log(`🔍 Fetching lesson: ${p.moduleId}/${p.lessonId}`)
        
        // Fetch from database API
        const response = await fetch(`/api/modules/${p.moduleId}/lessons/${p.lessonId}`)
        
        if (response.ok) {
          const responseData = await response.json()
          console.log('✅ Lesson API response:', responseData)
          
          // ✅ PHASE 4: Parse standardized API response format
          const data = responseData.success !== undefined ? responseData.data : responseData
          
          if (data?.lesson) {
            console.log('✅ Lesson data:', data.lesson)
            setLesson(data.lesson)
            setModule(data.module || { title: 'Módulo', totalLessons: 1, color: 'from-teal-600 to-blue-700' })
          } else {
            console.error('❌ Lesson data not found in response:', data)
            // Fallback to static content if API response is malformed
            const lessonData = getLessonById(p.moduleId, p.lessonId)
            if (lessonData) {
              setLesson(lessonData)
              setModule(cleanAirModule)
            }
          }
        } else {
          console.error('❌ Failed to fetch lesson:', response.status)
          const errorData = await response.json().catch(() => ({}))
          console.error('Error details:', errorData)
          
          // Fallback to static content if API fails
          const lessonData = getLessonById(p.moduleId, p.lessonId)
          if (lessonData) {
            setLesson(lessonData)
            setModule(cleanAirModule)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching lesson:', error)
        // Fallback to static content
        try {
          const p = await params
          const lessonData = getLessonById(p.moduleId, p.lessonId)
          if (lessonData) {
            setLesson(lessonData)
            setModule(cleanAirModule)
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError)
        }
      }
    }
    
    fetchLesson()
  }, [])

  // Fetch enrollment ID for this module
  useEffect(() => {
    const fetchEnrollmentId = async () => {
      if (!moduleId) return
      
      try {
        console.log('🔍 Fetching enrollment ID for module:', moduleId)
        const response = await fetch(`/api/enrollments?module_id=${moduleId}`)
        
        if (response.ok) {
          const responseData = await response.json()
          // ✅ PHASE 4: Handle standardized API response format
          const data = responseData.success !== undefined ? responseData.data : responseData
          if (data?.enrollment_id) {
            setEnrollmentId(data.enrollment_id)
            console.log('✅ Enrollment ID:', data.enrollment_id)
          } else {
            console.warn('⚠️ No enrollment found for module:', moduleId)
            console.log('AA No enrollment found for module:', moduleId)
          }
        } else {
          console.error('❌ Failed to fetch enrollment:', response.status)
        }
      } catch (error) {
        console.error('❌ Error fetching enrollment:', error)
      }
    }
    
    fetchEnrollmentId()
  }, [moduleId])

  if (!lesson || !module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Cargando lección...</h1>
          <p className="text-slate-600 mb-4">Si esto toma mucho tiempo, intenta recargar la página</p>
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

      const responseData = await response.json()
      
      if (response.ok) {
        // ✅ PHASE 4: Handle standardized success response format
        const data = responseData.success !== undefined ? responseData.data : responseData
        console.log('✅ Lesson completed:', data)
        
        // Show success message
        const successMsg = data.moduleComplete 
          ? '🎉 ¡Módulo Completado!' 
          : `✅ ¡Lección completada! +${data.xpEarned || 0} XP`
        
        const successDiv = document.createElement('div')
        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3'
        successDiv.innerHTML = `
          <span class="text-2xl">${data.moduleComplete ? '🎉' : '✅'}</span>
          <span class="font-bold">${successMsg}</span>
        `
        document.body.appendChild(successDiv)
        
        setTimeout(() => {
          successDiv.remove()
        }, 2000)
        
        // CRITICAL: Force a full page reload to refresh progress
        // router.push() doesn't reload data, so we use window.location
        // ✅ Add cache-busting query param to ensure fresh data
        setTimeout(() => {
          window.location.href = `/employee-portal/modules/${moduleId}?t=${Date.now()}`
        }, 1500)

        // If module complete, generate certificate
        if (data.moduleComplete) {
          try {
            const certResponse = await fetch('/api/certificates/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                moduleId,
                moduleName: module.title,
                xpEarned: data.totalXP || lesson.xpReward
              })
            })

            if (certResponse.ok) {
              const certData = await certResponse.json()
              console.log('🎓 Certificate generated:', certData)
            }
          } catch (certError) {
            console.error('Certificate generation failed:', certError)
            // Don't block completion if certificate fails
          }
        }

        // Navigation already handled above (redirects to module overview after 1.5s with full reload)
      } else {
        // ✅ PHASE 4: Handle standardized error response format
        console.error('❌ Failed to complete lesson:', responseData)
        console.error('Response status:', response.status)
        console.error('Error details:', responseData)
        
        // Extract error message from standardized format
        let errorMsg = 'No se pudo completar la lección'
        
        if (responseData.success === false && responseData.error) {
          // New standardized format: { success: false, error: { code, message, timestamp } }
          errorMsg = responseData.error.message || errorMsg
        } else if (responseData.error) {
          // Legacy format: { error: "message" } or { error: { message: "..." } }
          errorMsg = typeof responseData.error === 'string' 
            ? responseData.error 
            : responseData.error.message || errorMsg
        } else if (responseData.message) {
          // Fallback: { message: "..." }
          errorMsg = responseData.message
        } else if (responseData.details?.message) {
          // Another fallback: { details: { message: "..." } }
          errorMsg = responseData.details.message
        }
        
        console.error('Extracted error message:', errorMsg)
        alert(`Error: ${errorMsg}\n\nPor favor intenta de nuevo o contacta soporte.`)
      }
    } catch (error: any) {
      console.error('❌ Error completing lesson:', error)
      console.error('Error stack:', error.stack)
      
      // Extract error message safely
      const errorMsg = error?.message || error?.toString() || 'Error desconocido'
      alert(`Error al completar la lección: ${errorMsg}\n\nPor favor intenta de nuevo.`)
    }
    setCompleting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - Mobile Optimized */}
      <div className={`bg-gradient-to-r ${module.color || 'from-teal-600 to-blue-700'} text-white py-4 sm:py-6 md:py-8 px-4`}>
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

        {/* Interactive Tools Section - FIRST (before activity) */}
        {lesson.tools && lesson.tools.length > 0 && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-xl sm:text-2xl">🛠️</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Herramientas Interactivas</h2>
                <p className="text-slate-600 text-xs sm:text-sm">Usa estas herramientas para aplicar lo aprendido</p>
              </div>
            </div>

            <div className="space-y-4">
              {lesson.tools.map((toolName: string, index: number) => {
                // Render the actual tool component
                const renderTool = () => {
                  switch (toolName) {
                    case 'AirQualityAssessment':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📊 Evaluación de Calidad del Aire</h3>
                          <AirQualityAssessment 
                            onComplete={(result: any) => {
                              console.log('Air quality assessment:', result)
                              setActivityData({...activityData, airQualityAssessment: result})
                            }}
                          />
                        </div>
                      )
                    
                    case 'CarbonCalculator':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">🌍 Calculadora de Carbono</h3>
                          <CarbonCalculator 
                            onCalculate={(result: any) => {
                              console.log('Carbon calculation:', result)
                              setActivityData({...activityData, carbonFootprint: result})
                            }}
                          />
                        </div>
                      )
                    
                    case 'CostCalculator':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">💰 Calculadora de Costos/ROI</h3>
                          <CostCalculator 
                            onCalculate={(result: any) => {
                              console.log('Cost calculation:', result)
                              setActivityData({...activityData, costAnalysis: result})
                            }}
                          />
                        </div>
                      )
                    
                    case 'EvidenceUploader':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📸 Subir Evidencia</h3>
                          <EvidenceUploader 
                            onUpload={(files: any) => {
                              console.log('Evidence uploaded:', files)
                              setUploadedFiles(files)
                              uploadEvidence(files)
                            }}
                          />
                        </div>
                      )
                    
                    case 'ReflectionJournal':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📝 Diario de Reflexión</h3>
                          <ReflectionJournal 
                            prompts={lesson.activity?.reflectionPrompts || [
                              '¿Qué aprendiste en esta lección?',
                              '¿Cómo aplicarás esto en tu trabajo?',
                              '¿Qué obstáculos podrías enfrentar?'
                            ]}
                            onSave={(data: any) => {
                              console.log('Reflection saved:', data)
                              setActivityData({...activityData, reflection: data})
                              saveActivityData('reflection', data)
                            }}
                          />
                        </div>
                      )
                    
                    case 'ImpactComparison':
                      // ImpactComparison is a display component that shows carbon impact in perspective
                      // It needs value, unit, and comparisons array
                      const carbonValue = activityData.carbonFootprint?.total || 1000 // Default 1000 kg CO2
                      const comparisonData = [
                        { icon: '🌳', label: 'Árboles necesarios para compensar', value: Math.round(carbonValue / 20), unit: 'árboles' },
                        { icon: '🚗', label: 'Equivalente a conducir', value: Math.round(carbonValue * 4.6), unit: 'km' },
                        { icon: '💡', label: 'Energía de focos LED', value: Math.round(carbonValue * 2.5), unit: 'horas' }
                      ]
                      
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📊 Comparación de Impacto</h3>
                          <ImpactComparison 
                            value={carbonValue}
                            unit="kg CO₂"
                            comparisons={comparisonData}
                            title="Tu Huella de Carbono en Perspectiva"
                            description="Equivalencias del mundo real"
                          />
                        </div>
                      )
                    
                    // Module 1: Clean Air Tools
                    case 'air-quality-assessment':
                      return (
                        <AirQualityAssessment
                          onComplete={(result: any) => {
                            console.log('Air quality assessment completed:', result)
                            setActivityData({...activityData, airQualityAssessment: result})
                            saveActivityData('air-quality-assessment', result)
                          }}
                        />
                      )
                    
                    case 'emission-source-identifier':
                      return (
                        <EmissionSourceIdentifier
                          onSave={(data: any) => {
                            console.log('Emission inventory saved:', data)
                            setActivityData({...activityData, emissionInventory: data})
                            saveActivityData('emission-inventory', data)
                          }}
                        />
                      )
                    
                    case 'emission-inventory-template':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📋 Inventario de Emisiones</h3>
                          <EmissionInventoryTemplate />
                        </div>
                      )
                    
                    // Map kebab-case tool names from database to PascalCase components
                    case 'carbon-footprint-calculator':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">🌍 Calculadora de Huella de Carbono</h3>
                          <CarbonCalculator 
                            onCalculate={(result: any) => {
                              console.log('Carbon calculation:', result)
                              setActivityData({...activityData, carbonFootprint: result})
                            }}
                          />
                        </div>
                      )
                    
                    case 'air-quality-roi':
                      return (
                        <AirQualityROI
                          onCalculate={(result: any) => {
                            console.log('ROI calculation completed:', result)
                            setActivityData({...activityData, roiCalculation: result})
                            saveActivityData('roi-calculation', result)
                          }}
                        />
                      )
                    
                    case 'implementation-timeline':
                      return (
                        <ImplementationTimelinePlanner
                          onSave={(plan: any) => {
                            console.log('Implementation plan saved:', plan)
                            setActivityData({...activityData, implementationPlan: plan})
                            saveActivityData('implementation-plan', plan)
                          }}
                        />
                      )
                    
                    case 'air-quality-monitor':
                      return (
                        <AirQualityMonitorTracker
                          onSave={(data: any) => {
                            console.log('Monitoring data saved:', data)
                            setActivityData({...activityData, monitoringData: data})
                            saveActivityData('monitoring-data', data)
                          }}
                        />
                      )
                    
                    // Module 2: Water Management Tools
                    case 'water-footprint-calculator':
                      return (
                        <WaterFootprintCalculator
                          onCalculate={(result: any) => {
                            console.log('Water footprint calculated:', result)
                            setActivityData({...activityData, waterFootprint: result})
                            saveActivityData('water-footprint', result)
                          }}
                        />
                      )
                    
                    case 'water-audit-tool':
                      return (
                        <WaterAuditTool
                          onSave={(data: any) => {
                            console.log('Water audit saved:', data)
                            setActivityData({...activityData, waterAudit: data})
                            saveActivityData('water-audit', data)
                          }}
                        />
                      )
                    
                    case 'water-conservation-tracker':
                      return (
                        <WaterConservationTracker
                          onSave={(data: any) => {
                            console.log('Conservation tracker saved:', data)
                            setActivityData({...activityData, conservationTracker: data})
                            saveActivityData('conservation-tracker', data)
                          }}
                        />
                      )
                    
                    case 'water-quality-test-log':
                      return (
                        <WaterQualityTestLog
                          onSave={(tests: any) => {
                            console.log('Water quality tests saved:', tests)
                            setActivityData({...activityData, qualityTests: tests})
                            saveActivityData('quality-tests', tests)
                          }}
                        />
                      )
                    
                    case 'recycling-system-designer':
                      return (
                        <RecyclingSystemDesigner
                          onDesign={(system: any) => {
                            console.log('Recycling system designed:', system)
                            setActivityData({...activityData, recyclingSystem: system})
                            saveActivityData('recycling-system', system)
                          }}
                        />
                      )
                    
                    // Module 3: Safe Cities Tools
                    case 'security-audit-tool':
                      return (
                        <SecurityAuditTool
                          onSave={(data: any) => {
                            console.log('Security audit saved:', data)
                            setActivityData({...activityData, securityAudit: data})
                            saveActivityData('security-audit', data)
                          }}
                        />
                      )
                    
                    case 'community-survey-tool':
                      return (
                        <CommunitySurveyTool
                          onSave={(data: any) => {
                            console.log('Community survey saved:', data)
                            setActivityData({...activityData, communitySurvey: data})
                            saveActivityData('community-survey', data)
                          }}
                        />
                      )
                    
                    case 'cost-calculator':
                      return (
                        <CostCalculatorTool
                          onSave={(data: any) => {
                            console.log('Cost calculator saved:', data)
                            setActivityData({...activityData, costCalculation: data})
                            saveActivityData('cost-calculation', data)
                          }}
                        />
                      )
                    
                    // Module 4: Zero Waste Tools
                    case 'waste-stream-analyzer':
                      return (
                        <WasteStreamAnalyzer
                          onAnalyze={(analysis: any) => {
                            console.log('Waste stream analyzed:', analysis)
                            setActivityData({...activityData, wasteAnalysis: analysis})
                            saveActivityData('waste-stream-analysis', analysis)
                          }}
                        />
                      )
                    
                    case 'five-rs-checklist':
                      return (
                        <FiveRsChecklist
                          onComplete={(data: any) => {
                            console.log('5 Rs checklist completed:', data)
                            setActivityData({...activityData, fiveRsProgress: data})
                            saveActivityData('five-rs-implementation', data)
                          }}
                        />
                      )
                    
                    case 'composting-calculator':
                      return (
                        <CompostingCalculator
                          onCalculate={(result: any) => {
                            console.log('Composting calculated:', result)
                            setActivityData({...activityData, compostingPlan: result})
                            saveActivityData('composting-plan', result)
                          }}
                        />
                      )
                    
                    case 'zero-waste-certification-roadmap':
                      return (
                        <ZeroWasteCertificationRoadmap
                          onSave={(data: any) => {
                            console.log('Certification roadmap saved:', data)
                            setActivityData({...activityData, certificationRoadmap: data})
                            saveActivityData('certification-roadmap', data)
                          }}
                        />
                      )
                    
                    // Module 5: Fair Trade Tools
                    case 'supply-chain-mapper':
                      return (
                        <SupplyChainMapper
                          onSave={(data: any) => {
                            console.log('Supply chain mapped:', data)
                            setActivityData({...activityData, supplyChain: data})
                            saveActivityData('supply-chain', data)
                          }}
                        />
                      )
                    
                    case 'fair-wage-calculator':
                      return (
                        <FairWageCalculator
                          onCalculate={(result: any) => {
                            console.log('Fair wage calculated:', result)
                            setActivityData({...activityData, fairWage: result})
                            saveActivityData('fair-wage', result)
                          }}
                        />
                      )
                    
                    case 'local-supplier-finder':
                      return (
                        <LocalSupplierFinder
                          onFind={(data: any) => {
                            console.log('Supplier search:', data)
                            setActivityData({...activityData, supplierSearch: data})
                            saveActivityData('supplier-search', data)
                          }}
                        />
                      )
                    
                    case 'responsible-procurement-scorecard':
                      return (
                        <ResponsibleProcurementScorecard
                          onScore={(data: any) => {
                            console.log('Supplier scored:', data)
                            setActivityData({...activityData, supplierScore: data})
                            saveActivityData('supplier-score', data)
                          }}
                        />
                      )
                    
                    case 'impact-report-generator':
                      return (
                        <ImpactReportGenerator
                          onGenerate={(data: any) => {
                            console.log('Impact report generated:', data)
                            setActivityData({...activityData, impactReport: data})
                            saveActivityData('impact-report', data)
                          }}
                        />
                      )
                    
                    // Module 6: Impact Integration Tools
                    case 'impact-dashboard-builder':
                      return (
                        <ImpactDashboardBuilder
                          onBuild={(data: any) => {
                            console.log('Dashboard built:', data)
                            setActivityData({...activityData, dashboard: data})
                            saveActivityData('dashboard', data)
                          }}
                        />
                      )
                    
                    case 'esg-report-generator':
                      return (
                        <ESGReportGenerator
                          onGenerate={(data: any) => {
                            console.log('ESG report generated:', data)
                            setActivityData({...activityData, esgReport: data})
                            saveActivityData('esg-report', data)
                          }}
                        />
                      )
                    
                    case 'stakeholder-communication-planner':
                      return (
                        <StakeholderCommunicationPlanner
                          onPlan={(data: any) => {
                            console.log('Stakeholder plan created:', data)
                            setActivityData({...activityData, stakeholderPlan: data})
                            saveActivityData('stakeholder-plan', data)
                          }}
                        />
                      )
                    
                    case 'certification-hub':
                      return <CertificationHub />
                    
                    case 'continuous-improvement-tracker':
                      return (
                        <ContinuousImprovementTracker
                          onTrack={(data: any) => {
                            console.log('Goals tracked:', data)
                            setActivityData({...activityData, goals: data})
                            saveActivityData('goals', data)
                          }}
                        />
                      )
                    
                    // Reusable tools (can be used in multiple modules)
                    case 'photo-uploader':
                      return (
                        <EvidenceUploader 
                          onUpload={(files: any) => {
                            console.log('Evidence uploaded:', files)
                            setUploadedFiles(files)
                            uploadEvidence(files)
                          }}
                        />
                      )
                    
                    // Additional priority tools
                    case 'sustainability-roi-calculator':
                    case 'roi-calculator-sustainability':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">💰 Calculadora ROI Sustentabilidad</h3>
                          <SustainabilityROICalculator />
                        </div>
                      )
                    
                    case 'water-audit-template':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">💧 Auditoría de Uso de Agua</h3>
                          <WaterAuditTemplate />
                        </div>
                      )
                    
                    case 'security-audit-checklist':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">🛡️ Checklist de Auditoría de Seguridad</h3>
                          <SecurityAuditChecklist />
                        </div>
                      )
                    
                    case 'waste-audit-template':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">🗑️ Auditoría de Flujos de Residuos</h3>
                          <WasteAuditTemplate />
                        </div>
                      )
                    
                    case 'water-intensity-benchmarks':
                    case 'water-intensity-benchmarks-detailed':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📊 Benchmarks: Intensidad de Agua</h3>
                          <WaterIntensityBenchmarks />
                        </div>
                      )
                    
                    case 'leak-cost-calculator':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">💧 Calculadora: Costo de Fugas</h3>
                          <LeakCostCalculator />
                        </div>
                      )
                    
                    case '90-day-action-plan':
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">📅 Plan de Acción 90 Días</h3>
                          <NinetyDayActionPlan />
                        </div>
                      )
                    
                    default:
                      return (
                        <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-purple-200">
                          <h3 className="font-bold text-lg mb-4 text-purple-900">🛠️ {toolName}</h3>
                          <p className="text-slate-600">Herramienta no encontrada: {toolName}</p>
                          <p className="text-xs text-slate-500 mt-2">Si esta herramienta debería estar disponible, por favor contacta al soporte.</p>
                        </div>
                      )
                  }
                }

                return (
                  <div key={index}>
                    {renderTool()}
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
            <InteractiveActivity
              activity={lesson.activity}
              moduleId={moduleId}
              lessonId={lessonId}
              enrollmentId={enrollmentId || moduleId} // Use fetched enrollment ID
              activityType={lesson.activity.type || 'reflection'}
              onComplete={() => {
                setActivityCompleted(true)
                // Scroll to complete lesson button
                setTimeout(() => {
                  const completeLessonButton = document.querySelector('[data-complete-lesson]')
                  completeLessonButton?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }, 100)
              }}
            />
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
            disabled={completing}
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
              💡 Tip: Completa la actividad práctica para obtener el máximo beneficio
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

