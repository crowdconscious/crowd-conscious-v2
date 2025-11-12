'use client'

import { useState } from 'react'
import { Droplet, Download, Save, Plus, Trash2, AlertCircle } from 'lucide-react'

interface WaterUse {
  id: string
  category: 'production' | 'support' | 'leaks' | 'other'
  area: string
  use: string
  consumption: string
  unit: 'L/day' | 'm³/day' | 'L/month' | 'm³/month'
  notes: string
}

export default function WaterAuditTemplate() {
  const [companyName, setCompanyName] = useState('')
  const [auditPeriod, setAuditPeriod] = useState('')
  const [uses, setUses] = useState<WaterUse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addUse = (use: Omit<WaterUse, 'id'>) => {
    const newUse: WaterUse = {
      ...use,
      id: Date.now().toString()
    }

    if (editingId) {
      setUses(uses.map(u => u.id === editingId ? newUse : u))
      setEditingId(null)
    } else {
      setUses([...uses, newUse])
    }
    setShowForm(false)
  }

  const deleteUse = (id: string) => {
    setUses(uses.filter(u => u.id !== id))
  }

  // Convert all to L/day for calculation
  const convertToLitersPerDay = (value: number, unit: string): number => {
    if (unit.includes('m³')) {
      const liters = value * 1000 // 1 m³ = 1000 L
      if (unit.includes('month')) return liters / 30
      return liters
    }
    if (unit.includes('month')) return value / 30
    return value
  }

  const totalDailyConsumption = uses.reduce((sum, use) => {
    const value = parseFloat(use.consumption) || 0
    return sum + convertToLitersPerDay(value, use.unit)
  }, 0)

  const totalMonthlyConsumption = totalDailyConsumption * 30
  const totalAnnualConsumption = totalDailyConsumption * 365

  const categoryTotals = {
    production: uses.filter(u => u.category === 'production').reduce((sum, use) => {
      const value = parseFloat(use.consumption) || 0
      return sum + convertToLitersPerDay(value, use.unit)
    }, 0),
    support: uses.filter(u => u.category === 'support').reduce((sum, use) => {
      const value = parseFloat(use.consumption) || 0
      return sum + convertToLitersPerDay(value, use.unit)
    }, 0),
    leaks: uses.filter(u => u.category === 'leaks').reduce((sum, use) => {
      const value = parseFloat(use.consumption) || 0
      return sum + convertToLitersPerDay(value, use.unit)
    }, 0),
    other: uses.filter(u => u.category === 'other').reduce((sum, use) => {
      const value = parseFloat(use.consumption) || 0
      return sum + convertToLitersPerDay(value, use.unit)
    }, 0)
  }

  const exportToExcel = () => {
    const csv = [
      ['Auditoría de Uso de Agua', companyName || 'Sin nombre', auditPeriod || 'Sin período'],
      [],
      ['Categoría', 'Área', 'Uso', 'Consumo', 'Unidad', 'Notas'],
      ...uses.map(u => [
        u.category === 'production' ? 'Producción' : 
        u.category === 'support' ? 'Operaciones de Apoyo' :
        u.category === 'leaks' ? 'Fugas' : 'Otros',
        u.area,
        u.use,
        u.consumption,
        u.unit,
        u.notes
      ]),
      [],
      ['Resumen por Categoría'],
      ['Producción', '', '', `${categoryTotals.production.toFixed(2)}`, 'L/día'],
      ['Operaciones de Apoyo', '', '', `${categoryTotals.support.toFixed(2)}`, 'L/día'],
      ['Fugas', '', '', `${categoryTotals.leaks.toFixed(2)}`, 'L/día'],
      ['Otros', '', '', `${categoryTotals.other.toFixed(2)}`, 'L/día'],
      [],
      ['TOTAL DIARIO', '', '', `${totalDailyConsumption.toFixed(2)}`, 'L/día'],
      ['TOTAL MENSUAL', '', '', `${(totalMonthlyConsumption / 1000).toFixed(2)}`, 'm³/mes'],
      ['TOTAL ANUAL', '', '', `${(totalAnnualConsumption / 1000).toFixed(2)}`, 'm³/año']
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria-agua-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Auditoría de Uso de Agua</h2>
        <p className="text-slate-600">Documenta todos los usos de agua en tu instalación</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Mi Empresa S.A."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Período de Auditoría</label>
          <input
            type="text"
            value={auditPeriod}
            onChange={(e) => setAuditPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Enero 2024"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Usos de Agua Documentados</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Uso
          </button>
        </div>

        {uses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Droplet className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay usos documentados aún</p>
            <p className="text-sm">Haz clic en "Agregar Uso" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uses.map((use) => (
              <div key={use.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      use.category === 'production' ? 'bg-blue-100 text-blue-700' :
                      use.category === 'support' ? 'bg-green-100 text-green-700' :
                      use.category === 'leaks' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {use.category === 'production' ? 'Producción' : 
                       use.category === 'support' ? 'Apoyo' :
                       use.category === 'leaks' ? 'Fugas' : 'Otros'}
                    </span>
                    <span className="font-semibold">{use.area}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-slate-600">{use.use}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>{use.consumption} {use.unit}</strong>
                    {use.notes && <span className="ml-2">• {use.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(use.id)
                      setShowForm(true)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteUse(use.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {uses.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen de Consumo</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-600">Producción</div>
              <div className="text-xl font-bold text-blue-600">{(categoryTotals.production / 1000).toFixed(2)} m³/día</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Operaciones de Apoyo</div>
              <div className="text-xl font-bold text-green-600">{(categoryTotals.support / 1000).toFixed(2)} m³/día</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Fugas</div>
              <div className="text-xl font-bold text-red-600">{(categoryTotals.leaks / 1000).toFixed(2)} m³/día</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Otros</div>
              <div className="text-xl font-bold text-gray-600">{(categoryTotals.other / 1000).toFixed(2)} m³/día</div>
            </div>
          </div>
          <div className="border-t border-slate-300 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-600">Consumo Total Diario</div>
                <div className="text-2xl font-bold text-teal-600">{(totalDailyConsumption / 1000).toFixed(2)} m³/día</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">Consumo Anual</div>
                <div className="text-2xl font-bold text-slate-900">{(totalAnnualConsumption / 1000).toFixed(2)} m³/año</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportToExcel}
          disabled={uses.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
        <button
          onClick={() => {
            console.log('Saving water audit...', { companyName, auditPeriod, uses })
          }}
          disabled={uses.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <WaterUseFormModal
          use={editingId ? uses.find(u => u.id === editingId) : undefined}
          onSave={addUse}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function WaterUseFormModal({ use, onSave, onCancel }: {
  use?: WaterUse
  onSave: (use: Omit<WaterUse, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (use?.category || 'production') as 'production' | 'support' | 'leaks' | 'other',
    area: use?.area || '',
    use: use?.use || '',
    consumption: use?.consumption || '',
    unit: (use?.unit || 'L/day') as 'L/day' | 'm³/day' | 'L/month' | 'm³/month',
    notes: use?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">{use ? 'Editar' : 'Agregar'} Uso de Agua</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="production">Producción</option>
              <option value="support">Operaciones de Apoyo</option>
              <option value="leaks">Fugas</option>
              <option value="other">Otros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Área/Ubicación</label>
            <input
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Línea de producción 1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Uso Específico</label>
            <input
              type="text"
              value={formData.use}
              onChange={(e) => setFormData({ ...formData, use: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Enfriamiento de máquinas"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consumo</label>
              <input
                type="number"
                step="0.01"
                value={formData.consumption}
                onChange={(e) => setFormData({ ...formData, consumption: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="L/day">L/día</option>
                <option value="m³/day">m³/día</option>
                <option value="L/month">L/mes</option>
                <option value="m³/month">m³/mes</option>
              </select>
            </div>
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
              {use ? 'Actualizar' : 'Agregar'}
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

