'use client'

import { useState, useEffect } from 'react'
import { Factory, MapPin, Camera, AlertTriangle, CheckCircle, Download, Save } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

interface EmissionSource {
  id: string
  type: string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  photoUrl?: string
  estimatedEmission: number // tons CO2/year
}

interface EmissionSourceIdentifierProps {
  onSave?: (data: EmissionInventory) => void
  className?: string
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

interface EmissionInventory {
  facilityName: string
  assessmentDate: string
  sources: EmissionSource[]
  totalEmissions: number
  prioritySources: EmissionSource[]
}

const sourceTypes = [
  { value: 'smokestack', label: '🏭 Chimenea/Escape', avgEmission: 50 },
  { value: 'vehicle', label: '🚛 Vehículos/Flota', avgEmission: 5 },
  { value: 'generator', label: '⚡ Generador/Motor', avgEmission: 10 },
  { value: 'boiler', label: '🔥 Caldera/Horno', avgEmission: 30 },
  { value: 'process', label: '⚙️ Proceso Industrial', avgEmission: 20 },
  { value: 'storage', label: '🛢️ Almacenamiento Químico', avgEmission: 8 },
  { value: 'loading', label: '📦 Zona de Carga/Descarga', avgEmission: 12 },
  { value: 'waste', label: '🗑️ Gestión de Residuos', avgEmission: 15 },
]

const locations = [
  'Entrada principal',
  'Área de producción',
  'Almacén',
  'Estacionamiento',
  'Zona de carga',
  'Patio trasero',
  'Techo/Azotea',
  'Perímetro exterior',
  'Sala de máquinas',
  'Otra (especificar)'
]

export default function EmissionSourceIdentifier({
  onSave,
  className = '',
  enrollmentId,
  moduleId,
  lessonId
}: EmissionSourceIdentifierProps) {
  const [facilityName, setFacilityName] = useState('')
  const [sources, setSources] = useState<EmissionSource[]>([])
  const [currentSource, setCurrentSource] = useState({
    type: '',
    location: '',
    severity: 'medium' as const,
    description: '',
    estimatedEmission: 0
  })
  const [showForm, setShowForm] = useState(false)
  const [completed, setCompleted] = useState(false)

  // ✨ ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()

  // ✨ Load previous data on mount
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'emission-source-identifier'
        })

        if (savedData && savedData.sources) {
          setFacilityName(savedData.facilityName || '')
          setSources(savedData.sources || [])
          if (savedData.sources.length > 0) {
            setCompleted(true)
          }
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const addSource = () => {
    if (currentSource.type && currentSource.location) {
      const sourceType = sourceTypes.find(t => t.value === currentSource.type)
      const newSource: EmissionSource = {
        id: Date.now().toString(),
        type: currentSource.type,
        location: currentSource.location,
        severity: currentSource.severity,
        description: currentSource.description,
        estimatedEmission: currentSource.estimatedEmission || sourceType?.avgEmission || 10
      }
      
      setSources(prev => [...prev, newSource])
      setCurrentSource({
        type: '',
        location: '',
        severity: 'medium',
        description: '',
        estimatedEmission: 0
      })
      setShowForm(false)
    }
  }

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id))
  }

  const totalEmissions = sources.reduce((sum, s) => sum + s.estimatedEmission, 0)
  const criticalSources = sources.filter(s => s.severity === 'critical' || s.severity === 'high')

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-400 text-red-900'
      case 'high': return 'bg-orange-100 border-orange-400 text-orange-900'
      case 'medium': return 'bg-yellow-100 border-yellow-400 text-yellow-900'
      case 'low': return 'bg-green-100 border-green-400 text-green-900'
      default: return 'bg-slate-100 border-slate-400 text-slate-900'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Crítico'
      case 'high': return 'Alto'
      case 'medium': return 'Medio'
      case 'low': return 'Bajo'
      default: return severity
    }
  }

  const getTypeLabel = (type: string) => {
    return sourceTypes.find(t => t.value === type)?.label || type
  }

  const generateReport = async () => {
    const inventory: EmissionInventory = {
      facilityName,
      assessmentDate: new Date().toISOString().split('T')[0],
      sources,
      totalEmissions,
      prioritySources: criticalSources
    }
    
    setCompleted(true)

    // ✨ Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'emission-source-identifier',
        tool_data: inventory,
        tool_type: 'analyzer'
      })
    }
    
    if (onSave) {
      onSave(inventory)
    }
  }

  if (completed) {
    return (
      <div className={`bg-gradient-to-br from-slate-50 to-zinc-50 border-2 border-slate-300 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Inventario Completo</h3>
            <p className="text-xs sm:text-sm text-slate-700">{facilityName}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-slate-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{sources.length}</div>
            <div className="text-xs sm:text-sm text-slate-600">Fuentes</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 sm:p-4 border-2 border-red-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-900">{criticalSources.length}</div>
            <div className="text-xs sm:text-sm text-red-700">Prioritarias</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border-2 border-orange-200 text-center">
            <div className="text-xl sm:text-2xl font-bold text-orange-900">{totalEmissions.toFixed(1)}</div>
            <div className="text-xs sm:text-sm text-orange-700">Ton CO₂/año</div>
          </div>
        </div>

        {/* Priority Sources */}
        {criticalSources.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="font-bold text-red-900 text-sm sm:text-base">Fuentes Prioritarias:</h4>
            </div>
            <ul className="space-y-2">
              {criticalSources.map((source) => (
                <li key={source.id} className="text-xs sm:text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-500 flex-shrink-0">⚠️</span>
                  <span>
                    <strong>{getTypeLabel(source.type)}</strong> en {source.location} 
                    ({source.estimatedEmission} ton CO₂/año)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All Sources List */}
        <div className="bg-white rounded-lg p-4 border-2 border-slate-200 mb-4">
          <h4 className="font-bold text-slate-900 mb-3 text-sm sm:text-base">Todas las Fuentes:</h4>
          <div className="space-y-2">
            {sources.map((source) => (
              <div key={source.id} className={`p-3 rounded-lg border-2 ${getSeverityColor(source.severity)}`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <div className="font-bold text-sm">{getTypeLabel(source.type)}</div>
                    <div className="text-xs opacity-80">📍 {source.location}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">{source.estimatedEmission} ton/año</div>
                    <div className="text-xs">{getSeverityLabel(source.severity)}</div>
                  </div>
                </div>
                {source.description && (
                  <div className="text-xs mt-2 opacity-90">{source.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-green-900 text-sm sm:text-base">Próximos Pasos:</h4>
          </div>
          <ul className="space-y-2">
            <li className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
              <span className="text-green-500 flex-shrink-0">1.</span>
              <span>Priorizar fuentes críticas y de alto impacto</span>
            </li>
            <li className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
              <span className="text-green-500 flex-shrink-0">2.</span>
              <span>Implementar mediciones con monitores de calidad del aire</span>
            </li>
            <li className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
              <span className="text-green-500 flex-shrink-0">3.</span>
              <span>Desarrollar plan de mitigación por fuente</span>
            </li>
            <li className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
              <span className="text-green-500 flex-shrink-0">4.</span>
              <span>Establecer metas de reducción (ejemplo: -20% en 12 meses)</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => {
            setCompleted(false)
            setSources([])
            setFacilityName('')
          }}
          className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-slate-200 transition-colors min-h-[44px]"
        >
          Crear Nuevo Inventario
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-zinc-50 border-2 border-slate-300 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-slate-600 to-zinc-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Factory className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900">Identificador de Fuentes de Emisión</h3>
          <p className="text-xs sm:text-sm text-slate-700">Mapea las fuentes de contaminación en tu instalación</p>
        </div>
      </div>

      {/* Facility Name */}
      {!facilityName ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Nombre de la Instalación
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            placeholder="Ej: Planta de Manufactura Norte"
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-slate-500 focus:outline-none text-sm sm:text-base"
          />
          <button
            onClick={() => setShowForm(true)}
            disabled={!facilityName}
            className="w-full mt-3 bg-gradient-to-r from-slate-600 to-zinc-700 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Comenzar Inventario
          </button>
        </div>
      ) : (
        <>
          {/* Current Sources Count */}
          <div className="bg-white rounded-lg p-4 border-2 border-slate-200 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-600">Fuentes identificadas</div>
                <div className="text-2xl font-bold text-slate-900">{sources.length}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Emisiones estimadas</div>
                <div className="text-xl font-bold text-orange-600">{totalEmissions.toFixed(1)} ton/año</div>
              </div>
            </div>
          </div>

          {/* Add Source Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-blue-200 transition-colors mb-4 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <MapPin className="w-5 h-5" />
              Agregar Fuente de Emisión
            </button>
          )}

          {/* Add Source Form */}
          {showForm && (
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 mb-4 space-y-3">
              <h4 className="font-bold text-blue-900 text-sm sm:text-base">📍 Nueva Fuente</h4>
              
              {/* Source Type */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Tipo de Fuente</label>
                <select
                  value={currentSource.type}
                  onChange={(e) => {
                    const type = e.target.value
                    const sourceType = sourceTypes.find(t => t.value === type)
                    setCurrentSource(prev => ({ 
                      ...prev, 
                      type,
                      estimatedEmission: sourceType?.avgEmission || 10
                    }))
                  }}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona...</option>
                  {sourceTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Ubicación</label>
                <select
                  value={currentSource.location}
                  onChange={(e) => setCurrentSource(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona...</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Severidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'low', label: 'Bajo', color: 'green' },
                    { value: 'medium', label: 'Medio', color: 'yellow' },
                    { value: 'high', label: 'Alto', color: 'orange' },
                    { value: 'critical', label: 'Crítico', color: 'red' }
                  ].map(sev => (
                    <button
                      key={sev.value}
                      onClick={() => setCurrentSource(prev => ({ ...prev, severity: sev.value as any }))}
                      className={`py-2 rounded-lg border-2 font-medium transition-all text-sm ${
                        currentSource.severity === sev.value
                          ? `border-${sev.color}-500 bg-${sev.color}-50 text-${sev.color}-700`
                          : 'border-blue-200 text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Emission */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Emisión Estimada (ton CO₂/año)
                </label>
                <input
                  type="number"
                  value={currentSource.estimatedEmission || ''}
                  onChange={(e) => setCurrentSource(prev => ({ ...prev, estimatedEmission: parseFloat(e.target.value) || 0 }))}
                  placeholder="10"
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
                />
                <p className="text-xs text-blue-600 mt-1">Estimación automática basada en tipo de fuente</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">Descripción (opcional)</label>
                <textarea
                  value={currentSource.description}
                  onChange={(e) => setCurrentSource(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles adicionales, condiciones de operación..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none text-sm"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addSource}
                  disabled={!currentSource.type || !currentSource.location}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Sources List */}
          {sources.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="font-bold text-slate-900 text-sm">Fuentes Registradas:</h4>
              {sources.map((source) => (
                <div key={source.id} className={`p-3 rounded-lg border-2 ${getSeverityColor(source.severity)} flex justify-between items-start`}>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{getTypeLabel(source.type)}</div>
                    <div className="text-xs opacity-80">📍 {source.location} • {source.estimatedEmission} ton/año</div>
                    {source.description && (
                      <div className="text-xs mt-1 opacity-90">{source.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeSource(source.id)}
                    className="ml-2 text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate Report */}
          <button
            onClick={generateReport}
            disabled={sources.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Save className="w-5 h-5" />
            Generar Inventario ({sources.length} fuentes)
          </button>
        </>
      )}
    </div>
  )
}

