'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Save, Eye, Upload, Sparkles, BookOpen } from 'lucide-react'

// Available tools that creators can integrate
const AVAILABLE_TOOLS = [
  { id: 'air_quality_assessment', name: 'Evaluación de Calidad del Aire', category: 'Clean Air' },
  { id: 'air_quality_roi', name: 'Calculadora ROI de Calidad de Aire', category: 'Clean Air' },
  { id: 'air_quality_impact', name: 'Calculadora de Impacto de Aire Limpio', category: 'Clean Air' },
  { id: 'carbon_calculator', name: 'Calculadora de Carbono', category: 'General' },
  { id: 'cost_calculator', name: 'Calculadora de Ahorro de Costos', category: 'General' },
  { id: 'evidence_uploader', name: 'Subir Evidencia de Proyecto', category: 'General' },
  { id: 'reflection_journal', name: 'Diario de Reflexión', category: 'General' },
  { id: 'impact_comparison', name: 'Comparación de Impacto', category: 'General' },
]

const CORE_VALUES = [
  { id: 'clean_air', name: '🌬️ Aire Limpio', color: 'from-blue-500 to-cyan-500' },
  { id: 'clean_water', name: '💧 Agua Limpia', color: 'from-cyan-500 to-teal-500' },
  { id: 'safe_cities', name: '🏙️ Ciudades Seguras', color: 'from-purple-500 to-pink-500' },
  { id: 'zero_waste', name: '♻️ Cero Residuos', color: 'from-green-500 to-emerald-500' },
  { id: 'fair_trade', name: '🤝 Comercio Justo', color: 'from-orange-500 to-amber-500' },
  { id: 'biodiversity', name: '🌱 Biodiversidad', color: 'from-lime-500 to-green-500' },
]

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']

interface Lesson {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  xpReward: number
  storyIntro: string
  keyPoints: string[]
  activityType: string
  toolsUsed: string[]
  resources: { title: string; type: string; url: string }[]
}

interface ModuleData {
  title: string
  description: string
  coreValue: string
  difficulty: string
  estimatedHours: number
  xpReward: number
  thumbnailUrl: string
  lessons: Lesson[]
}

export default function ModuleBuilderPage() {
  const [module, setModule] = useState<ModuleData>({
    title: '',
    description: '',
    coreValue: 'clean_air',
    difficulty: 'beginner',
    estimatedHours: 8,
    xpReward: 1000,
    thumbnailUrl: '',
    lessons: []
  })

  const [currentStep, setCurrentStep] = useState<'info' | 'lessons' | 'review'>('info')
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  const addLesson = () => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: '',
      description: '',
      estimatedMinutes: 30,
      xpReward: 250,
      storyIntro: '',
      keyPoints: [''],
      activityType: 'reflection',
      toolsUsed: [],
      resources: []
    }
    setModule({ ...module, lessons: [...module.lessons, newLesson] })
    setExpandedLesson(newLesson.id)
  }

  const updateLesson = (lessonId: string, updates: Partial<Lesson>) => {
    setModule({
      ...module,
      lessons: module.lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, ...updates } : lesson
      )
    })
  }

  const deleteLesson = (lessonId: string) => {
    setModule({
      ...module,
      lessons: module.lessons.filter(lesson => lesson.id !== lessonId)
    })
  }

  const addKeyPoint = (lessonId: string) => {
    const lesson = module.lessons.find(l => l.id === lessonId)
    if (lesson) {
      updateLesson(lessonId, { keyPoints: [...lesson.keyPoints, ''] })
    }
  }

  const updateKeyPoint = (lessonId: string, index: number, value: string) => {
    const lesson = module.lessons.find(l => l.id === lessonId)
    if (lesson) {
      const newKeyPoints = [...lesson.keyPoints]
      newKeyPoints[index] = value
      updateLesson(lessonId, { keyPoints: newKeyPoints })
    }
  }

  const toggleTool = (lessonId: string, toolId: string) => {
    const lesson = module.lessons.find(l => l.id === lessonId)
    if (lesson) {
      const toolsUsed = lesson.toolsUsed.includes(toolId)
        ? lesson.toolsUsed.filter(t => t !== toolId)
        : [...lesson.toolsUsed, toolId]
      updateLesson(lessonId, { toolsUsed })
    }
  }

  const handleSaveDraft = async () => {
    console.log('Saving draft:', module)
    // TODO: Call API to save draft
    alert('Módulo guardado como borrador!')
  }

  const handleSubmitForReview = async () => {
    console.log('Submitting for review:', module)
    // TODO: Call API to submit for review
    alert('Módulo enviado para revisión!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-purple-600" />
                Constructor de Módulos
              </h1>
              <p className="text-slate-600 mt-1">Crea cursos impactantes para la comunidad corporativa</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Guardar Borrador
              </button>
              <button
                onClick={handleSubmitForReview}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Enviar a Revisión
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-4 mt-6">
            {['info', 'lessons', 'review'].map((step, index) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step as any)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
                  currentStep === step
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === step ? 'bg-white text-purple-600' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span>
                    {step === 'info' && 'Información'}
                    {step === 'lessons' && 'Lecciones'}
                    {step === 'review' && 'Revisión'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* STEP 1: Module Info */}
        {currentStep === 'info' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Información del Módulo</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título del Módulo *
                </label>
                <input
                  type="text"
                  value={module.title}
                  onChange={(e) => setModule({ ...module, title: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  placeholder="Ej: Estrategias Avanzadas de Calidad del Aire"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción *
                </label>
                <textarea
                  value={module.description}
                  onChange={(e) => setModule({ ...module, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  placeholder="Describe qué aprenderán los empleados y por qué es importante..."
                />
              </div>

              {/* Core Value */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor Central *
                </label>
                <select
                  value={module.coreValue}
                  onChange={(e) => setModule({ ...module, coreValue: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                >
                  {CORE_VALUES.map(value => (
                    <option key={value.id} value={value.id}>{value.name}</option>
                  ))}
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nivel de Dificultad *
                </label>
                <select
                  value={module.difficulty}
                  onChange={(e) => setModule({ ...module, difficulty: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level === 'beginner' && 'Principiante'}
                      {level === 'intermediate' && 'Intermedio'}
                      {level === 'advanced' && 'Avanzado'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estimated Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horas Estimadas *
                </label>
                <input
                  type="number"
                  value={module.estimatedHours}
                  onChange={(e) => setModule({ ...module, estimatedHours: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  min="1"
                />
              </div>

              {/* XP Reward */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Recompensa de XP *
                </label>
                <input
                  type="number"
                  value={module.xpReward}
                  onChange={(e) => setModule({ ...module, xpReward: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                  min="100"
                  step="100"
                />
              </div>

              {/* Thumbnail */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  URL de Miniatura (Opcional)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={module.thumbnailUrl}
                    onChange={(e) => setModule({ ...module, thumbnailUrl: e.target.value })}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-purple-600 focus:outline-none"
                    placeholder="https://..."
                  />
                  <button className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Subir
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setCurrentStep('lessons')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition-transform"
              >
                Siguiente: Agregar Lecciones →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Lessons */}
        {currentStep === 'lessons' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Lecciones del Módulo</h2>
                <button
                  onClick={addLesson}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Lección
                </button>
              </div>

              {module.lessons.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No hay lecciones todavía. ¡Agrega la primera!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {module.lessons.map((lesson, index) => (
                    <div key={lesson.id} className="border-2 border-slate-200 rounded-xl overflow-hidden">
                      {/* Lesson Header */}
                      <div className="bg-slate-50 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                          <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {lesson.title || `Lección ${index + 1}`}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {lesson.estimatedMinutes} min • {lesson.xpReward} XP
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                            className="px-4 py-2 text-slate-600 hover:text-purple-600 font-medium"
                          >
                            {expandedLesson === lesson.id ? 'Colapsar' : 'Editar'}
                          </button>
                          <button
                            onClick={() => deleteLesson(lesson.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Lesson Editor */}
                      {expandedLesson === lesson.id && (
                        <div className="p-6 space-y-6 bg-white">
                          {/* Basic Info */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Título de la Lección *
                              </label>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) => updateLesson(lesson.id, { title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                                placeholder="Ej: Entendiendo PM2.5"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Minutos
                                </label>
                                <input
                                  type="number"
                                  value={lesson.estimatedMinutes}
                                  onChange={(e) => updateLesson(lesson.id, { estimatedMinutes: parseInt(e.target.value) })}
                                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                                  min="5"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  XP
                                </label>
                                <input
                                  type="number"
                                  value={lesson.xpReward}
                                  onChange={(e) => updateLesson(lesson.id, { xpReward: parseInt(e.target.value) })}
                                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                                  min="50"
                                  step="50"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Descripción Breve
                            </label>
                            <textarea
                              value={lesson.description}
                              onChange={(e) => updateLesson(lesson.id, { description: e.target.value })}
                              rows={2}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                              placeholder="Breve descripción de la lección..."
                            />
                          </div>

                          {/* Story Introduction */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Introducción de la Historia
                            </label>
                            <textarea
                              value={lesson.storyIntro}
                              onChange={(e) => updateLesson(lesson.id, { storyIntro: e.target.value })}
                              rows={4}
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                              placeholder="Comienza la historia de esta lección..."
                            />
                          </div>

                          {/* Key Points */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Puntos Clave
                            </label>
                            <div className="space-y-2">
                              {lesson.keyPoints.map((point, idx) => (
                                <input
                                  key={idx}
                                  type="text"
                                  value={point}
                                  onChange={(e) => updateKeyPoint(lesson.id, idx, e.target.value)}
                                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-purple-600 focus:outline-none"
                                  placeholder={`Punto clave #${idx + 1}`}
                                />
                              ))}
                              <button
                                onClick={() => addKeyPoint(lesson.id)}
                                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                              >
                                + Agregar Punto
                              </button>
                            </div>
                          </div>

                          {/* Tools Selection */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Herramientas Interactivas
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {AVAILABLE_TOOLS.map(tool => (
                                <button
                                  key={tool.id}
                                  onClick={() => toggleTool(lesson.id, tool.id)}
                                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                                    lesson.toolsUsed.includes(tool.id)
                                      ? 'border-purple-600 bg-purple-50'
                                      : 'border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="font-medium text-sm text-slate-900">{tool.name}</div>
                                  <div className="text-xs text-slate-600 mt-1">{tool.category}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep('info')}
                className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setCurrentStep('review')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition-transform"
              >
                Siguiente: Revisar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review */}
        {currentStep === 'review' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Revisión Final</h2>

            {/* Module Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">{module.title}</h3>
              <p className="text-slate-700 mb-4">{module.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Valor:</span>
                  <span className="text-slate-700">
                    {CORE_VALUES.find(v => v.id === module.coreValue)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Dificultad:</span>
                  <span className="text-slate-700 capitalize">{module.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Duración:</span>
                  <span className="text-slate-700">{module.estimatedHours} horas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">XP Total:</span>
                  <span className="text-slate-700">{module.xpReward} puntos</span>
                </div>
              </div>
            </div>

            {/* Lessons Summary */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Lecciones ({module.lessons.length})
              </h3>
              <div className="space-y-3">
                {module.lessons.map((lesson, index) => (
                  <div key={lesson.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{lesson.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{lesson.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded">
                            {lesson.estimatedMinutes} min
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {lesson.xpReward} XP
                          </span>
                          {lesson.toolsUsed.length > 0 && (
                            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                              {lesson.toolsUsed.length} herramientas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
              <button
                onClick={() => setCurrentStep('lessons')}
                className="px-8 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={handleSubmitForReview}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Enviar para Revisión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

