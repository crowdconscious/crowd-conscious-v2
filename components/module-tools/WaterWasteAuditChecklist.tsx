'use client'

import { useState } from 'react'
import { Droplet, AlertTriangle, CheckCircle, Download, Save, Plus, Trash2 } from 'lucide-react'

interface AuditItem {
  id: string
  category: 'leaks' | 'equipment' | 'behavior' | 'maintenance'
  item: string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  estimatedWaste: string // L/day
  fixCost: string
  priority: 'high' | 'medium' | 'low'
  status: 'not-found' | 'found' | 'fixed'
  notes: string
}

export default function WaterWasteAuditChecklist() {
  const [facilityName, setFacilityName] = useState('')
  const [auditDate, setAuditDate] = useState('')
  const [items, setItems] = useState<AuditItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const predefinedItems: Omit<AuditItem, 'id' | 'status' | 'notes' | 'estimatedWaste' | 'fixCost' | 'priority'>[] = [
    { category: 'leaks', item: 'Fuga en llave/grifo', location: '', severity: 'medium' },
    { category: 'leaks', item: 'Fuga en tubería', location: '', severity: 'high' },
    { category: 'leaks', item: 'Inodoro con fuga constante', location: '', severity: 'high' },
    { category: 'leaks', item: 'Mingitorio con fuga', location: '', severity: 'medium' },
    { category: 'equipment', item: 'Manguera sin cierre automático', location: '', severity: 'low' },
    { category: 'equipment', item: 'Sistema de riego con fugas', location: '', severity: 'high' },
    { category: 'equipment', item: 'Enfriamiento sin recirculación', location: '', severity: 'medium' },
    { category: 'behavior', item: 'Limpieza con manguera (en vez de cubeta)', location: '', severity: 'medium' },
    { category: 'behavior', item: 'Llaves dejadas abiertas', location: '', severity: 'low' },
    { category: 'maintenance', item: 'Sin dispositivos ahorradores', location: '', severity: 'medium' },
    { category: 'maintenance', item: 'Presión excesiva de agua', location: '', severity: 'low' },
    { category: 'maintenance', item: 'Equipos sin mantenimiento preventivo', location: '', severity: 'medium' }
  ]

  const addItem = (item: Omit<AuditItem, 'id'>) => {
    const newItem: AuditItem = {
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

  const addPredefinedItem = (predefined: Omit<AuditItem, 'id' | 'status' | 'notes' | 'estimatedWaste' | 'fixCost' | 'priority'>) => {
    const newItem: AuditItem = {
      ...predefined,
      id: Date.now().toString(),
      status: 'not-found',
      notes: '',
      estimatedWaste: '',
      fixCost: '',
      priority: 'medium'
    }
    setItems([...items, newItem])
  }

  const deleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const totalWaste = items.reduce((sum, item) => {
    const waste = parseFloat(item.estimatedWaste) || 0
    return sum + waste
  }, 0)

  const totalCost = items.reduce((sum, item) => {
    const cost = parseFloat(item.fixCost) || 0
    return sum + cost
  }, 0)

  const exportChecklist = () => {
    const csv = [
      ['Checklist: Auditoría de Desperdicios de Agua', facilityName || 'Sin nombre', auditDate || 'Sin fecha'],
      [],
      ['Categoría', 'Item', 'Ubicación', 'Severidad', 'Desperdicio (L/día)', 'Costo Reparación (MXN)', 'Prioridad', 'Estado', 'Notas'],
      ...items.map(i => [
        i.category === 'leaks' ? 'Fugas' :
        i.category === 'equipment' ? 'Equipos' :
        i.category === 'behavior' ? 'Comportamiento' : 'Mantenimiento',
        i.item,
        i.location,
        i.severity === 'critical' ? 'Crítica' : i.severity === 'high' ? 'Alta' : i.severity === 'medium' ? 'Media' : 'Baja',
        i.estimatedWaste || '0',
        i.fixCost || '0',
        i.priority === 'high' ? 'Alta' : i.priority === 'medium' ? 'Media' : 'Baja',
        i.status === 'not-found' ? 'No Encontrado' : i.status === 'found' ? 'Encontrado' : 'Reparado',
        i.notes
      ]),
      [],
      ['Resumen'],
      ['Total Items', items.length],
      ['Desperdicio Total', `${totalWaste.toFixed(2)} L/día`],
      ['Costo Total Reparación', `$${totalCost.toFixed(2)} MXN`],
      ['Items Críticos', items.filter(i => i.severity === 'critical').length],
      ['Items Reparados', items.filter(i => i.status === 'fixed').length]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `checklist-auditoria-desperdicios-agua-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Checklist: Auditoría de Desperdicios de Agua</h2>
        <p className="text-slate-600">Checklist completo para auditar desperdicios de agua en tu instalación</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Instalación</label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Planta Principal"
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
      </div>

      {items.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Items Predefinidos</h3>
          <p className="text-sm text-blue-800 mb-4">Haz clic en cualquier item para agregarlo a tu checklist:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {predefinedItems.map((item, index) => (
              <button
                key={index}
                onClick={() => addPredefinedItem(item)}
                className="text-left bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-sm text-slate-900">{item.item}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {item.category === 'leaks' ? 'Fugas' :
                   item.category === 'equipment' ? 'Equipos' :
                   item.category === 'behavior' ? 'Comportamiento' : 'Mantenimiento'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Items de Auditoría ({items.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Item Personalizado
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Droplet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay items agregados aún</p>
            <p className="text-sm">Agrega items predefinidos o crea los tuyos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        item.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        item.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.severity === 'critical' ? 'Crítica' : item.severity === 'high' ? 'Alta' : item.severity === 'medium' ? 'Media' : 'Baja'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.priority === 'high' ? 'bg-red-100 text-red-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        Prioridad {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Media' : 'Baja'}
                      </span>
                      <span className="font-semibold text-slate-900">{item.item}</span>
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      📍 {item.location || 'Ubicación no especificada'}
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      {item.estimatedWaste && (
                        <span>💧 {item.estimatedWaste} L/día</span>
                      )}
                      {item.fixCost && (
                        <span>💰 ${item.fixCost} MXN</span>
                      )}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-slate-500 italic mt-1">Notas: {item.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <select
                      value={item.status}
                      onChange={(e) => {
                        setItems(items.map(i => 
                          i.id === item.id ? { ...i, status: e.target.value as AuditItem['status'] } : i
                        ))
                      }}
                      className="text-xs px-2 py-1 border border-slate-300 rounded"
                    >
                      <option value="not-found">No Encontrado</option>
                      <option value="found">Encontrado</option>
                      <option value="fixed">Reparado</option>
                    </select>
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

      {items.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total Items</div>
              <div className="text-2xl font-bold text-slate-900">{items.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Desperdicio Total</div>
              <div className="text-2xl font-bold text-red-600">{totalWaste.toFixed(2)} L/día</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Costo Reparación</div>
              <div className="text-2xl font-bold text-orange-600">${totalCost.toFixed(2)} MXN</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Reparados</div>
              <div className="text-2xl font-bold text-green-600">
                {items.filter(i => i.status === 'fixed').length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportChecklist}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Checklist
        </button>
        <button
          onClick={() => {
            console.log('Saving water waste audit checklist...', { facilityName, auditDate, items })
          }}
          disabled={items.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <AuditItemFormModal
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

function AuditItemFormModal({ item, onSave, onCancel }: {
  item?: AuditItem
  onSave: (item: Omit<AuditItem, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (item?.category || 'leaks') as AuditItem['category'],
    item: item?.item || '',
    location: item?.location || '',
    severity: (item?.severity || 'medium') as AuditItem['severity'],
    estimatedWaste: item?.estimatedWaste || '',
    fixCost: item?.fixCost || '',
    priority: (item?.priority || 'medium') as AuditItem['priority'],
    status: (item?.status || 'not-found') as AuditItem['status'],
    notes: item?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{item ? 'Editar' : 'Agregar'} Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as AuditItem['category'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="leaks">Fugas</option>
              <option value="equipment">Equipos</option>
              <option value="behavior">Comportamiento</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
            <input
              type="text"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Fuga en llave del baño"
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
              placeholder="Ej: Baño principal, segundo piso"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severidad</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as AuditItem['severity'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as AuditItem['priority'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Desperdicio (L/día)</label>
              <input
                type="number"
                step="0.1"
                value={formData.estimatedWaste}
                onChange={(e) => setFormData({ ...formData, estimatedWaste: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Costo Reparación (MXN)</label>
              <input
                type="number"
                step="0.01"
                value={formData.fixCost}
                onChange={(e) => setFormData({ ...formData, fixCost: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as AuditItem['status'] })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="not-found">No Encontrado</option>
              <option value="found">Encontrado</option>
              <option value="fixed">Reparado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
              placeholder="Observaciones adicionales..."
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

