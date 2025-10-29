'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, CheckCircle, Lock, Clock, Award, TrendingUp } from 'lucide-react'
import { cleanAirModule, getModuleProgress } from '@/app/lib/course-content/clean-air-module'

export default function ModuleOverviewPage({ params }: { params: { moduleId: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [progress, setProgress] = useState({
    percentage: 0,
    completedCount: 0,
    totalCount: 0,
    xpEarned: 0
  })

  // For now, we'll use the clean air module
  // Later this can be dynamic based on params.moduleId
  const module = cleanAirModule

  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      // Fetch user's progress for this module
      const response = await fetch(`/api/corporate/progress/module/${params.moduleId}`)
      const data = await response.json()
      
      if (data.completedLessons) {
        setCompletedLessons(data.completedLessons)
        const progressData = getModuleProgress(data.completedLessons)
        setProgress(progressData)
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading progress:', error)
      setLoading(false)
    }
  }

  const isLessonUnlocked = (lessonNumber: number) => {
    // First lesson is always unlocked
    if (lessonNumber === 1) return true
    
    // Subsequent lessons unlock when previous is completed
    const previousLesson = module.lessons.find(l => l.lessonNumber === lessonNumber - 1)
    return previousLesson ? completedLessons.includes(previousLesson.id) : false
  }

  const getNextLesson = () => {
    return module.lessons.find(l => !completedLessons.includes(l.id))
  }

  const nextLesson = getNextLesson()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando módulo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className={`bg-gradient-to-r ${module.color} text-white py-12 px-4`}>
        <div className="max-w-4xl mx-auto">
          <Link 
            href="/employee-portal/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Portal
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-6xl">{module.icon}</div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{module.title}</h1>
              <p className="text-xl text-white/90">{module.description}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Progreso del Módulo</span>
              <span className="text-2xl font-bold">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3 mb-4">
              <div 
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{progress.completedCount}/{progress.totalCount}</div>
                <div className="text-sm text-white/80">Lecciones</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{progress.xpEarned} XP</div>
                <div className="text-sm text-white/80">Ganados</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{module.duration}</div>
                <div className="text-sm text-white/80">Duración</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Continue Learning CTA */}
        {nextLesson && (
          <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Continuar Aprendiendo</h2>
                <p className="text-white/90 mb-4">
                  Lección {nextLesson.lessonNumber}: {nextLesson.title}
                </p>
                <div className="flex items-center gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {nextLesson.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    +{nextLesson.xpReward} XP
                  </span>
                </div>
              </div>
              <Link
                href={`/employee-portal/modules/${params.moduleId}/lessons/${nextLesson.id}`}
                className="bg-white text-teal-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Continuar
              </Link>
            </div>
          </div>
        )}

        {/* Module Overview */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">¿Qué Aprenderás?</h2>
          <ul className="space-y-3 mb-6">
            {module.overview.whatYouWillLearn.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ¿Por Qué Importa?
            </h3>
            <p className="text-purple-800">{module.overview.whyItMatters}</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h3 className="font-bold text-green-900 mb-2">Impacto Potencial</h3>
            <p className="text-green-800">{module.overview.impactPotential}</p>
          </div>
        </div>

        {/* Lessons List */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Lecciones</h2>
          <div className="space-y-4">
            {module.lessons.map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.id)
              const isUnlocked = isLessonUnlocked(lesson.lessonNumber)
              const isCurrent = nextLesson?.id === lesson.id

              return (
                <div
                  key={lesson.id}
                  className={`border-2 rounded-xl p-6 transition-all ${
                    isCompleted
                      ? 'border-green-300 bg-green-50'
                      : isCurrent
                      ? 'border-teal-300 bg-teal-50 shadow-lg'
                      : isUnlocked
                      ? 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-gradient-to-br from-teal-500 to-purple-600'
                        : isUnlocked
                        ? 'bg-slate-300'
                        : 'bg-slate-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : isUnlocked ? (
                        <Play className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">
                            Lección {lesson.lessonNumber}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {lesson.title}
                          </h3>
                        </div>
                        {isCompleted && (
                          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Completada
                          </span>
                        )}
                        {isCurrent && (
                          <span className="bg-gradient-to-r from-teal-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                            Siguiente
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {lesson.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          +{lesson.xpReward} XP
                        </span>
                      </div>

                      {/* Action Button */}
                      {isUnlocked ? (
                        <Link
                          href={`/employee-portal/modules/${params.moduleId}/lessons/${lesson.id}`}
                          className={`inline-block px-6 py-2 rounded-lg font-medium transition-all ${
                            isCurrent
                              ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white hover:scale-105 shadow-md'
                              : isCompleted
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                          }`}
                        >
                          {isCompleted ? 'Revisar Lección' : isCurrent ? 'Empezar Ahora' : 'Ver Lección'}
                        </Link>
                      ) : (
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Completa la lección anterior para desbloquear
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Certification */}
        {progress.percentage === 100 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-2xl p-8 mt-8 shadow-xl text-center">
            <Award className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">¡Felicidades! 🎉</h2>
            <p className="text-xl mb-6">
              Has completado el módulo y ganado {progress.xpEarned} XP
            </p>
            <Link
              href={`/employee-portal/modules/${params.moduleId}/certificate`}
              className="inline-block bg-white text-orange-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Ver Mi Certificado
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

