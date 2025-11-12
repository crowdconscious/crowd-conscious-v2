'use client'

import { useState } from 'react'
import { Shield, Download, Save, CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react'

interface SecurityItem {
  id: string
  category: 'lighting' | 'infrastructure' | 'visibility' | 'maintenance' | 'access'
  item: string
  location: string
  status: 'good' | 'needs_improvement' | 'critical'
  notes: string
  priority: 'high' | 'medium' | 'low'
}

export default function SecurityAuditChecklist() {
  const [companyName, setCompanyName] = useState('')
  const [auditDate, setAuditDate] = useState('')
  const [auditorName, setAuditorName] = useState('')
  const [items, setItems] = useState<SecurityItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const addItem = (item: Omit<SecurityItem, 'id'>) => {
    const newItem: SecurityItem = {
      ...item,
      id: Date.now().toString()
    }

    if (editingId) {
      setItems(items.map(i => i.id === editingId ? newItem : i))
      setEditingId(null)
    } else {
      setItems([...items, newItem])
    }
    setShowForm(false)
  }

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const filteredItems = filterCategory === 'all' 
    ? items 
    : items.filter(i => i.category === filterCategory)

  const statusCounts = {
    good: items.filter(i => i.status === 'good').length,
    needs_improvement: items.filter(i => i.status === 'needs_improvement').length,
    critical: items.filter(i => i.status === 'critical').length
  }

  const priorityCounts = {
    high: items.filter(i => i.priority === 'high').length,
    medium: items.filter(i => i.priority === 'medium').length,
    low: items.filter(i => i.priority === 'low').length
  }

  const exportToExcel = () => {
    const csv = [
      ['Auditoría de Seguridad Comunitaria', companyName || 'Sin nombre', auditDate || 'Sin fecha'],
      ['Auditor:', auditorName || 'Sin nombre'],
      [],
      ['Categoría', 'Item', 'Ubicación', 'Estado', 'Prioridad', 'Notas'],
      ...items.map(i => [
        i.category === 'lighting' ? 'Iluminación' :
        i.category === 'infrastructure' ? 'Infraestructura' :
        i.category === 'visibility' ? 'Visibilidad' :
        i.category === 'maintenance' ? 'Mantenimiento' : 'Control de Acceso',
        i.item,
        i.location,
        i.status === 'good' ? 'Bueno' : i.status === 'needs_improvement' ? 'Necesita Mejora' : 'Crítico',
        i.priority === 'high' ? 'Alta' : i.priority === 'medium' ? 'Media' : 'Baja',
        i.notes
      ]),
      [],
      ['Resumen'],
      ['Estado Bueno', statusCounts.good],
      ['Necesita Mejora', statusCounts.needs_improvement],
      ['Crítico', statusCounts.critical],
      [],
      ['Prioridad Alta', priorityCounts.high],
      ['Prioridad Media', priorityCounts.medium],
      ['Prioridad Baja', priorityCounts.low]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria-seguridad-${Date.now()}.csv`
    link.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'needs_improvement':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Checklist de Auditoría de Seguridad</h2>
        <p className="text-slate-600">Evalúa la seguridad del perímetro y espacios públicos alrededor de tus instalaciones</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Empresa/Instalación</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Mi Empresa S.A."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Auditoría</label>
          <input
            type="date"
            value={auditDate}
            onChange={(e) => setAuditDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Auditor</label>
          <input
            type="text"
            value={auditorName}
            onChange={(e) => setAuditorName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Nombre del auditor"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Estado Bueno</div>
            <div className="text-2xl font-bold text-green-600">{statusCounts.good}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-700 mb-1">Necesita Mejora</div>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.needs_improvement}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 mb-1">Crítico</div>
            <div className="text-2xl font-bold text-red-600">{statusCounts.critical}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Prioridad Alta</div>
            <div className="text-2xl font-bold text-blue-600">{priorityCounts.high}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterCategory === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        {['lighting', 'infrastructure', 'visibility', 'maintenance', 'access'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat === 'lighting' ? 'Iluminación' :
             cat === 'infrastructure' ? 'Infraestructura' :
             cat === 'visibility' ? 'Visibilidad' :
             cat === 'maintenance' ? 'Mantenimiento' : 'Acceso'}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Items Evaluados ({filteredItems.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Agregar Item
          </button>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay items evaluados aún</p>
            <p className="text-sm">Haz clic en "Agregar Item" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(item.status)}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.category === 'lighting' ? 'bg-yellow-100 text-yellow-700' :
                        item.category === 'infrastructure' ? 'bg-blue-100 text-blue-700' :
                        item.category === 'visibility' ? 'bg-purple-100 text-purple-700' :
                        item.category === 'maintenance' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.category === 'lighting' ? 'Iluminación' :
                         item.category === 'infrastructure' ? 'Infraestructura' :
                         item.category === 'visibility' ? 'Visibilidad' :
                         item.category === 'maintenance' ? 'Mantenimiento' : 'Acceso'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Prioridad {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 mb-1">{item.item}</div>
                    <div className="text-sm text-slate-600 mb-1">📍 {item.location}</div>
                    {item.notes && (
                      <div className="text-sm text-slate-500 italic">{item.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(item.id)
                        setShowForm(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
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

      <div className="flex gap-3">
        <button
          onClick={exportToExcel}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
        <button
          onClick={() => {
            console.log('Saving security audit...', { companyName, auditDate, auditorName, items })
          }}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <SecurityItemFormModal
          item={editingId ? items.find(i => i.id === editingId) : undefined}
          onSave={addItem}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function SecurityItemFormModal({ item, onSave, onCancel }: {
  item?: SecurityItem
  onSave: (item: Omit<SecurityItem, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (item?.category || 'lighting') as 'lighting' | 'infrastructure' | 'visibility' | 'maintenance' | 'access',
    item: item?.item || '',
    location: item?.location || '',
    status: (item?.status || 'needs_improvement') as 'good' | 'needs_improvement' | 'critical',
    priority: (item?.priority || 'medium') as 'high' | 'medium' | 'low',
    notes: item?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{item ? 'Editar' : 'Agregar'} Item de Seguridad</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="lighting">Iluminación</option>
              <option value="infrastructure">Infraestructura</option>
              <option value="visibility">Visibilidad</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="access">Control de Acceso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item a Evaluar</label>
            <input
              type="text"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Iluminación en calle principal"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Calle Principal, frente a entrada"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="good">Bueno ✅</option>
                <option value="needs_improvement">Necesita Mejora ⚠️</option>
                <option value="critical">Crítico 🔴</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas/Observaciones</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              placeholder="Describe el problema o situación..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {item ? 'Actualizar' : 'Agregar'}
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

