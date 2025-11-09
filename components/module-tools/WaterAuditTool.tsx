'use client'

import { useState } from 'react'
import { Droplet, MapPin, AlertTriangle, CheckCircle, Plus, Save, Camera } from 'lucide-react'

interface AuditPoint {
  id: string
  room: string
  issue: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  estimatedWaste: number // liters per day
  fixCost: number
  priority: number // 1-5, auto-calculated
  photoUrl?: string
  notes: string
}

interface WaterAuditResult {
  facilityName: string
  auditDate: string
  totalPoints: number
  totalWasteLiters: number
  totalFixCost: number
  quickWins: AuditPoint[]
  longTermProjects: AuditPoint[]
  potentialSavings: {
    daily: number
    monthly: number
    yearly: number
  }
}

interface WaterAuditToolProps {
  onSave?: (data: WaterAuditResult) => void
  className?: string
}

const commonRooms = [
  'Baño Principal',
  'Baño Secundario',
  'Cocina / Cafetería',
  'Área de Producción',
  'Almacén',
  'Estacionamiento',
  'Jardín / Áreas Verdes',
  'Sala de Máquinas',
  'Oficinas',
  'Recepción',
  'Otro'
]

const commonIssues = [
  'Fuga en llave/grifo',
  'Fuga en tubería',
  'Inodoro con fuga constante',
  'Mingitorio con fuga',
  'Manguera sin cierre automático',
  'Sistema de riego con fugas',
  'Enfriamiento sin recirculación',
  'Limpieza con manguera (en vez de cubeta)',
  'Sin dispositivos ahorradores',
  'Presión excesiva de agua',
  'Otro'
]

export default function WaterAuditTool({
  onSave,
  className = ''
}: WaterAuditToolProps) {
  const [facilityName, setFacilityName] = useState('')
  const [auditPoints, setAuditPoints] = useState<AuditPoint[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentPoint, setCurrentPoint] = useState({
    room: '',
    issue: '',
    severity: 'medium' as const,
    estimatedWaste: 0,
    fixCost: 0,
    notes: ''
  })
  const [completed, setCompleted] = useState(false)

  const calculatePriority = (waste: number, cost: number, severity: string): number => {
    // Priority based on: high waste, low cost, high severity
    const wasteScore = Math.min(waste / 50, 5) // max 5 points
    const costScore = cost < 1000 ? 5 : cost < 5000 ? 3 : 1
    const severityScore = severity === 'critical' ? 5 : severity === 'high' ? 4 : severity === 'medium' ? 3 : 2
    
    return Math.round((wasteScore + costScore + severityScore) / 3)
  }

  const addPoint = () => {
    if (currentPoint.room && currentPoint.issue) {
      const priority = calculatePriority(
        currentPoint.estimatedWaste,
        currentPoint.fixCost,
        currentPoint.severity
      )

      const newPoint: AuditPoint = {
        id: Date.now().toString(),
        ...currentPoint,
        priority
      }

      setAuditPoints(prev => [...prev, newPoint].sort((a, b) => b.priority - a.priority))
      setCurrentPoint({
        room: '',
        issue: '',
        severity: 'medium',
        estimatedWaste: 0,
        fixCost: 0,
        notes: ''
      })
      setShowForm(false)
    }
  }

  const removePoint = (id: string) => {
    setAuditPoints(prev => prev.filter(p => p.id !== id))
  }

  const generateReport = () => {
    const totalWasteLiters = auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0)
    const totalFixCost = auditPoints.reduce((sum, p) => sum + p.fixCost, 0)

    // Quick wins: high priority, low cost (<$2000)
    const quickWins = auditPoints.filter(p => p.priority >= 4 && p.fixCost < 2000)
    
    // Long term: lower priority or high cost
    const longTermProjects = auditPoints.filter(p => p.priority < 4 || p.fixCost >= 2000)

    const result: WaterAuditResult = {
      facilityName,
      auditDate: new Date().toISOString().split('T')[0],
      totalPoints: auditPoints.length,
      totalWasteLiters,
      totalFixCost,
      quickWins,
      longTermProjects,
      potentialSavings: {
        daily: totalWasteLiters,
        monthly: totalWasteLiters * 22,
        yearly: totalWasteLiters * 250
      }
    }

    setCompleted(true)

    if (onSave) {
      onSave(result)
    }
  }

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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-MX').format(Math.round(num))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (completed && auditPoints.length > 0) {
    const result: WaterAuditResult = {
      facilityName,
      auditDate: new Date().toISOString().split('T')[0],
      totalPoints: auditPoints.length,
      totalWasteLiters: auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0),
      totalFixCost: auditPoints.reduce((sum, p) => sum + p.fixCost, 0),
      quickWins: auditPoints.filter(p => p.priority >= 4 && p.fixCost < 2000),
      longTermProjects: auditPoints.filter(p => p.priority < 4 || p.fixCost >= 2000),
      potentialSavings: {
        daily: auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0),
        monthly: auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0) * 22,
        yearly: auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0) * 250
      }
    }

    return (
      <div className={`bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-cyan-900">Auditoría Completa</h3>
            <p className="text-xs sm:text-sm text-cyan-700">{facilityName}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-cyan-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-900">{result.totalPoints}</div>
            <div className="text-xs sm:text-sm text-cyan-700">Puntos</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 sm:p-4 border-2 border-red-200 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-900">{formatNumber(result.totalWasteLiters)}</div>
            <div className="text-xs sm:text-sm text-red-700">L/día perdidos</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border-2 border-orange-200 text-center">
            <div className="text-xl sm:text-2xl font-bold text-orange-900">{formatCurrency(result.totalFixCost)}</div>
            <div className="text-xs sm:text-sm text-orange-700">Costo reparación</div>
          </div>
        </div>

        {/* Quick Wins */}
        {result.quickWins.length > 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-green-900 text-sm sm:text-base">🎯 Ganancias Rápidas ({result.quickWins.length}):</h4>
            </div>
            <p className="text-xs sm:text-sm text-green-700 mb-3">
              Alta prioridad, bajo costo - Implementar inmediatamente
            </p>
            <div className="space-y-2">
              {result.quickWins.map((point) => (
                <div key={point.id} className="bg-white rounded-lg p-3 border border-green-300">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <div className="font-bold text-sm">{point.issue}</div>
                      <div className="text-xs text-slate-600">📍 {point.room}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600">{formatNumber(point.estimatedWaste)} L/día</div>
                      <div className="text-xs text-orange-600">{formatCurrency(point.fixCost)}</div>
                    </div>
                  </div>
                  {point.notes && (
                    <div className="text-xs text-slate-600 mt-1">{point.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Long Term Projects */}
        {result.longTermProjects.length > 0 && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-blue-900 text-sm sm:text-base">📋 Proyectos a Largo Plazo ({result.longTermProjects.length}):</h4>
            </div>
            <div className="space-y-2">
              {result.longTermProjects.map((point) => (
                <div key={point.id} className="bg-white rounded-lg p-3 border border-blue-300">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-sm">{point.issue}</div>
                      <div className="text-xs text-slate-600">📍 {point.room}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600">{formatNumber(point.estimatedWaste)} L/día</div>
                      <div className="text-xs text-orange-600">{formatCurrency(point.fixCost)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential Savings */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-lg p-4 mb-4">
          <h4 className="font-bold mb-3 text-sm sm:text-base">💰 Ahorro Potencial si Corregimos Todo:</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold">{formatNumber(result.potentialSavings.daily)}</div>
              <div className="text-xs sm:text-sm opacity-90">Litros / Día</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">{formatNumber(result.potentialSavings.monthly)}</div>
              <div className="text-xs sm:text-sm opacity-90">Litros / Mes</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold">{formatNumber(result.potentialSavings.yearly)}</div>
              <div className="text-xs sm:text-sm opacity-90">Litros / Año</div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setCompleted(false)
            setAuditPoints([])
            setFacilityName('')
          }}
          className="w-full bg-cyan-100 text-cyan-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-cyan-200 transition-colors min-h-[44px]"
        >
          Nueva Auditoría
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-cyan-900">Auditoría de Agua</h3>
          <p className="text-xs sm:text-sm text-cyan-700">Identifica fugas y desperdicios room por room</p>
        </div>
      </div>

      {/* Facility Name */}
      {!facilityName ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-cyan-900 mb-2">
            Nombre de la Instalación
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            placeholder="Ej: Planta Principal"
            className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-sm sm:text-base"
          />
          <button
            onClick={() => setShowForm(true)}
            disabled={!facilityName}
            className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Comenzar Auditoría
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          {auditPoints.length > 0 && (
            <div className="bg-white rounded-lg p-4 border-2 border-cyan-200 mb-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-cyan-900">{auditPoints.length}</div>
                  <div className="text-xs text-cyan-700">Puntos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-900">
                    {formatNumber(auditPoints.reduce((sum, p) => sum + p.estimatedWaste, 0))}
                  </div>
                  <div className="text-xs text-red-700">L/día perdidos</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-orange-900">
                    {formatCurrency(auditPoints.reduce((sum, p) => sum + p.fixCost, 0))}
                  </div>
                  <div className="text-xs text-orange-700">Costo fix</div>
                </div>
              </div>
            </div>
          )}

          {/* Add Point Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-cyan-100 text-cyan-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-cyan-200 transition-colors mb-4 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              Agregar Punto de Auditoría
            </button>
          )}

          {/* Add Point Form */}
          {showForm && (
            <div className="bg-cyan-100 rounded-xl p-4 border-2 border-cyan-300 mb-4 space-y-3">
              <h4 className="font-bold text-cyan-900 text-sm sm:text-base">📍 Nuevo Punto</h4>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Área / Habitación</label>
                <select
                  value={currentPoint.room}
                  onChange={(e) => setCurrentPoint(prev => ({ ...prev, room: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona...</option>
                  {commonRooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Problema Identificado</label>
                <select
                  value={currentPoint.issue}
                  onChange={(e) => setCurrentPoint(prev => ({ ...prev, issue: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona...</option>
                  {commonIssues.map(issue => (
                    <option key={issue} value={issue}>{issue}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Severidad</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'low', label: 'Bajo', color: 'green' },
                    { value: 'medium', label: 'Medio', color: 'yellow' },
                    { value: 'high', label: 'Alto', color: 'orange' },
                    { value: 'critical', label: 'Crítico', color: 'red' }
                  ].map(sev => (
                    <button
                      key={sev.value}
                      onClick={() => setCurrentPoint(prev => ({ ...prev, severity: sev.value as any }))}
                      className={`py-2 rounded-lg border-2 font-medium transition-all text-sm ${
                        currentPoint.severity === sev.value
                          ? `border-${sev.color}-500 bg-${sev.color}-50 text-${sev.color}-700`
                          : 'border-cyan-200 text-slate-700 hover:border-cyan-300'
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">
                    Desperdicio (L/día)
                  </label>
                  <input
                    type="number"
                    value={currentPoint.estimatedWaste || ''}
                    onChange={(e) => setCurrentPoint(prev => ({ ...prev, estimatedWaste: parseInt(e.target.value) || 0 }))}
                    placeholder="50"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-cyan-600 mt-1">Estimado</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">
                    Costo de Reparación (MXN)
                  </label>
                  <input
                    type="number"
                    value={currentPoint.fixCost || ''}
                    onChange={(e) => setCurrentPoint(prev => ({ ...prev, fixCost: parseInt(e.target.value) || 0 }))}
                    placeholder="500"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Notas (opcional)</label>
                <textarea
                  value={currentPoint.notes}
                  onChange={(e) => setCurrentPoint(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none resize-none text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addPoint}
                  disabled={!currentPoint.room || !currentPoint.issue}
                  className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Audit Points List */}
          {auditPoints.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="font-bold text-cyan-900 text-sm">Puntos de Auditoría (Prioridad):</h4>
              {auditPoints.map((point) => (
                <div key={point.id} className={`p-3 rounded-lg border-2 ${getSeverityColor(point.severity)} flex justify-between items-start`}>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{point.issue}</div>
                    <div className="text-xs opacity-80">
                      📍 {point.room} • Prioridad: {'⭐'.repeat(point.priority)}
                    </div>
                    <div className="text-xs mt-1">
                      {formatNumber(point.estimatedWaste)} L/día • {formatCurrency(point.fixCost)} reparación
                    </div>
                  </div>
                  <button
                    onClick={() => removePoint(point.id)}
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
            disabled={auditPoints.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Save className="w-5 h-5" />
            Generar Reporte ({auditPoints.length} puntos)
          </button>
        </>
      )}
    </div>
  )
}

