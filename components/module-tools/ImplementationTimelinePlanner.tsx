'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, CheckCircle, Clock, DollarSign, Users, Save, Download } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

interface Task {
  id: string
  title: string
  week: number
  duration: number // weeks
  responsible: string
  budget: number
  status: 'pending' | 'in-progress' | 'completed'
  dependencies: string[]
}

interface TimelinePlannerProps {
  onSave?: (data: TimelinePlan) => void
  className?: string
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

interface TimelinePlan {
  projectName: string
  startDate: string
  tasks: Task[]
  totalBudget: number
  milestones: { week: number; title: string }[]
}

const taskTemplates = [
  { title: 'Auditoría inicial de calidad del aire', week: 1, duration: 1, budget: 5000, responsible: 'Equipo EHS' },
  { title: 'Instalación de monitores de aire', week: 2, duration: 1, budget: 15000, responsible: 'Mantenimiento' },
  { title: 'Compra e instalación de plantas purificadoras', week: 2, duration: 2, budget: 8000, responsible: 'Administración' },
  { title: 'Instalación de filtros HEPA', week: 3, duration: 2, budget: 12000, responsible: 'Mantenimiento' },
  { title: 'Capacitación de personal', week: 4, duration: 1, budget: 3000, responsible: 'RH' },
  { title: 'Mejoras de ventilación', week: 5, duration: 3, budget: 25000, responsible: 'Mantenimiento' },
  { title: 'Implementación de protocolo de monitoreo', week: 6, duration: 2, budget: 2000, responsible: 'Equipo EHS' },
  { title: 'Primera medición de resultados', week: 8, duration: 1, budget: 4000, responsible: 'Equipo EHS' },
  { title: 'Ajustes y optimizaciones', week: 10, duration: 2, budget: 5000, responsible: 'Todos' },
  { title: 'Evaluación final y reporte', week: 12, duration: 1, budget: 3000, responsible: 'Dirección' },
]

const milestoneTemplates = [
  { week: 1, title: '🎯 Inicio: Evaluación completa' },
  { week: 4, title: '🔧 Infraestructura instalada' },
  { week: 8, title: '📊 Primera medición de impacto' },
  { week: 12, title: '🎉 Finalización y certificación' },
]

export default function ImplementationTimelinePlanner({
  onSave,
  className = '',
  enrollmentId,
  moduleId,
  lessonId
}: TimelinePlannerProps) {
  const [projectName, setProjectName] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentTask, setCurrentTask] = useState({
    title: '',
    week: 1,
    duration: 1,
    responsible: '',
    budget: 0,
    status: 'pending' as const
  })
  const [completed, setCompleted] = useState(false)

  // ✨ ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()

  // ✨ Load previous data on mount
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'implementation-timeline'
        })

        if (savedData && savedData.tasks) {
          setProjectName(savedData.projectName || '')
          setStartDate(savedData.startDate || new Date().toISOString().split('T')[0])
          setTasks(savedData.tasks || [])
          if (savedData.tasks.length > 0) {
            setCompleted(true)
          }
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const addTask = () => {
    if (currentTask.title && currentTask.responsible) {
      const newTask: Task = {
        id: Date.now().toString(),
        ...currentTask,
        dependencies: []
      }
      
      setTasks(prev => [...prev].sort((a, b) => a.week - b.week))
      setTasks(prev => [...prev, newTask])
      setCurrentTask({
        title: '',
        week: 1,
        duration: 1,
        responsible: '',
        budget: 0,
        status: 'pending'
      })
      setShowForm(false)
    }
  }

  const loadTemplate = () => {
    const templateTasks = taskTemplates.map((t, i) => ({
      id: `template-${i}`,
      ...t,
      status: 'pending' as const,
      dependencies: []
    }))
    setTasks(templateTasks)
  }

  const totalBudget = tasks.reduce((sum, t) => sum + t.budget, 0)
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length

  const savePlan = async () => {
    const plan: TimelinePlan = {
      projectName,
      startDate,
      tasks,
      totalBudget,
      milestones: milestoneTemplates
    }
    
    setCompleted(true)

    // ✨ Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'implementation-timeline',
        tool_data: plan,
        tool_type: 'planner'
      })
    }
    
    if (onSave) {
      onSave(plan)
    }
  }

  const getWeekTasks = (week: number) => {
    return tasks.filter(t => t.week === week)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-400 text-green-900'
      case 'in-progress': return 'bg-blue-100 border-blue-400 text-blue-900'
      case 'pending': return 'bg-slate-100 border-slate-300 text-slate-700'
      default: return 'bg-slate-100 border-slate-300 text-slate-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '✅ Completado'
      case 'in-progress': return '🔄 En Progreso'
      case 'pending': return '⏳ Pendiente'
      default: return status
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (completed) {
    return (
      <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-indigo-900">Plan de Implementación</h3>
            <p className="text-xs sm:text-sm text-indigo-700">{projectName}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-indigo-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-indigo-900">{tasks.length}</div>
            <div className="text-xs sm:text-sm text-indigo-700">Tareas</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 sm:p-4 border-2 border-green-200 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-900">90</div>
            <div className="text-xs sm:text-sm text-green-700">Días</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border-2 border-orange-200 text-center">
            <div className="text-lg sm:text-xl font-bold text-orange-900">{formatCurrency(totalBudget)}</div>
            <div className="text-xs sm:text-sm text-orange-700">Presupuesto</div>
          </div>
        </div>

        {/* Timeline by Week */}
        <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 mb-4">
          <h4 className="font-bold text-indigo-900 mb-3 text-sm sm:text-base">📅 Cronograma (12 Semanas):</h4>
          <div className="space-y-4">
            {[...Array(12)].map((_, weekIndex) => {
              const week = weekIndex + 1
              const weekTasks = getWeekTasks(week)
              const milestone = milestoneTemplates.find(m => m.week === week)
              
              if (weekTasks.length === 0 && !milestone) return null
              
              return (
                <div key={week} className="border-l-4 border-indigo-400 pl-4">
                  <div className="font-bold text-indigo-900 mb-2">Semana {week}</div>
                  {milestone && (
                    <div className="bg-indigo-100 rounded-lg p-2 mb-2 text-sm font-medium text-indigo-900">
                      {milestone.title}
                    </div>
                  )}
                  {weekTasks.map(task => (
                    <div key={task.id} className="bg-slate-50 rounded-lg p-3 mb-2">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-slate-600 mt-1">
                            👤 {task.responsible} • {task.duration} semana(s) • {formatCurrency(task.budget)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* Key Milestones */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <h4 className="font-bold text-green-900 mb-3 text-sm sm:text-base">🎯 Hitos Clave:</h4>
          <div className="space-y-2">
            {milestoneTemplates.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {m.week}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-green-900">{m.title}</div>
                  <div className="text-xs text-green-700">Semana {m.week}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setCompleted(false)
            setTasks([])
            setProjectName('')
          }}
          className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-indigo-200 transition-colors min-h-[44px]"
        >
          Crear Nuevo Plan
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-indigo-900">Plan de Implementación 90 Días</h3>
          <p className="text-xs sm:text-sm text-indigo-700">Organiza tu proyecto de calidad del aire</p>
        </div>
      </div>

      {/* Project Setup */}
      {!projectName ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-2">
              Nombre del Proyecto
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Mejora de Calidad del Aire - Planta Principal"
              className="w-full px-4 py-3 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none text-sm sm:text-base"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                if (projectName) loadTemplate()
              }}
              disabled={!projectName}
              className="flex-1 bg-indigo-100 text-indigo-700 py-3 rounded-lg font-medium text-sm hover:bg-indigo-200 transition-colors disabled:opacity-50"
            >
              Usar Plantilla
            </button>
            <button
              onClick={() => {
                if (projectName) setShowForm(true)
              }}
              disabled={!projectName}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              Crear Desde Cero
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Summary */}
          <div className="bg-white rounded-lg p-4 border-2 border-indigo-200 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-indigo-900">{tasks.length}</div>
                <div className="text-xs text-indigo-700">Tareas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">{formatCurrency(totalBudget)}</div>
                <div className="text-xs text-orange-700">Presupuesto</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">{completedTasks}</div>
                <div className="text-xs text-green-700">Completadas</div>
              </div>
            </div>
          </div>

          {/* Add Task Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-indigo-200 transition-colors mb-4 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              Agregar Tarea
            </button>
          )}

          {/* Add Task Form */}
          {showForm && (
            <div className="bg-indigo-100 rounded-xl p-4 border-2 border-indigo-300 mb-4 space-y-3">
              <h4 className="font-bold text-indigo-900 text-sm sm:text-base">➕ Nueva Tarea</h4>
              
              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-2">Título</label>
                <input
                  type="text"
                  value={currentTask.title}
                  onChange={(e) => setCurrentTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Instalación de monitores"
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-2">Semana</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={currentTask.week}
                    onChange={(e) => setCurrentTask(prev => ({ ...prev, week: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-2">Duración (sem)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={currentTask.duration}
                    onChange={(e) => setCurrentTask(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                    className="w-full px-4 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-2">Responsable</label>
                <input
                  type="text"
                  value={currentTask.responsible}
                  onChange={(e) => setCurrentTask(prev => ({ ...prev, responsible: e.target.value }))}
                  placeholder="Ej: Equipo de Mantenimiento"
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-2">Presupuesto (MXN)</label>
                <input
                  type="number"
                  value={currentTask.budget || ''}
                  onChange={(e) => setCurrentTask(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
                  placeholder="15000"
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addTask}
                  disabled={!currentTask.title || !currentTask.responsible}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Tasks List */}
          {tasks.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="font-bold text-indigo-900 text-sm">Tareas del Proyecto:</h4>
              {tasks.map((task) => (
                <div key={task.id} className={`p-3 rounded-lg border-2 ${getStatusColor(task.status)}`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs opacity-80 mt-1">
                        📅 Semana {task.week} ({task.duration} sem) • 👤 {task.responsible} • 💰 {formatCurrency(task.budget)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Plan */}
          <button
            onClick={savePlan}
            disabled={tasks.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Save className="w-5 h-5" />
            Guardar Plan ({tasks.length} tareas)
          </button>
        </>
      )}
    </div>
  )
}

