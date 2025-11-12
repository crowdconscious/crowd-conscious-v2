'use client'

import { useState } from 'react'
import { CheckCircle, Circle, Star, TrendingUp, Download, Save, Plus, Trash2 } from 'lucide-react'

interface QuickWin {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  category: 'energy' | 'water' | 'waste' | 'air' | 'other'
  status: 'not-started' | 'in-progress' | 'completed'
  notes: string
}

export default function QuickWinsChecklist() {
  const [projectName, setProjectName] = useState('')
  const [wins, setWins] = useState<QuickWin[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const predefinedWins: Omit<QuickWin, 'id' | 'status' | 'notes'>[] = [
    {
      title: 'Reemplazar focos incandescentes por LED',
      description: 'Cambiar todos los focos a LED reduce consumo energético en 80%',
      impact: 'high',
      effort: 'low',
      category: 'energy'
    },
    {
      title: 'Instalar sensores de movimiento en iluminación',
      description: 'Apaga luces automáticamente cuando no hay personas',
      impact: 'medium',
      effort: 'low',
      category: 'energy'
    },
    {
      title: 'Reparar fugas de agua inmediatamente',
      description: 'Una fuga pequeña puede desperdiciar miles de litros al mes',
      impact: 'high',
      effort: 'low',
      category: 'water'
    },
    {
      title: 'Instalar aireadores en llaves',
      description: 'Reduce consumo de agua en 30-50% sin afectar funcionalidad',
      impact: 'medium',
      effort: 'low',
      category: 'water'
    },
    {
      title: 'Implementar separación básica de residuos',
      description: 'Separar orgánicos, reciclables y residuales',
      impact: 'high',
      effort: 'low',
      category: 'waste'
    },
    {
      title: 'Eliminar vasos y platos desechables',
      description: 'Usar vajilla reutilizable en cafetería y oficinas',
      impact: 'medium',
      effort: 'low',
      category: 'waste'
    },
    {
      title: 'Optimizar rutas de transporte',
      description: 'Consolidar entregas y optimizar rutas reduce emisiones',
      impact: 'high',
      effort: 'medium',
      category: 'air'
    },
    {
      title: 'Programar mantenimiento preventivo de equipos',
      description: 'Equipos bien mantenidos consumen menos energía',
      impact: 'medium',
      effort: 'low',
      category: 'energy'
    }
  ]

  const addWin = (win: Omit<QuickWin, 'id'>) => {
    const newWin: QuickWin = {
      ...win,
      id: Date.now().toString()
    }

    if (editingId) {
      setWins(wins.map(w => w.id === editingId ? newWin : w))
      setEditingId(null)
    } else {
      setWins([...wins, newWin])
    }
    setShowForm(false)
  }

  const addPredefinedWin = (predefined: Omit<QuickWin, 'id' | 'status' | 'notes'>) => {
    const newWin: QuickWin = {
      ...predefined,
      id: Date.now().toString(),
      status: 'not-started',
      notes: ''
    }
    setWins([...wins, newWin])
  }

  const deleteWin = (id: string) => {
    setWins(wins.filter(w => w.id !== id))
  }

  const toggleStatus = (id: string) => {
    setWins(wins.map(w => {
      if (w.id !== id) return w
      const statusOrder: QuickWin['status'][] = ['not-started', 'in-progress', 'completed']
      const currentIndex = statusOrder.indexOf(w.status)
      const nextIndex = (currentIndex + 1) % statusOrder.length
      return { ...w, status: statusOrder[nextIndex] }
    }))
  }

  const filteredWins = filterCategory === 'all' 
    ? wins 
    : wins.filter(w => w.category === filterCategory)

  const getPriorityScore = (win: QuickWin) => {
    const impactScore = win.impact === 'high' ? 3 : win.impact === 'medium' ? 2 : 1
    const effortScore = win.effort === 'low' ? 3 : win.effort === 'medium' ? 2 : 1
    return impactScore + effortScore // Higher is better (high impact + low effort)
  }

  const sortedWins = [...filteredWins].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))

  const exportChecklist = () => {
    const csv = [
      ['Checklist: Victorias Rápidas', projectName || 'Sin nombre'],
      [],
      ['Acción', 'Descripción', 'Impacto', 'Esfuerzo', 'Categoría', 'Estado', 'Notas'],
      ...wins.map(w => [
        w.title,
        w.description,
        w.impact === 'high' ? 'Alto' : w.impact === 'medium' ? 'Medio' : 'Bajo',
        w.effort === 'low' ? 'Bajo' : w.effort === 'medium' ? 'Medio' : 'Alto',
        w.category === 'energy' ? 'Energía' : w.category === 'water' ? 'Agua' : w.category === 'waste' ? 'Residuos' : w.category === 'air' ? 'Aire' : 'Otros',
        w.status === 'not-started' ? 'No Iniciada' : w.status === 'in-progress' ? 'En Progreso' : 'Completada',
        w.notes
      ]),
      [],
      ['Resumen'],
      ['Total Acciones', wins.length],
      ['Completadas', wins.filter(w => w.status === 'completed').length],
      ['En Progreso', wins.filter(w => w.status === 'in-progress').length],
      ['No Iniciadas', wins.filter(w => w.status === 'not-started').length]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `checklist-victorias-rapidas-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Checklist: Victorias Rápidas</h2>
        <p className="text-slate-600">Identifica y prioriza acciones de alto impacto y bajo esfuerzo</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Ej: Mejoras de Sostenibilidad Q1 2024"
        />
      </div>

      {wins.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Victorias Rápidas Predefinidas</h3>
          <p className="text-sm text-blue-800 mb-4">Haz clic en cualquier acción para agregarla a tu checklist:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {predefinedWins.map((win, index) => (
              <button
                key={index}
                onClick={() => addPredefinedWin(win)}
                className="text-left bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-sm text-slate-900 mb-1">{win.title}</div>
                <div className="text-xs text-slate-600">{win.description}</div>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    win.impact === 'high' ? 'bg-green-100 text-green-700' :
                    win.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    Impacto: {win.impact === 'high' ? 'Alto' : win.impact === 'medium' ? 'Medio' : 'Bajo'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    win.effort === 'low' ? 'bg-blue-100 text-blue-700' :
                    win.effort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Esfuerzo: {win.effort === 'low' ? 'Bajo' : win.effort === 'medium' ? 'Medio' : 'Alto'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Acciones ({wins.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Personalizada
            </button>
          </div>
        </div>

        {wins.length > 0 && (
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterCategory === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {['energy', 'water', 'waste', 'air', 'other'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterCategory === cat ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat === 'energy' ? 'Energía' :
                 cat === 'water' ? 'Agua' :
                 cat === 'waste' ? 'Residuos' :
                 cat === 'air' ? 'Aire' : 'Otros'}
              </button>
            ))}
          </div>
        )}

        {sortedWins.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay acciones agregadas aún</p>
            <p className="text-sm">Agrega acciones predefinidas o crea las tuyas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedWins.map((win) => (
              <div key={win.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(win.id)}
                    className="mt-1 flex-shrink-0"
                  >
                    {win.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : win.status === 'in-progress' ? (
                      <Circle className="w-6 h-6 text-blue-600 fill-blue-100" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-slate-900">{win.title}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        win.impact === 'high' ? 'bg-green-100 text-green-700' :
                        win.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Impacto: {win.impact === 'high' ? 'Alto' : win.impact === 'medium' ? 'Medio' : 'Bajo'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        win.effort === 'low' ? 'bg-blue-100 text-blue-700' :
                        win.effort === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Esfuerzo: {win.effort === 'low' ? 'Bajo' : win.effort === 'medium' ? 'Medio' : 'Alto'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        win.status === 'completed' ? 'bg-green-100 text-green-700' :
                        win.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {win.status === 'completed' ? 'Completada' : win.status === 'in-progress' ? 'En Progreso' : 'No Iniciada'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{win.description}</p>
                    {win.notes && (
                      <p className="text-xs text-slate-500 italic">Notas: {win.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(win.id)
                        setShowForm(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteWin(win.id)}
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

      {wins.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total</div>
              <div className="text-2xl font-bold text-slate-900">{wins.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Completadas</div>
              <div className="text-2xl font-bold text-green-600">
                {wins.filter(w => w.status === 'completed').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">En Progreso</div>
              <div className="text-2xl font-bold text-blue-600">
                {wins.filter(w => w.status === 'in-progress').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Alta Prioridad</div>
              <div className="text-2xl font-bold text-teal-600">
                {wins.filter(w => w.impact === 'high' && w.effort === 'low').length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportChecklist}
          disabled={wins.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Checklist
        </button>
        <button
          onClick={() => {
            console.log('Saving quick wins checklist...', { projectName, wins })
          }}
          disabled={wins.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <QuickWinFormModal
          win={editingId ? wins.find(w => w.id === editingId) : undefined}
          onSave={addWin}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function QuickWinFormModal({ win, onSave, onCancel }: {
  win?: QuickWin
  onSave: (win: Omit<QuickWin, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    title: win?.title || '',
    description: win?.description || '',
    impact: (win?.impact || 'medium') as QuickWin['impact'],
    effort: (win?.effort || 'low') as QuickWin['effort'],
    category: (win?.category || 'other') as QuickWin['category'],
    status: (win?.status || 'not-started') as QuickWin['status'],
    notes: win?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{win ? 'Editar' : 'Agregar'} Victoria Rápida</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Instalar sensores de movimiento"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Impacto</label>
              <select
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value as QuickWin['impact'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="high">Alto</option>
                <option value="medium">Medio</option>
                <option value="low">Bajo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Esfuerzo</label>
              <select
                value={formData.effort}
                onChange={(e) => setFormData({ ...formData, effort: e.target.value as QuickWin['effort'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as QuickWin['category'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="energy">Energía</option>
              <option value="water">Agua</option>
              <option value="waste">Residuos</option>
              <option value="air">Aire</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
              placeholder="Notas adicionales..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {win ? 'Actualizar' : 'Agregar'}
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

