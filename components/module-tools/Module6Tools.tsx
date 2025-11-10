'use client'

import { useState, useEffect } from 'react'
import { LayoutDashboard, FileText, Users, Award, TrendingUp, Target } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

// =========================================================
// TOOL 1: Impact Dashboard Builder
// =========================================================
interface DashboardMetric {
  id: string
  module: string
  metric: string
  value: string
  trend: 'up' | 'down' | 'stable'
}

export function ImpactDashboardBuilder({ onBuild, enrollmentId, moduleId, lessonId }: { 
  onBuild?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [dashboardName, setDashboardName] = useState('')
  const [built, setBuilt] = useState(false)

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ lesson_id: lessonId, module_id: moduleId, tool_name: 'impact-dashboard-builder' })
        .then(data => { 
          if (data?.selectedMetrics) setSelectedMetrics(data.selectedMetrics)
          if (data?.dashboardName) setDashboardName(data.dashboardName)
        })
    }
  }, [enrollmentId, moduleId, lessonId])

  const handleBuildWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'impact-dashboard-builder',
        tool_data: data,
        tool_type: 'planner'
      })
    }
    onBuild?.(data)
  }

  const availableMetrics = [
    { module: '🌬️ Aire Limpio', metric: 'AQI Promedio', value: 'air-quality-aqi' },
    { module: '🌬️ Aire Limpio', metric: 'Emisiones Reducidas (kg CO₂)', value: 'air-emissions' },
    { module: '💧 Agua Limpia', metric: 'Ahorro de Agua (m³)', value: 'water-savings' },
    { module: '💧 Agua Limpia', metric: 'Calidad de Agua (pH)', value: 'water-quality' },
    { module: '🏙️ Ciudades Seguras', metric: 'Incidentes de Seguridad', value: 'safety-incidents' },
    { module: '🏙️ Ciudades Seguras', metric: 'Inversión en Seguridad', value: 'safety-investment' },
    { module: '♻️ Cero Residuos', metric: 'Tasa de Reciclaje (%)', value: 'waste-recycling' },
    { module: '♻️ Cero Residuos', metric: 'Residuos Desviados (kg)', value: 'waste-diverted' },
    { module: '🤝 Comercio Justo', metric: 'Gasto Local (%)', value: 'local-spend' },
    { module: '🤝 Comercio Justo', metric: 'Empleos Sostenidos', value: 'jobs-supported' }
  ]

  const toggleMetric = (value: string) => {
    setSelectedMetrics(prev =>
      prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]
    )
  }

  const buildDashboard = () => {
    setBuilt(true)
    if (onBuild) {
      onBuild({ dashboardName, metrics: selectedMetrics, createdAt: new Date().toISOString() })
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Constructor de Dashboard de Impacto</h3>
          <p className="text-xs sm:text-sm text-blue-700">Selecciona KPIs de todos los módulos</p>
        </div>
      </div>

      {!built ? (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del dashboard (ej: Reporte Q4 2025)"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
          />

          <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
            <div className="text-xs text-blue-800 mb-2">
              <strong>📊 Selecciona hasta 6 métricas:</strong> ({selectedMetrics.length}/6)
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableMetrics.map((m) => (
              <button
                key={m.value}
                onClick={() => toggleMetric(m.value)}
                disabled={!selectedMetrics.includes(m.value) && selectedMetrics.length >= 6}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedMetrics.includes(m.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-blue-200 hover:border-blue-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs opacity-80">{m.module}</div>
                    <div className="font-medium text-sm">{m.metric}</div>
                  </div>
                  <div className="text-xl">
                    {selectedMetrics.includes(m.value) ? '✓' : '○'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={buildDashboard}
            disabled={!dashboardName || selectedMetrics.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Construir Dashboard
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
            <div className="text-center mb-3">
              <div className="text-2xl mb-1">📊</div>
              <div className="font-bold text-blue-900">{dashboardName}</div>
              <div className="text-xs text-blue-700 mt-1">
                {selectedMetrics.length} métricas seleccionadas
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-bold text-green-900 mb-2">Dashboard Configurado</div>
              <div className="text-xs text-green-800">
                Tu selección ha sido guardada. Los datos se actualizarán automáticamente
                desde los módulos completados.
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setBuilt(false)
              setDashboardName('')
              setSelectedMetrics([])
            }}
            className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg font-medium text-sm hover:bg-blue-200 min-h-[44px]"
          >
            Crear Otro Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 2: ESG Report Generator
// =========================================================
export function ESGReportGenerator({ onGenerate, enrollmentId, moduleId, lessonId }: { 
  onGenerate?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleGenerateWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'esg-report-generator',
        tool_data: data,
        tool_type: 'calculator'
      })
    }
    onGenerate?.(data)
  }
  const [reportType, setReportType] = useState('')
  const [period, setPeriod] = useState('')
  const [generated, setGenerated] = useState(false)

  const reportTypes = [
    { value: 'quarterly', label: 'Trimestral', icon: '📅' },
    { value: 'annual', label: 'Anual', icon: '📆' },
    { value: 'custom', label: 'Personalizado', icon: '🎯' }
  ]

  const generate = () => {
    setGenerated(true)
    if (onGenerate) {
      onGenerate({ reportType, period, generatedAt: new Date().toISOString() })
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-green-900">Generador de Reporte ESG</h3>
          <p className="text-xs sm:text-sm text-green-700">Consolida todos tus datos de impacto</p>
        </div>
      </div>

      {!generated ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {reportTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  reportType === type.value
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-slate-700 border-green-200 hover:border-green-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <div className="font-bold">{type.label}</div>
                    <div className="text-xs opacity-80">
                      {type.value === 'quarterly' && 'Ideal para reportes trimestrales'}
                      {type.value === 'annual' && 'Reporte anual completo'}
                      {type.value === 'custom' && 'Selecciona fechas específicas'}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm"
          >
            <option value="">Selecciona período...</option>
            <option value="Q4-2025">Q4 2025 (Oct-Dic)</option>
            <option value="2025">Año 2025</option>
            <option value="2024">Año 2024</option>
          </select>

          <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-xs">
            <strong>📋 Tu reporte incluirá:</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• Reducción de emisiones y ahorro de energía</li>
              <li>• Gestión de agua y residuos</li>
              <li>• Impacto social y empleos dignos</li>
              <li>• Compras responsables y cadena de suministro</li>
              <li>• Seguridad y espacios inclusivos</li>
            </ul>
          </div>

          <button
            onClick={generate}
            disabled={!reportType || !period}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Generar Reporte ESG
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-green-300">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="font-bold text-green-900 text-lg">Reporte ESG {period}</div>
              <div className="text-xs text-green-700 mt-2">
                Tipo: {reportTypes.find(t => t.value === reportType)?.label}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-100 rounded-lg p-3 text-center border border-green-300">
              <div className="text-xl">🌍</div>
              <div className="text-xs font-medium mt-1">Ambiental</div>
            </div>
            <div className="bg-blue-100 rounded-lg p-3 text-center border border-blue-300">
              <div className="text-xl">👥</div>
              <div className="text-xs font-medium mt-1">Social</div>
            </div>
            <div className="bg-purple-100 rounded-lg p-3 text-center border border-purple-300">
              <div className="text-xl">⚖️</div>
              <div className="text-xs font-medium mt-1">Gobernanza</div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-xs">
            <strong>💡 Próximamente:</strong> Descarga en PDF con gráficas interactivas,
            benchmarking sectorial, y comparación histórica.
          </div>

          <button
            onClick={() => {
              setGenerated(false)
              setReportType('')
              setPeriod('')
            }}
            className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-medium text-sm hover:bg-green-200 min-h-[44px]"
          >
            Generar Nuevo Reporte
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 3: Stakeholder Communication Planner
// =========================================================
interface Stakeholder {
  id: string
  name: string
  type: string
  priority: 'high' | 'medium' | 'low'
  interests: string[]
}

export function StakeholderCommunicationPlanner({ onPlan, enrollmentId, moduleId, lessonId }: { 
  onPlan?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handlePlanWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'stakeholder-communication-planner',
        tool_data: data,
        tool_type: 'planner'
      })
    }
    onPlan?.(data)
  }
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentStakeholder, setCurrentStakeholder] = useState<Partial<Stakeholder>>({
    name: '',
    type: 'investors',
    priority: 'medium',
    interests: []
  })

  const stakeholderTypes = [
    { value: 'investors', label: '💰 Inversionistas', interests: ['ROI', 'Riesgo', 'ESG'] },
    { value: 'employees', label: '👥 Empleados', interests: ['Seguridad', 'Bienestar', 'Capacitación'] },
    { value: 'community', label: '🏘️ Comunidad Local', interests: ['Empleo', 'Ambiente', 'Seguridad'] },
    { value: 'customers', label: '🛒 Clientes', interests: ['Calidad', 'Ética', 'Sustentabilidad'] },
    { value: 'suppliers', label: '🚚 Proveedores', interests: ['Comercio Justo', 'Pago Puntual', 'Largo Plazo'] },
    { value: 'government', label: '🏛️ Autoridades', interests: ['Cumplimiento', 'Impuestos', 'Empleo'] }
  ]

  const addStakeholder = () => {
    if (currentStakeholder.name) {
      const typeData = stakeholderTypes.find(t => t.value === currentStakeholder.type)
      const newStakeholder: Stakeholder = {
        id: Date.now().toString(),
        name: currentStakeholder.name,
        type: currentStakeholder.type || 'investors',
        priority: currentStakeholder.priority || 'medium',
        interests: typeData?.interests || []
      }

      const updated = [...stakeholders, newStakeholder]
      setStakeholders(updated)
      setCurrentStakeholder({ name: '', type: 'investors', priority: 'medium', interests: [] })
      setShowForm(false)

      if (onPlan) {
        onPlan({ stakeholders: updated })
      }
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-amber-900">Planificador de Comunicación</h3>
          <p className="text-xs sm:text-sm text-amber-700">Identifica stakeholders y adapta mensajes</p>
        </div>
      </div>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors mb-4 min-h-[44px]"
        >
          + Agregar Stakeholder
        </button>
      )}

      {showForm && (
        <div className="bg-amber-100 rounded-xl p-4 border-2 border-amber-300 mb-4 space-y-3">
          <h4 className="font-bold text-amber-900 text-sm">Nuevo Stakeholder</h4>

          <input
            type="text"
            placeholder="Nombre del grupo o persona"
            value={currentStakeholder.name}
            onChange={(e) => setCurrentStakeholder(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:outline-none text-sm"
          />

          <select
            value={currentStakeholder.type}
            onChange={(e) => setCurrentStakeholder(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:outline-none text-sm"
          >
            {stakeholderTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <select
            value={currentStakeholder.priority}
            onChange={(e) => setCurrentStakeholder(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-amber-300 focus:border-amber-500 focus:outline-none text-sm"
          >
            <option value="high">🔴 Alta Prioridad</option>
            <option value="medium">🟡 Media Prioridad</option>
            <option value="low">🟢 Baja Prioridad</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-200 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={addStakeholder}
              disabled={!currentStakeholder.name}
              className="flex-1 bg-amber-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-amber-700 disabled:opacity-50 min-h-[44px]"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {stakeholders.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-amber-900 text-sm">Mapa de Stakeholders:</h4>
          {stakeholders.map((sh) => (
            <div
              key={sh.id}
              className={`p-3 rounded-lg border-2 ${
                sh.priority === 'high' ? 'bg-red-50 border-red-300' :
                sh.priority === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                'bg-green-50 border-green-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-sm">{sh.name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Intereses clave: {sh.interests.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => setStakeholders(prev => prev.filter(s => s.id !== sh.id))}
                  className="text-red-600 text-xs font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 4: Certification Hub
// =========================================================
export function CertificationHub({ enrollmentId, moduleId, lessonId }: { 
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
} = {}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleCertClick = async (certName: string) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'certification-hub',
        tool_data: { viewedCert: certName, timestamp: new Date().toISOString() },
        tool_type: 'tracker'
      })
    }
  }
  const [certifications] = useState([
    { module: 'Aire Limpio', status: 'earned', date: '2025-10-15' },
    { module: 'Agua Limpia', status: 'earned', date: '2025-11-02' },
    { module: 'Ciudades Seguras', status: 'in_progress', progress: 60 },
    { module: 'Cero Residuos', status: 'locked' },
    { module: 'Comercio Justo', status: 'locked' },
    { module: 'Integración de Impacto', status: 'locked' }
  ])

  const earnedCount = certifications.filter(c => c.status === 'earned').length
  const totalCount = certifications.length

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-purple-900">Centro de Certificaciones</h3>
          <p className="text-xs sm:text-sm text-purple-700">Visualiza tus credenciales</p>
        </div>
      </div>

      <div className="mb-4 bg-white rounded-lg p-4 border-2 border-purple-200">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-900">{earnedCount}/{totalCount}</div>
          <div className="text-sm text-purple-700">Certificaciones Completadas</div>
          <div className="mt-2 bg-purple-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
              style={{ width: `${(earnedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {certifications.map((cert, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-2 ${
              cert.status === 'earned' ? 'bg-green-50 border-green-300' :
              cert.status === 'in_progress' ? 'bg-blue-50 border-blue-300' :
              'bg-slate-50 border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-bold text-sm flex items-center gap-2">
                  {cert.status === 'earned' && <span className="text-lg">🏆</span>}
                  {cert.status === 'in_progress' && <span className="text-lg">📚</span>}
                  {cert.status === 'locked' && <span className="text-lg">🔒</span>}
                  {cert.module}
                </div>
                {'date' in cert && cert.date && (
                  <div className="text-xs text-green-700 mt-1">
                    Completado: {new Date(cert.date).toLocaleDateString('es-MX')}
                  </div>
                )}
                {'progress' in cert && (
                  <div className="text-xs text-blue-700 mt-1">
                    Progreso: {cert.progress}%
                  </div>
                )}
              </div>
              {cert.status === 'earned' && (
                <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded font-medium hover:bg-purple-700">
                  Ver
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =========================================================
// TOOL 5: Continuous Improvement Tracker
// =========================================================
interface Goal {
  id: string
  category: string
  goal: string
  target: string
  deadline: string
  status: 'on_track' | 'at_risk' | 'completed'
}

export function ContinuousImprovementTracker({ onTrack, enrollmentId, moduleId, lessonId }: { 
  onTrack?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ lesson_id: lessonId, module_id: moduleId, tool_name: 'continuous-improvement-tracker' })
        .then(data => { if (data?.goals) setGoals(data.goals) })
    }
  }, [enrollmentId, moduleId, lessonId])

  const handleTrackWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'continuous-improvement-tracker',
        tool_data: data,
        tool_type: 'tracker'
      })
    }
    onTrack?.(data)
  }
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentGoal, setCurrentGoal] = useState<Partial<Goal>>({
    category: 'environment',
    goal: '',
    target: '',
    deadline: '',
    status: 'on_track'
  })

  const categories = [
    { value: 'environment', label: '🌍 Ambiental', color: 'green' },
    { value: 'social', label: '👥 Social', color: 'blue' },
    { value: 'governance', label: '⚖️ Gobernanza', color: 'purple' }
  ]

  const addGoal = () => {
    if (currentGoal.goal && currentGoal.target && currentGoal.deadline) {
      const newGoal: Goal = {
        id: Date.now().toString(),
        category: currentGoal.category || 'environment',
        goal: currentGoal.goal,
        target: currentGoal.target,
        deadline: currentGoal.deadline,
        status: 'on_track'
      }

      const updated = [...goals, newGoal]
      setGoals(updated)
      setCurrentGoal({ category: 'environment', goal: '', target: '', deadline: '', status: 'on_track' })
      setShowForm(false)

      if (onTrack) {
        onTrack({ goals: updated })
      }
    }
  }

  const onTrackCount = goals.filter(g => g.status === 'on_track').length
  const completedCount = goals.filter(g => g.status === 'completed').length

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-teal-900">Rastreador de Mejora Continua</h3>
          <p className="text-xs sm:text-sm text-teal-700">Establece metas anuales y revisa trimestralmente</p>
        </div>
      </div>

      {goals.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg p-3 border-2 border-teal-200 text-center">
            <div className="text-xl font-bold text-teal-900">{goals.length}</div>
            <div className="text-xs text-teal-700">Metas Totales</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border-2 border-green-300 text-center">
            <div className="text-xl font-bold text-green-900">{onTrackCount}</div>
            <div className="text-xs text-green-700">En Camino</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-300 text-center">
            <div className="text-xl font-bold text-blue-900">{completedCount}</div>
            <div className="text-xs text-blue-700">Cumplidas</div>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors mb-4 min-h-[44px]"
        >
          + Agregar Meta
        </button>
      )}

      {showForm && (
        <div className="bg-teal-100 rounded-xl p-4 border-2 border-teal-300 mb-4 space-y-3">
          <h4 className="font-bold text-teal-900 text-sm">Nueva Meta</h4>

          <select
            value={currentGoal.category}
            onChange={(e) => setCurrentGoal(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Meta (ej: Reducir emisiones de CO₂)"
            value={currentGoal.goal}
            onChange={(e) => setCurrentGoal(prev => ({ ...prev, goal: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm"
          />

          <input
            type="text"
            placeholder="Objetivo cuantificable (ej: 20% vs 2024)"
            value={currentGoal.target}
            onChange={(e) => setCurrentGoal(prev => ({ ...prev, target: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm"
          />

          <input
            type="date"
            value={currentGoal.deadline}
            onChange={(e) => setCurrentGoal(prev => ({ ...prev, deadline: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-teal-300 focus:border-teal-500 focus:outline-none text-sm"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-200 min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={addGoal}
              disabled={!currentGoal.goal || !currentGoal.target || !currentGoal.deadline}
              className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-teal-700 disabled:opacity-50 min-h-[44px]"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-teal-900 text-sm">Metas 2025-2026:</h4>
          {goals.map((goal) => {
            const cat = categories.find(c => c.value === goal.category)
            return (
              <div
                key={goal.id}
                className={`p-3 rounded-lg border-2 ${
                  goal.status === 'completed' ? 'bg-green-50 border-green-300' :
                  goal.status === 'on_track' ? 'bg-blue-50 border-blue-300' :
                  'bg-orange-50 border-orange-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-xs text-slate-600">{cat?.label}</div>
                    <div className="font-bold text-sm mt-1">{goal.goal}</div>
                    <div className="text-xs text-slate-700 mt-1">
                      🎯 {goal.target} • 📅 {new Date(goal.deadline).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  <button
                    onClick={() => setGoals(prev => prev.filter(g => g.id !== goal.id))}
                    className="text-red-600 text-xs font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Main Module 6 Tools Component
export default function Module6Tools() {
  return (
    <div className="space-y-6">
      <ImpactDashboardBuilder />
      <ESGReportGenerator />
      <StakeholderCommunicationPlanner />
      <CertificationHub />
      <ContinuousImprovementTracker />
    </div>
  )
}

