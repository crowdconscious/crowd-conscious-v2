'use client'

import { useState } from 'react'
import { FileText, Download, Save, Plus, Trash2 } from 'lucide-react'

interface EmissionSource {
  id: string
  category: 'scope1' | 'scope2' | 'scope3'
  source: string
  fuelType?: string
  consumption: string
  unit: 'L' | 'm³' | 'kWh' | 'km' | 'kg'
  emissionFactor: string
  co2Emissions: number
}

export default function EmissionInventoryTemplate() {
  const [companyName, setCompanyName] = useState('')
  const [reportingPeriod, setReportingPeriod] = useState('')
  const [sources, setSources] = useState<EmissionSource[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const calculateEmissions = (consumption: number, emissionFactor: number): number => {
    return consumption * emissionFactor
  }

  const addSource = (source: Omit<EmissionSource, 'id' | 'co2Emissions'>) => {
    const consumption = parseFloat(source.consumption) || 0
    const factor = parseFloat(source.emissionFactor) || 0
    const co2Emissions = calculateEmissions(consumption, factor)

    const newSource: EmissionSource = {
      ...source,
      id: Date.now().toString(),
      co2Emissions
    }

    if (editingId) {
      setSources(sources.map(s => s.id === editingId ? newSource : s))
      setEditingId(null)
    } else {
      setSources([...sources, newSource])
    }
    setShowForm(false)
  }

  const deleteSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id))
  }

  const totalEmissions = sources.reduce((sum, s) => sum + s.co2Emissions, 0)
  const scope1Emissions = sources.filter(s => s.category === 'scope1').reduce((sum, s) => sum + s.co2Emissions, 0)
  const scope2Emissions = sources.filter(s => s.category === 'scope2').reduce((sum, s) => sum + s.co2Emissions, 0)
  const scope3Emissions = sources.filter(s => s.category === 'scope3').reduce((sum, s) => sum + s.co2Emissions, 0)

  const exportToExcel = () => {
    // Create CSV content
    const headers = ['Categoría', 'Fuente', 'Tipo de Combustible', 'Consumo', 'Unidad', 'Factor de Emisión', 'Emisiones CO2 (kg)']
    const rows = sources.map(s => [
      s.category === 'scope1' ? 'Alcance 1' : s.category === 'scope2' ? 'Alcance 2' : 'Alcance 3',
      s.source,
      s.fuelType || '-',
      s.consumption,
      s.unit,
      s.emissionFactor,
      s.co2Emissions.toFixed(2)
    ])

    const csv = [
      ['Inventario de Emisiones', companyName || 'Sin nombre', reportingPeriod || 'Sin período'],
      [],
      headers,
      ...rows,
      [],
      ['Total Alcance 1', '', '', '', '', '', scope1Emissions.toFixed(2)],
      ['Total Alcance 2', '', '', '', '', '', scope2Emissions.toFixed(2)],
      ['Total Alcance 3', '', '', '', '', '', scope3Emissions.toFixed(2)],
      ['TOTAL', '', '', '', '', '', totalEmissions.toFixed(2)]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `inventario-emisiones-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Inventario de Emisiones</h2>
        <p className="text-slate-600">Documenta todas tus fuentes de emisión y calcula tu huella de carbono</p>
      </div>

      {/* Company Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Ej: Mi Empresa S.A."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Período de Reporte</label>
          <input
            type="text"
            value={reportingPeriod}
            onChange={(e) => setReportingPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Ej: Enero - Diciembre 2024"
          />
        </div>
      </div>

      {/* Emission Factors Reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Factores de Emisión de Referencia (México)</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
          <div>• Gas natural: 2.0 kg CO₂/m³</div>
          <div>• Diésel: 2.68 kg CO₂/L</div>
          <div>• Gasolina: 2.31 kg CO₂/L</div>
          <div>• Electricidad (CFE): 0.458 kg CO₂/kWh</div>
        </div>
      </div>

      {/* Sources List */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Fuentes de Emisión</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Fuente
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay fuentes agregadas aún</p>
            <p className="text-sm">Haz clic en "Agregar Fuente" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      source.category === 'scope1' ? 'bg-red-100 text-red-700' :
                      source.category === 'scope2' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {source.category === 'scope1' ? 'Alcance 1' : source.category === 'scope2' ? 'Alcance 2' : 'Alcance 3'}
                    </span>
                    <span className="font-semibold">{source.source}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {source.consumption} {source.unit} × {source.emissionFactor} = <strong>{source.co2Emissions.toFixed(2)} kg CO₂</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(source.id)
                      setShowForm(true)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteSource(source.id)}
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

      {/* Totals */}
      {sources.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">Resumen de Emisiones</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Alcance 1</div>
              <div className="text-xl font-bold text-red-600">{scope1Emissions.toFixed(2)} kg CO₂</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Alcance 2</div>
              <div className="text-xl font-bold text-blue-600">{scope2Emissions.toFixed(2)} kg CO₂</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Alcance 3</div>
              <div className="text-xl font-bold text-green-600">{scope3Emissions.toFixed(2)} kg CO₂</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">TOTAL</div>
              <div className="text-xl font-bold text-slate-900">{(totalEmissions / 1000).toFixed(2)} ton CO₂</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={exportToExcel}
          disabled={sources.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
        <button
          onClick={() => {
            // Save to database via API
            console.log('Saving inventory...', { companyName, reportingPeriod, sources })
          }}
          disabled={sources.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {/* Add Source Form Modal */}
      {showForm && (
        <SourceFormModal
          source={editingId ? sources.find(s => s.id === editingId) : undefined}
          onSave={addSource}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function SourceFormModal({ source, onSave, onCancel }: {
  source?: EmissionSource
  onSave: (source: Omit<EmissionSource, 'id' | 'co2Emissions'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: (source?.category || 'scope1') as 'scope1' | 'scope2' | 'scope3',
    source: source?.source || '',
    fuelType: source?.fuelType || '',
    consumption: source?.consumption || '',
    unit: (source?.unit || 'L') as 'L' | 'm³' | 'kWh' | 'km' | 'kg',
    emissionFactor: source?.emissionFactor || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">{source ? 'Editar' : 'Agregar'} Fuente de Emisión</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alcance</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="scope1">Alcance 1 - Emisiones Directas</option>
              <option value="scope2">Alcance 2 - Electricidad</option>
              <option value="scope3">Alcance 3 - Otras Indirectas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fuente</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Vehículos de flota"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Combustible (opcional)</label>
            <input
              type="text"
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Diésel"
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
                <option value="L">Litros (L)</option>
                <option value="m³">Metros cúbicos (m³)</option>
                <option value="kWh">Kilovatios-hora (kWh)</option>
                <option value="km">Kilómetros (km)</option>
                <option value="kg">Kilogramos (kg)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Factor de Emisión (kg CO₂/unidad)</label>
            <input
              type="number"
              step="0.001"
              value={formData.emissionFactor}
              onChange={(e) => setFormData({ ...formData, emissionFactor: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: 2.68 para diésel"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {source ? 'Actualizar' : 'Agregar'}
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

