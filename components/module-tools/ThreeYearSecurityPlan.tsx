'use client'

import { useState } from 'react'
import { Calendar, Target, Download, Save, Plus, Trash2, CheckCircle } from 'lucide-react'

interface Action {
  id: string
  title: string
  description: string
  timeframe: 'quick-wins' | 'medium-term' | 'long-term'
  startDate: string
  endDate: string
  responsible: string
  budget: string
  status: 'planned' | 'in-progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

export default function ThreeYearSecurityPlan() {
  const [projectName, setProjectName] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all')

  const addAction = (action: Omit<Action, 'id'>) => {
    const newAction: Action = {
      ...action,
      id: Date.now().toString()
    }

    if (editingId) {
      setActions(actions.map(a => a.id === editingId ? newAction : a))
      setEditingId(null)
    } else {
      setActions([...actions, newAction])
    }
    setShowForm(false)
  }

  const deleteAction = (id: string) => {
    setActions(actions.filter(a => a.id !== id))
  }

  const filteredActions = filterTimeframe === 'all'
    ? actions
    : actions.filter(a => a.timeframe === filterTimeframe)

  const timeframes = {
    'quick-wins': {
      title: 'Victorias Rápidas',
      subtitle: '0-3 meses',
      color: 'bg-green-50 border-green-300',
      actions: actions.filter(a => a.timeframe === 'quick-wins')
    },
    'medium-term': {
      title: 'Mediano Plazo',
      subtitle: '3-12 meses',
      color: 'bg-blue-50 border-blue-300',
      actions: actions.filter(a => a.timeframe === 'medium-term')
    },
    'long-term': {
      title: 'Largo Plazo',
      subtitle: '1-3 años',
      color: 'bg-purple-50 border-purple-300',
      actions: actions.filter(a => a.timeframe === 'long-term')
    }
  }

  const exportPlan = () => {
    const csv = [
      ['Plan de Seguridad 3 Años', projectName || 'Sin nombre'],
      [],
      ['Acción', 'Descripción', 'Plazo', 'Fecha Inicio', 'Fecha Fin', 'Responsable', 'Presupuesto', 'Estado', 'Prioridad'],
      ...actions.map(a => [
        a.title,
        a.description,
        a.timeframe === 'quick-wins' ? '0-3 meses' : a.timeframe === 'medium-term' ? '3-12 meses' : '1-3 años',
        a.startDate,
        a.endDate,
        a.responsible,
        `$${a.budget} MXN`,
        a.status === 'planned' ? 'Planeada' : a.status === 'in-progress' ? 'En Progreso' : 'Completada',
        a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Media' : 'Baja'
      ]),
      [],
      ['Resumen por Plazo'],
      ['Victorias Rápidas (0-3 meses)', timeframes['quick-wins'].actions.length],
      ['Mediano Plazo (3-12 meses)', timeframes['medium-term'].actions.length],
      ['Largo Plazo (1-3 años)', timeframes['long-term'].actions.length],
      [],
      ['Presupuesto Total', `$${actions.reduce((sum, a) => sum + parseFloat(a.budget || '0'), 0).toFixed(2)} MXN`]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `plan-seguridad-3-anos-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Plan de Seguridad 3 Años</h2>
        <p className="text-slate-600">Plantilla para crear plan de seguridad a largo plazo</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Ej: Plan de Seguridad Comunitaria 2024-2027"
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

        {actions.length > 0 && (
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterTimeframe('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterTimeframe === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {Object.entries(timeframes).map(([key, timeframe]) => (
              <button
                key={key}
                onClick={() => setFilterTimeframe(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterTimeframe === key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {timeframe.title}
              </button>
            ))}
          </div>
        )}

        {filteredActions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay acciones agregadas aún</p>
            <p className="text-sm">Haz clic en "Agregar Acción" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(timeframes).map(([key, timeframe]) => {
              const timeframeActions = filteredActions.filter(a => a.timeframe === key)
              if (timeframeActions.length === 0 && filterTimeframe !== 'all') return null
              
              return (
                <div key={key} className={`rounded-lg p-4 border-2 ${timeframe.color}`}>
                  <h4 className="font-bold text-lg mb-2">{timeframe.title}</h4>
                  <p className="text-sm text-slate-600 mb-4">{timeframe.subtitle}</p>
                  <div className="space-y-3">
                    {timeframeActions.map((action) => (
                      <div key={action.id} className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                action.priority === 'high' ? 'bg-red-100 text-red-700' :
                                action.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                Prioridad {action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Media' : 'Baja'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                                action.status === 'completed' ? 'bg-green-100 text-green-700 border-green-300' :
                                action.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                'bg-gray-100 text-gray-700 border-gray-300'
                              }`}>
                                {action.status === 'planned' ? 'Planeada' : action.status === 'in-progress' ? 'En Progreso' : 'Completada'}
                              </span>
                              <span className="font-semibold text-slate-900">{action.title}</span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{action.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>👤 {action.responsible}</span>
                              <span>📅 {action.startDate} - {action.endDate}</span>
                              <span>💰 ${action.budget} MXN</span>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <select
                              value={action.status}
                              onChange={(e) => {
                                setActions(actions.map(a => 
                                  a.id === action.id ? { ...a, status: e.target.value as Action['status'] } : a
                                ))
                              }}
                              className="text-xs px-2 py-1 border border-slate-300 rounded"
                            >
                              <option value="planned">Planeada</option>
                              <option value="in-progress">En Progreso</option>
                              <option value="completed">Completada</option>
                            </select>
                            <button
                              onClick={() => {
                                setEditingId(action.id)
                                setShowForm(true)
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => deleteAction(action.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {actions.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen del Plan</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Victorias Rápidas</div>
              <div className="text-2xl font-bold text-green-600">{timeframes['quick-wins'].actions.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Mediano Plazo</div>
              <div className="text-2xl font-bold text-blue-600">{timeframes['medium-term'].actions.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Largo Plazo</div>
              <div className="text-2xl font-bold text-purple-600">{timeframes['long-term'].actions.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Presupuesto Total</div>
              <div className="text-2xl font-bold text-teal-600">
                ${actions.reduce((sum, a) => sum + parseFloat(a.budget || '0'), 0).toFixed(2)} MXN
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportPlan}
          disabled={actions.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Plan
        </button>
        <button
          onClick={() => {
            console.log('Saving 3-year security plan...', { projectName, actions })
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
  onSave: (action: Omit<Action, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: action?.title || '',
    description: action?.description || '',
    timeframe: (action?.timeframe || 'quick-wins') as Action['timeframe'],
    startDate: action?.startDate || '',
    endDate: action?.endDate || '',
    responsible: action?.responsible || '',
    budget: action?.budget || '',
    status: (action?.status || 'planned') as Action['status'],
    priority: (action?.priority || 'medium') as Action['priority']
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
              placeholder="Ej: Instalar iluminación LED"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Plazo</label>
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value as Action['timeframe'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="quick-wins">Victorias Rápidas (0-3 meses)</option>
              <option value="medium-term">Mediano Plazo (3-12 meses)</option>
              <option value="long-term">Largo Plazo (1-3 años)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Presupuesto (MXN)</label>
              <input
                type="number"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Action['priority'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Action['status'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="planned">Planeada</option>
                <option value="in-progress">En Progreso</option>
                <option value="completed">Completada</option>
              </select>
            </div>
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

