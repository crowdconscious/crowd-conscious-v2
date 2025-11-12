'use client'

import { useState } from 'react'
import { Target, TrendingUp, Download, Save, Plus, Trash2, Move } from 'lucide-react'

interface Action {
  id: string
  title: string
  description: string
  impact: number // 1-5
  effort: number // 1-5
  category: string
  quadrant: 'quick-wins' | 'major-projects' | 'fill-ins' | 'thankless-tasks'
}

export default function ImpactEffortMatrix() {
  const [projectName, setProjectName] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draggedAction, setDraggedAction] = useState<string | null>(null)

  const addAction = (action: Omit<Action, 'id' | 'quadrant'>) => {
    const quadrant = getQuadrant(action.impact, action.effort)
    const newAction: Action = {
      ...action,
      id: Date.now().toString(),
      quadrant
    }

    if (editingId) {
      setActions(actions.map(a => a.id === editingId ? newAction : a))
      setEditingId(null)
    } else {
      setActions([...actions, newAction])
    }
    setShowForm(false)
  }

  const getQuadrant = (impact: number, effort: number): Action['quadrant'] => {
    if (impact >= 3 && effort <= 2) return 'quick-wins'
    if (impact >= 3 && effort >= 3) return 'major-projects'
    if (impact <= 2 && effort <= 2) return 'fill-ins'
    return 'thankless-tasks'
  }

  const updateActionPosition = (id: string, impact: number, effort: number) => {
    const quadrant = getQuadrant(impact, effort)
    setActions(actions.map(a => 
      a.id === id ? { ...a, impact, effort, quadrant } : a
    ))
  }

  const deleteAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id))
  }

  const quadrants = {
    'quick-wins': {
      title: 'Victorias Rápidas',
      subtitle: 'Alto Impacto, Bajo Esfuerzo',
      color: 'bg-green-50 border-green-300',
      textColor: 'text-green-900',
      actions: actions.filter(a => a.quadrant === 'quick-wins')
    },
    'major-projects': {
      title: 'Proyectos Mayores',
      subtitle: 'Alto Impacto, Alto Esfuerzo',
      color: 'bg-blue-50 border-blue-300',
      textColor: 'text-blue-900',
      actions: actions.filter(a => a.quadrant === 'major-projects')
    },
    'fill-ins': {
      title: 'Rellenos',
      subtitle: 'Bajo Impacto, Bajo Esfuerzo',
      color: 'bg-yellow-50 border-yellow-300',
      textColor: 'text-yellow-900',
      actions: actions.filter(a => a.quadrant === 'fill-ins')
    },
    'thankless-tasks': {
      title: 'Tareas Ingratas',
      subtitle: 'Bajo Impacto, Alto Esfuerzo',
      color: 'bg-red-50 border-red-300',
      textColor: 'text-red-900',
      actions: actions.filter(a => a.quadrant === 'thankless-tasks')
    }
  }

  const exportMatrix = () => {
    const csv = [
      ['Matriz Impacto vs. Esfuerzo', projectName || 'Sin nombre'],
      [],
      ['Acción', 'Descripción', 'Impacto (1-5)', 'Esfuerzo (1-5)', 'Cuadrante', 'Categoría'],
      ...actions.map(a => [
        a.title,
        a.description,
        a.impact.toString(),
        a.effort.toString(),
        quadrants[a.quadrant].title,
        a.category
      ]),
      [],
      ['Resumen por Cuadrante'],
      ['Victorias Rápidas', quadrants['quick-wins'].actions.length],
      ['Proyectos Mayores', quadrants['major-projects'].actions.length],
      ['Rellenos', quadrants['fill-ins'].actions.length],
      ['Tareas Ingratas', quadrants['thankless-tasks'].actions.length]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `matriz-impacto-esfuerzo-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Matriz Impacto vs. Esfuerzo</h2>
        <p className="text-slate-600">Prioriza acciones visualizando su impacto y esfuerzo requerido</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Ej: Plan de Sostenibilidad 2024"
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Acciones ({actions.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Acción
          </button>
        </div>

        {actions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay acciones agregadas aún</p>
            <p className="text-sm">Haz clic en "Agregar Acción" para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(quadrants).map(([key, quadrant]) => (
              <div key={key} className={`rounded-lg p-4 border-2 ${quadrant.color}`}>
                <h4 className={`font-bold text-lg mb-1 ${quadrant.textColor}`}>{quadrant.title}</h4>
                <p className={`text-sm mb-3 ${quadrant.textColor} opacity-80`}>{quadrant.subtitle}</p>
                <div className="space-y-2">
                  {quadrant.actions.length === 0 ? (
                    <p className={`text-sm ${quadrant.textColor} opacity-60 italic`}>No hay acciones en este cuadrante</p>
                  ) : (
                    quadrant.actions.map(action => (
                      <div key={action.id} className="bg-white rounded p-3 border border-slate-200">
                        <div className="font-semibold text-sm text-slate-900 mb-1">{action.title}</div>
                        <div className="text-xs text-slate-600 mb-2">{action.description}</div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-green-600" />
                            <span>Impacto: {action.impact}/5</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Move className="w-3 h-3 text-blue-600" />
                            <span>Esfuerzo: {action.effort}/5</span>
                          </div>
                          <div className="ml-auto flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(action.id)
                                setShowForm(true)
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteAction(action.id)}
                              className="text-red-600 hover:text-red-800 ml-2"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={action.impact}
                            onChange={(e) => updateActionPosition(action.id, parseInt(e.target.value), action.effort)}
                            className="flex-1"
                          />
                          <span className="text-xs w-8 text-center">{action.impact}</span>
                        </div>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={action.effort}
                            onChange={(e) => updateActionPosition(action.id, action.impact, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs w-8 text-center">{action.effort}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recomendaciones</h3>
          <div className="space-y-2 text-sm text-slate-700">
            {quadrants['quick-wins'].actions.length > 0 && (
              <p>
                ✅ <strong>Victorias Rápidas ({quadrants['quick-wins'].actions.length}):</strong> 
                {' '}Implementa estas primero para obtener resultados rápidos y construir momentum.
              </p>
            )}
            {quadrants['major-projects'].actions.length > 0 && (
              <p>
                🎯 <strong>Proyectos Mayores ({quadrants['major-projects'].actions.length}):</strong> 
                {' '}Planifica estos cuidadosamente - requieren recursos significativos pero tienen alto impacto.
              </p>
            )}
            {quadrants['fill-ins'].actions.length > 0 && (
              <p>
                ⏰ <strong>Rellenos ({quadrants['fill-ins'].actions.length}):</strong> 
                {' '}Haz estos cuando tengas tiempo libre - bajo impacto pero fáciles de completar.
              </p>
            )}
            {quadrants['thankless-tasks'].actions.length > 0 && (
              <p>
                ⚠️ <strong>Tareas Ingratas ({quadrants['thankless-tasks'].actions.length}):</strong> 
                {' '}Considera eliminar o simplificar estas - alto esfuerzo, bajo impacto.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportMatrix}
          disabled={actions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Matriz
        </button>
        <button
          onClick={() => {
            console.log('Saving impact-effort matrix...', { projectName, actions })
          }}
          disabled={actions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <ActionFormModal
          action={editingId ? actions.find(a => a.id === editingId) : undefined}
          onSave={addAction}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function ActionFormModal({ action, onSave, onCancel }: {
  action?: Action
  onSave: (action: Omit<Action, 'id' | 'quadrant'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: action?.title || '',
    description: action?.description || '',
    impact: action?.impact || 3,
    effort: action?.effort || 2,
    category: action?.category || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{action ? 'Editar' : 'Agregar'} Acción</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Instalar paneles solares"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              placeholder="Describe la acción..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Impacto: {formData.impact}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.impact}
              onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Bajo</span>
              <span>Alto</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Esfuerzo: {formData.effort}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.effort}
              onChange={(e) => setFormData({ ...formData, effort: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Bajo</span>
              <span>Alto</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría (opcional)</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Energía, Agua, Residuos"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {action ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

