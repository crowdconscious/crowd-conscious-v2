'use client'

import { useState } from 'react'
import { Trash2, Download, Save, Plus, X, AlertCircle } from 'lucide-react'

interface WasteStream {
  id: string
  category: 'recyclable' | 'organic' | 'special' | 'residual' | 'hazardous'
  material: string
  quantity: string
  unit: 'kg' | 'ton'
  frequency: 'daily' | 'weekly' | 'monthly'
  location: string
  value: string // Potential value if recycled
  notes: string
}

export default function WasteAuditTemplate() {
  const [companyName, setCompanyName] = useState('')
  const [auditPeriod, setAuditPeriod] = useState('')
  const [streams, setStreams] = useState<WasteStream[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const addStream = (stream: Omit<WasteStream, 'id'>) => {
    const newStream: WasteStream = {
      ...stream,
      id: Date.now().toString()
    }

    if (editingId) {
      setStreams(streams.map(s => s.id === editingId ? newStream : s))
      setEditingId(null)
    } else {
      setStreams([...streams, newStream])
    }
    setShowForm(false)
  }

  const deleteStream = (id: string) => {
    setStreams(streams.filter(s => s.id !== id))
  }

  // Convert all to kg/month for calculation
  const convertToKgPerMonth = (quantity: number, unit: string, frequency: string): number => {
    let kg = unit === 'ton' ? quantity * 1000 : quantity
    if (frequency === 'daily') return kg * 30
    if (frequency === 'weekly') return kg * 4.33
    return kg
  }

  const totalMonthlyWaste = streams.reduce((sum, stream) => {
    const quantity = parseFloat(stream.quantity) || 0
    return sum + convertToKgPerMonth(quantity, stream.unit, stream.frequency)
  }, 0)

  const totalAnnualWaste = totalMonthlyWaste * 12

  const categoryTotals = {
    recyclable: streams.filter(s => s.category === 'recyclable').reduce((sum, s) => {
      const qty = parseFloat(s.quantity) || 0
      return sum + convertToKgPerMonth(qty, s.unit, s.frequency)
    }, 0),
    organic: streams.filter(s => s.category === 'organic').reduce((sum, s) => {
      const qty = parseFloat(s.quantity) || 0
      return sum + convertToKgPerMonth(qty, s.unit, s.frequency)
    }, 0),
    special: streams.filter(s => s.category === 'special').reduce((sum, s) => {
      const qty = parseFloat(s.quantity) || 0
      return sum + convertToKgPerMonth(qty, s.unit, s.frequency)
    }, 0),
    residual: streams.filter(s => s.category === 'residual').reduce((sum, s) => {
      const qty = parseFloat(s.quantity) || 0
      return sum + convertToKgPerMonth(qty, s.unit, s.frequency)
    }, 0),
    hazardous: streams.filter(s => s.category === 'hazardous').reduce((sum, s) => {
      const qty = parseFloat(s.quantity) || 0
      return sum + convertToKgPerMonth(qty, s.unit, s.frequency)
    }, 0)
  }

  const totalPotentialValue = streams.reduce((sum, stream) => {
    const value = parseFloat(stream.value) || 0
    const qty = parseFloat(stream.quantity) || 0
    const monthlyQty = convertToKgPerMonth(qty, stream.unit, stream.frequency)
    // Assume value is per kg
    return sum + (value * monthlyQty)
  }, 0)

  const exportToExcel = () => {
    const csv = [
      ['Auditoría de Flujos de Residuos', companyName || 'Sin nombre', auditPeriod || 'Sin período'],
      [],
      ['Categoría', 'Material', 'Cantidad', 'Unidad', 'Frecuencia', 'Ubicación', 'Valor Potencial (MXN/kg)', 'Notas'],
      ...streams.map(s => [
        s.category === 'recyclable' ? 'Reciclables' :
        s.category === 'organic' ? 'Orgánicos' :
        s.category === 'special' ? 'Especiales' :
        s.category === 'residual' ? 'Residuales' : 'Peligrosos',
        s.material,
        s.quantity,
        s.unit,
        s.frequency === 'daily' ? 'Diario' : s.frequency === 'weekly' ? 'Semanal' : 'Mensual',
        s.location,
        s.value || '0',
        s.notes
      ]),
      [],
      ['Resumen por Categoría (kg/mes)'],
      ['Reciclables', categoryTotals.recyclable.toFixed(2)],
      ['Orgánicos', categoryTotals.organic.toFixed(2)],
      ['Especiales', categoryTotals.special.toFixed(2)],
      ['Residuales', categoryTotals.residual.toFixed(2)],
      ['Peligrosos', categoryTotals.hazardous.toFixed(2)],
      [],
      ['TOTAL MENSUAL', totalMonthlyWaste.toFixed(2), 'kg/mes'],
      ['TOTAL ANUAL', totalAnnualWaste.toFixed(2), 'kg/año'],
      ['Valor Potencial Total (MXN/mes)', totalPotentialValue.toFixed(2)]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria-residuos-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Auditoría de Flujos de Residuos</h2>
        <p className="text-slate-600">Mapea y cuantifica cada flujo de residuos en tu instalación</p>
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
            placeholder="Ej: Semana del 1-7 de Enero 2024"
          />
        </div>
      </div>

      {/* Reference Values */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Valores de Referencia para Reciclables (MXN/kg)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
          <div>• Cartón: $0.50-0.80</div>
          <div>• Aluminio: $15-20</div>
          <div>• Plástico limpio: $2-4</div>
          <div>• Acero/Metal: $3-5</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Flujos de Residuos ({streams.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Flujo
          </button>
        </div>

        {streams.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <Trash2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay flujos documentados aún</p>
            <p className="text-sm">Haz clic en "Agregar Flujo" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {streams.map((stream) => (
              <div key={stream.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        stream.category === 'recyclable' ? 'bg-blue-100 text-blue-700' :
                        stream.category === 'organic' ? 'bg-green-100 text-green-700' :
                        stream.category === 'special' ? 'bg-purple-100 text-purple-700' :
                        stream.category === 'residual' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {stream.category === 'recyclable' ? 'Reciclable' :
                         stream.category === 'organic' ? 'Orgánico' :
                         stream.category === 'special' ? 'Especial' :
                         stream.category === 'residual' ? 'Residual' : 'Peligroso'}
                      </span>
                      <span className="font-semibold text-slate-900">{stream.material}</span>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">
                      <strong>{stream.quantity} {stream.unit}</strong> / {stream.frequency === 'daily' ? 'día' : stream.frequency === 'weekly' ? 'semana' : 'mes'}
                      {' • '}
                      📍 {stream.location}
                      {stream.value && parseFloat(stream.value) > 0 && (
                        <span className="text-green-600 font-medium">
                          {' • Valor: $' + stream.value + '/kg'}
                        </span>
                      )}
                    </div>
                    {stream.notes && (
                      <div className="text-sm text-slate-500 italic">{stream.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(stream.id)
                        setShowForm(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteStream(stream.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {streams.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen de Residuos</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <div className="text-sm text-slate-600">Reciclables</div>
              <div className="text-xl font-bold text-blue-600">{(categoryTotals.recyclable / 1000).toFixed(2)} ton/mes</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Orgánicos</div>
              <div className="text-xl font-bold text-green-600">{(categoryTotals.organic / 1000).toFixed(2)} ton/mes</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Especiales</div>
              <div className="text-xl font-bold text-purple-600">{(categoryTotals.special / 1000).toFixed(2)} ton/mes</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Residuales</div>
              <div className="text-xl font-bold text-gray-600">{(categoryTotals.residual / 1000).toFixed(2)} ton/mes</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Peligrosos</div>
              <div className="text-xl font-bold text-red-600">{(categoryTotals.hazardous / 1000).toFixed(2)} ton/mes</div>
            </div>
          </div>
          <div className="border-t border-slate-300 pt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total Mensual</div>
              <div className="text-2xl font-bold text-teal-600">{(totalMonthlyWaste / 1000).toFixed(2)} ton/mes</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Valor Potencial</div>
              <div className="text-2xl font-bold text-green-600">${totalPotentialValue.toLocaleString('es-MX')} MXN/mes</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportToExcel}
          disabled={streams.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
        <button
          onClick={() => {
            console.log('Saving waste audit...', { companyName, auditPeriod, streams })
          }}
          disabled={streams.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <WasteStreamFormModal
          stream={editingId ? streams.find(s => s.id === editingId) : undefined}
          onSave={addStream}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function WasteStreamFormModal({ stream, onSave, onCancel }: {
  stream?: WasteStream
  onSave: (stream: Omit<WasteStream, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (stream?.category || 'recyclable') as 'recyclable' | 'organic' | 'special' | 'residual' | 'hazardous',
    material: stream?.material || '',
    quantity: stream?.quantity || '',
    unit: (stream?.unit || 'kg') as 'kg' | 'ton',
    frequency: (stream?.frequency || 'daily') as 'daily' | 'weekly' | 'monthly',
    location: stream?.location || '',
    value: stream?.value || '',
    notes: stream?.notes || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{stream ? 'Editar' : 'Agregar'} Flujo de Residuos</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="recyclable">Reciclables (cartón, plástico, vidrio, metal)</option>
              <option value="organic">Orgánicos (alimentos, jardín)</option>
              <option value="special">Especiales (madera, textiles, electrónicos)</option>
              <option value="residual">Residuales (no reciclables)</option>
              <option value="hazardous">Peligrosos (químicos, baterías)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Cartón corrugado"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <input
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
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
                <option value="kg">kg</option>
                <option value="ton">ton</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frecuencia</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación/Área</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Área de producción, línea 1"
              required
            />
          </div>
          {formData.category === 'recyclable' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Potencial (MXN/kg)</label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Ej: 0.50 para cartón"
              />
            </div>
          )}
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
              {stream ? 'Actualizar' : 'Agregar'}
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

