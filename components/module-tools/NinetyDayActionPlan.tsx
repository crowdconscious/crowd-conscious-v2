'use client'

import { useState } from 'react'
import { Calendar, Plus, Trash2, Download, Save, CheckCircle, Clock } from 'lucide-react'

interface Action {
  id: string
  title: string
  description: string
  responsible: string
  startDate: string
  endDate: string
  budget: string
  status: 'planned' | 'in-progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

export default function NinetyDayActionPlan() {
  const [projectName, setProjectName] = useState('')
  const [actions, setActions] = useState<Action[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  const updateStatus = (id: string, status: Action['status']) => {
    setActions(actions.map(a => a.id === id ? { ...a, status } : a))
  }

  const exportPlan = () => {
    const csv = [
      ['Plan de Acción 90 Días', projectName || 'Sin nombre'],
      [],
      ['Acción', 'Descripción', 'Responsable', 'Fecha Inicio', 'Fecha Fin', 'Presupuesto', 'Estado', 'Prioridad'],
      ...actions.map(a => [
        a.title,
        a.description,
        a.responsible,
        a.startDate,
        a.endDate,
        `$${a.budget} MXN`,
        a.status === 'planned' ? 'Planeada' : a.status === 'in-progress' ? 'En Progreso' : 'Completada',
        a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Media' : 'Baja'
      ]),
      [],
      ['Resumen'],
      ['Total Acciones', actions.length],
      ['Completadas', actions.filter(a => a.status === 'completed').length],
      ['En Progreso', actions.filter(a => a.status === 'in-progress').length],
      ['Planeadas', actions.filter(a => a.status === 'planned').length],
      ['Presupuesto Total', `$${actions.reduce((sum, a) => sum + parseFloat(a.budget || '0'), 0).toFixed(2)} MXN`]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `plan-accion-90-dias-${Date.now()}.csv`
    link.click()
  }

  const getStatusColor = (status: Action['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300'
      case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getPriorityColor = (priority: Action['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Plan de Acción 90 Días</h2>
        <p className="text-slate-600">Crea tu plan de acción estructurado para los próximos 90 días</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Ej: Implementación de Gestión Sostenible del Agua"
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
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay acciones agregadas aún</p>
            <p className="text-sm">Haz clic en "Agregar Acción" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(action.priority)}`}>
                        {action.priority === 'high' ? 'Alta' : action.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(action.status)}`}>
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
                      onChange={(e) => updateStatus(action.id, e.target.value as Action['status'])}
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
        )}
      </div>

      {actions.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen del Plan</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total Acciones</div>
              <div className="text-2xl font-bold text-slate-900">{actions.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Completadas</div>
              <div className="text-2xl font-bold text-green-600">
                {actions.filter(a => a.status === 'completed').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">En Progreso</div>
              <div className="text-2xl font-bold text-blue-600">
                {actions.filter(a => a.status === 'in-progress').length}
              </div>
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
            console.log('Saving 90-day plan...', { projectName, actions })
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
    responsible: action?.responsible || '',
    startDate: action?.startDate || '',
    endDate: action?.endDate || '',
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Título de la Acción</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Instalar medidores de agua"
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
              placeholder="Describe la acción en detalle..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Responsable</label>
            <input
              type="text"
              value={formData.responsible}
              onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Nombre del responsable"
              required
            />
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

