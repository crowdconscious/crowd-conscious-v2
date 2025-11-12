'use client'

import { useState } from 'react'
import { BarChart3, Download, Save, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'

interface Metric {
  id: string
  name: string
  unit: string
  baseline: string
  target: string
  current: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
}

export default function WaterPerformanceDashboard() {
  const [companyName, setCompanyName] = useState('')
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const predefinedMetrics: Omit<Metric, 'id' | 'current'>[] = [
    {
      name: 'Consumo Total de Agua',
      unit: 'm³',
      baseline: '',
      target: '',
      period: 'monthly'
    },
    {
      name: 'Intensidad de Agua',
      unit: 'm³/ton producto',
      baseline: '',
      target: '',
      period: 'monthly'
    },
    {
      name: 'Agua por Empleado',
      unit: 'm³/empleado',
      baseline: '',
      target: '',
      period: 'monthly'
    },
    {
      name: 'Agua Reciclada/Reutilizada',
      unit: '%',
      baseline: '0',
      target: '',
      period: 'monthly'
    },
    {
      name: 'Costo de Agua',
      unit: 'MXN',
      baseline: '',
      target: '',
      period: 'monthly'
    }
  ]

  const addMetric = (metric: Omit<Metric, 'id'>) => {
    const newMetric: Metric = {
      ...metric,
      id: Date.now().toString()
    }

    if (editingId) {
      setMetrics(metrics.map(m => m.id === editingId ? newMetric : m))
      setEditingId(null)
    } else {
      setMetrics([...metrics, newMetric])
    }
    setShowForm(false)
  }

  const addPredefinedMetric = (predefined: Omit<Metric, 'id' | 'current'>) => {
    const newMetric: Metric = {
      ...predefined,
      id: Date.now().toString(),
      current: ''
    }
    setMetrics([...metrics, newMetric])
  }

  const deleteMetric = (id: string) => {
    setMetrics(metrics.filter(m => m.id !== id))
  }

  const calculateProgress = (metric: Metric) => {
    const baseline = parseFloat(metric.baseline) || 0
    const target = parseFloat(metric.target) || 0
    const current = parseFloat(metric.current) || 0

    if (baseline === 0 || target === baseline) return null

    // For reduction metrics (lower is better)
    if (target < baseline) {
      const totalReduction = baseline - target
      const achievedReduction = baseline - current
      return Math.min(100, Math.max(0, (achievedReduction / totalReduction) * 100))
    }
    // For increase metrics (higher is better)
    else {
      const totalIncrease = target - baseline
      const achievedIncrease = current - baseline
      return Math.min(100, Math.max(0, (achievedIncrease / totalIncrease) * 100))
    }
  }

  const exportDashboard = () => {
    const csv = [
      ['Panel de Desempeño Hídrico', companyName || 'Sin nombre'],
      ['Fecha', new Date().toLocaleDateString('es-MX')],
      [],
      ['Métrica', 'Unidad', 'Línea Base', 'Meta', 'Actual', 'Período', 'Progreso (%)'],
      ...metrics.map(m => {
        const progress = calculateProgress(m)
        return [
          m.name,
          m.unit,
          m.baseline || 'N/A',
          m.target || 'N/A',
          m.current || 'N/A',
          m.period === 'daily' ? 'Diario' : m.period === 'weekly' ? 'Semanal' : m.period === 'monthly' ? 'Mensual' : 'Anual',
          progress !== null ? `${progress.toFixed(1)}%` : 'N/A'
        ]
      })
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `panel-desempeno-hidrico-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Panel de Desempeño Hídrico</h2>
        <p className="text-slate-600">Crea un dashboard para monitorear métricas clave de agua</p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Empresa</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Ej: Mi Empresa S.A."
        />
      </div>

      {metrics.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">📊 Métricas Predefinidas</h3>
          <p className="text-sm text-blue-800 mb-4">Haz clic en cualquier métrica para agregarla:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {predefinedMetrics.map((metric, index) => (
              <button
                key={index}
                onClick={() => addPredefinedMetric(metric)}
                className="text-left bg-white rounded-lg p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-sm text-slate-900">{metric.name}</div>
                <div className="text-xs text-slate-600">{metric.unit} ({metric.period === 'daily' ? 'diario' : metric.period === 'weekly' ? 'semanal' : metric.period === 'monthly' ? 'mensual' : 'anual'})</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Métricas ({metrics.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Métrica Personalizada
          </button>
        </div>

        {metrics.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay métricas agregadas aún</p>
            <p className="text-sm">Agrega métricas predefinidas o crea las tuyas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric) => {
              const progress = calculateProgress(metric)
              const isReduction = parseFloat(metric.target || '0') < parseFloat(metric.baseline || '0')
              
              return (
                <div key={metric.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-1">{metric.name}</div>
                      <div className="text-sm text-slate-600">
                        {metric.period === 'daily' ? 'Diario' : metric.period === 'weekly' ? 'Semanal' : metric.period === 'monthly' ? 'Mensual' : 'Anual'}
                        {' • '}
                        {metric.unit}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(metric.id)
                          setShowForm(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteMetric(metric.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Línea Base</div>
                      <div className="text-lg font-semibold text-slate-700">
                        {metric.baseline || 'N/A'} {metric.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Meta</div>
                      <div className="text-lg font-semibold text-teal-600">
                        {metric.target || 'N/A'} {metric.unit}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-600 mb-1">Actual</div>
                      <input
                        type="number"
                        step="0.01"
                        value={metric.current}
                        onChange={(e) => {
                          setMetrics(metrics.map(m => 
                            m.id === metric.id ? { ...m, current: e.target.value } : m
                          ))
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-lg font-semibold"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {progress !== null && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Progreso hacia la meta</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            progress >= 100 ? 'bg-green-500' :
                            progress >= 50 ? 'bg-teal-500' :
                            progress >= 25 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                      {progress >= 100 && (
                        <div className="mt-2 text-sm text-green-600 font-semibold flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" />
                          ¡Meta alcanzada!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Resumen</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-600">Total Métricas</div>
              <div className="text-2xl font-bold text-slate-900">{metrics.length}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Metas Alcanzadas</div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.filter(m => {
                  const progress = calculateProgress(m)
                  return progress !== null && progress >= 100
                }).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">En Progreso</div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.filter(m => {
                  const progress = calculateProgress(m)
                  return progress !== null && progress > 0 && progress < 100
                }).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Sin Datos</div>
              <div className="text-2xl font-bold text-gray-600">
                {metrics.filter(m => !m.current || m.current === '').length}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={exportDashboard}
          disabled={metrics.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Dashboard
        </button>
        <button
          onClick={() => {
            console.log('Saving water performance dashboard...', { companyName, metrics })
          }}
          disabled={metrics.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showForm && (
        <MetricFormModal
          metric={editingId ? metrics.find(m => m.id === editingId) : undefined}
          onSave={addMetric}
          onCancel={() => {
            setShowForm(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}

function MetricFormModal({ metric, onSave, onCancel }: {
  metric?: Metric
  onSave: (metric: Omit<Metric, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: metric?.name || '',
    unit: metric?.unit || '',
    baseline: metric?.baseline || '',
    target: metric?.target || '',
    current: metric?.current || '',
    period: (metric?.period || 'monthly') as Metric['period']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{metric ? 'Editar' : 'Agregar'} Métrica</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Métrica</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Consumo Total de Agua"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Ej: m³, %, MXN"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Período</label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as Metric['period'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Línea Base</label>
              <input
                type="number"
                step="0.01"
                value={formData.baseline}
                onChange={(e) => setFormData({ ...formData, baseline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Meta</label>
              <input
                type="number"
                step="0.01"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {metric ? 'Actualizar' : 'Agregar'}
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

