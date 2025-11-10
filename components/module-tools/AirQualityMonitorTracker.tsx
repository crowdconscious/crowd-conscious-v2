'use client'

import { useState, useEffect } from 'react'
import { Activity, TrendingDown, TrendingUp, AlertCircle, CheckCircle, Plus, Save } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

interface Reading {
  id: string
  date: string
  time: string
  pm25: number // μg/m³
  pm10: number // μg/m³
  location: string
  weather: string
  notes: string
}

interface MonitorTrackerProps {
  onSave?: (data: MonitoringData) => void
  className?: string
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

interface MonitoringData {
  facilityName: string
  startDate: string
  readings: Reading[]
  averages: {
    pm25: number
    pm10: number
  }
  complianceStatus: {
    pm25Compliant: boolean
    pm10Compliant: boolean
  }
  trend: 'improving' | 'stable' | 'worsening'
}

// WHO guidelines and Mexican NOM standards
const LIMITS = {
  pm25: {
    who: 15, // μg/m³ (24-hour average)
    nom: 45  // μg/m³ (24-hour average - NOM-025-SSA1-2014)
  },
  pm10: {
    who: 45,  // μg/m³ (24-hour average)
    nom: 75   // μg/m³ (24-hour average - NOM-025-SSA1-2014)
  }
}

const weatherOptions = [
  'Despejado',
  'Nublado',
  'Lluvia ligera',
  'Lluvia fuerte',
  'Viento',
  'Sin viento'
]

export default function AirQualityMonitorTracker({
  onSave,
  className = '',
  enrollmentId,
  moduleId,
  lessonId
}: MonitorTrackerProps) {
  const [facilityName, setFacilityName] = useState('')
  const [readings, setReadings] = useState<Reading[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentReading, setCurrentReading] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    pm25: '',
    pm10: '',
    location: '',
    weather: '',
    notes: ''
  })
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
          tool_name: 'air-quality-monitor'
        })

        if (savedData && savedData.readings) {
          setFacilityName(savedData.facilityName || '')
          setReadings(savedData.readings || [])
          if (savedData.readings.length > 0) {
            setCompleted(true)
          }
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const addReading = () => {
    if (currentReading.pm25 && currentReading.pm10 && currentReading.location) {
      const newReading: Reading = {
        id: Date.now().toString(),
        date: currentReading.date,
        time: currentReading.time,
        pm25: parseFloat(currentReading.pm25),
        pm10: parseFloat(currentReading.pm10),
        location: currentReading.location,
        weather: currentReading.weather,
        notes: currentReading.notes
      }
      
      setReadings(prev => [...prev, newReading].sort((a, b) => 
        new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime()
      ))
      
      setCurrentReading({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        pm25: '',
        pm10: '',
        location: currentReading.location, // Keep same location
        weather: '',
        notes: ''
      })
      
      setShowForm(false)
    }
  }

  const calculateAverages = () => {
    if (readings.length === 0) return { pm25: 0, pm10: 0 }
    
    const sum = readings.reduce((acc, r) => ({
      pm25: acc.pm25 + r.pm25,
      pm10: acc.pm10 + r.pm10
    }), { pm25: 0, pm10: 0 })
    
    return {
      pm25: sum.pm25 / readings.length,
      pm10: sum.pm10 / readings.length
    }
  }

  const calculateTrend = () => {
    if (readings.length < 3) return 'stable'
    
    const recent = readings.slice(0, Math.ceil(readings.length / 2))
    const older = readings.slice(Math.ceil(readings.length / 2))
    
    const recentAvg = recent.reduce((sum, r) => sum + r.pm25, 0) / recent.length
    const olderAvg = older.reduce((sum, r) => sum + r.pm25, 0) / older.length
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100
    
    if (change < -10) return 'improving'
    if (change > 10) return 'worsening'
    return 'stable'
  }

  const averages = calculateAverages()
  const trend = calculateTrend()
  const pm25Compliant = averages.pm25 <= LIMITS.pm25.nom
  const pm10Compliant = averages.pm10 <= LIMITS.pm10.nom

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-5 h-5 text-green-600" />
      case 'worsening': return <TrendingUp className="w-5 h-5 text-red-600" />
      default: return <Activity className="w-5 h-5 text-blue-600" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return 'Mejorando'
      case 'worsening': return 'Empeorando'
      default: return 'Estable'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'worsening': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getQualityLevel = (pm25: number) => {
    if (pm25 <= 12) return { label: 'Excelente', color: 'text-green-600', bgColor: 'bg-green-100' }
    if (pm25 <= 35) return { label: 'Buena', color: 'text-teal-600', bgColor: 'bg-teal-100' }
    if (pm25 <= 55) return { label: 'Aceptable', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
    if (pm25 <= 150) return { label: 'Mala', color: 'text-orange-600', bgColor: 'bg-orange-100' }
    return { label: 'Peligrosa', color: 'text-red-600', bgColor: 'bg-red-100' }
  }

  const saveMonitoringData = async () => {
    const data: MonitoringData = {
      facilityName,
      startDate: readings[readings.length - 1]?.date || new Date().toISOString().split('T')[0],
      readings,
      averages,
      complianceStatus: {
        pm25Compliant,
        pm10Compliant
      },
      trend
    }
    
    setCompleted(true)

    // ✨ Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'air-quality-monitor',
        tool_data: data,
        tool_type: 'tracker'
      })
    }
    
    if (onSave) {
      onSave(data)
    }
  }

  if (completed) {
    const quality = getQualityLevel(averages.pm25)
    
    return (
      <div className={`bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-cyan-900">Reporte de Monitoreo</h3>
            <p className="text-xs sm:text-sm text-cyan-700">{facilityName}</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-cyan-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-900">{readings.length}</div>
            <div className="text-xs sm:text-sm text-cyan-700">Mediciones</div>
          </div>
          <div className={`rounded-lg p-3 sm:p-4 border-2 text-center ${quality.bgColor}`}>
            <div className="text-2xl sm:text-3xl font-bold">{averages.pm25.toFixed(1)}</div>
            <div className={`text-xs sm:text-sm font-medium ${quality.color}`}>
              PM2.5 promedio ({quality.label})
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="bg-white rounded-lg p-4 border-2 border-cyan-200 mb-4">
          <h4 className="font-bold text-cyan-900 mb-3 text-sm sm:text-base">📊 Cumplimiento Normativo:</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">PM2.5: {averages.pm25.toFixed(1)} μg/m³</div>
                <div className="text-xs text-slate-600">Límite NOM: {LIMITS.pm25.nom} μg/m³</div>
              </div>
              <div className={`font-bold ${pm25Compliant ? 'text-green-600' : 'text-red-600'}`}>
                {pm25Compliant ? '✅ Cumple' : '❌ No cumple'}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">PM10: {averages.pm10.toFixed(1)} μg/m³</div>
                <div className="text-xs text-slate-600">Límite NOM: {LIMITS.pm10.nom} μg/m³</div>
              </div>
              <div className={`font-bold ${pm10Compliant ? 'text-green-600' : 'text-red-600'}`}>
                {pm10Compliant ? '✅ Cumple' : '❌ No cumple'}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Analysis */}
        <div className={`rounded-lg p-4 border-2 mb-4 ${
          trend === 'improving' ? 'bg-green-50 border-green-200' :
          trend === 'worsening' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon(trend)}
            <h4 className={`font-bold text-sm sm:text-base ${getTrendColor(trend)}`}>
              Tendencia: {getTrendLabel(trend)}
            </h4>
          </div>
          <p className="text-xs sm:text-sm opacity-90">
            {trend === 'improving' && 'La calidad del aire está mejorando. Continúa con las medidas implementadas.'}
            {trend === 'worsening' && 'La calidad del aire está empeorando. Revisa las medidas de control.'}
            {trend === 'stable' && 'La calidad del aire se mantiene estable. Monitorea cambios estacionales.'}
          </p>
        </div>

        {/* Recent Readings */}
        <div className="bg-white rounded-lg p-4 border-2 border-cyan-200 mb-4">
          <h4 className="font-bold text-cyan-900 mb-3 text-sm sm:text-base">📈 Últimas Mediciones:</h4>
          <div className="space-y-2">
            {readings.slice(0, 5).map((reading) => {
              const readingQuality = getQualityLevel(reading.pm25)
              return (
                <div key={reading.id} className={`p-2 rounded-lg border ${readingQuality.bgColor}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-medium">{reading.date} {reading.time}</div>
                      <div className="text-xs text-slate-600">{reading.location}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-sm ${readingQuality.color}`}>
                        {reading.pm25} μg/m³
                      </div>
                      <div className="text-xs">{readingQuality.label}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-lg p-4 mb-4">
          <h4 className="font-bold text-green-900 mb-2 text-sm sm:text-base">💡 Recomendaciones:</h4>
          <ul className="space-y-1 text-xs sm:text-sm text-green-800">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Continuar monitoreo semanal para detectar patrones</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Correlacionar lecturas con actividades operativas</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Implementar alertas cuando se superen límites</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Comparar con estaciones gubernamentales cercanas</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => {
            setCompleted(false)
            setReadings([])
            setFacilityName('')
          }}
          className="w-full bg-cyan-100 text-cyan-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-cyan-200 transition-colors min-h-[44px]"
        >
          Nuevo Monitoreo
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-cyan-900">Monitor de Calidad del Aire</h3>
          <p className="text-xs sm:text-sm text-cyan-700">Registra mediciones PM2.5 y PM10</p>
        </div>
      </div>

      {/* Facility Setup */}
      {!facilityName ? (
        <div className="mb-6">
          <label className="block text-sm font-medium text-cyan-900 mb-2">
            Nombre de la Instalación
          </label>
          <input
            type="text"
            value={facilityName}
            onChange={(e) => setFacilityName(e.target.value)}
            placeholder="Ej: Oficina Central"
            className="w-full px-4 py-3 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:outline-none text-sm sm:text-base"
          />
          <button
            onClick={() => setShowForm(true)}
            disabled={!facilityName}
            className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Comenzar Monitoreo
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          {readings.length > 0 && (
            <div className="bg-white rounded-lg p-4 border-2 border-cyan-200 mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-cyan-900">{readings.length}</div>
                  <div className="text-xs text-cyan-700">Mediciones</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-900">{averages.pm25.toFixed(1)}</div>
                  <div className="text-xs text-orange-700">PM2.5 promedio</div>
                </div>
              </div>
            </div>
          )}

          {/* Add Reading Button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-cyan-100 text-cyan-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-cyan-200 transition-colors mb-4 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              Agregar Medición
            </button>
          )}

          {/* Add Reading Form */}
          {showForm && (
            <div className="bg-cyan-100 rounded-xl p-4 border-2 border-cyan-300 mb-4 space-y-3">
              <h4 className="font-bold text-cyan-900 text-sm sm:text-base">📊 Nueva Medición</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">Fecha</label>
                  <input
                    type="date"
                    value={currentReading.date}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">Hora</label>
                  <input
                    type="time"
                    value={currentReading.time}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Ubicación</label>
                <input
                  type="text"
                  value={currentReading.location}
                  onChange={(e) => setCurrentReading(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ej: Área de producción, Oficinas, Exterior"
                  className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">PM2.5 (μg/m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentReading.pm25}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, pm25: e.target.value }))}
                    placeholder="25.5"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-cyan-600 mt-1">Límite: {LIMITS.pm25.nom} μg/m³</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-900 mb-2">PM10 (μg/m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentReading.pm10}
                    onChange={(e) => setCurrentReading(prev => ({ ...prev, pm10: e.target.value }))}
                    placeholder="45.0"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-cyan-600 mt-1">Límite: {LIMITS.pm10.nom} μg/m³</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Clima</label>
                <select
                  value={currentReading.weather}
                  onChange={(e) => setCurrentReading(prev => ({ ...prev, weather: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border-2 border-cyan-300 focus:border-cyan-500 focus:outline-none text-sm"
                >
                  <option value="">Selecciona...</option>
                  {weatherOptions.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-900 mb-2">Notas (opcional)</label>
                <textarea
                  value={currentReading.notes}
                  onChange={(e) => setCurrentReading(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observaciones, actividades especiales..."
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
                  onClick={addReading}
                  disabled={!currentReading.pm25 || !currentReading.pm10 || !currentReading.location}
                  className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

          {/* Readings List */}
          {readings.length > 0 && (
            <div className="space-y-2 mb-4">
              <h4 className="font-bold text-cyan-900 text-sm">Últimas Mediciones:</h4>
              {readings.slice(0, 5).map((reading) => {
                const quality = getQualityLevel(reading.pm25)
                return (
                  <div key={reading.id} className={`p-3 rounded-lg border-2 ${quality.bgColor}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{reading.date} {reading.time}</div>
                        <div className="text-xs opacity-80">{reading.location} • {reading.weather}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${quality.color}`}>
                          {reading.pm25} μg/m³
                        </div>
                        <div className="text-xs">{quality.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Save Report */}
          <button
            onClick={saveMonitoringData}
            disabled={readings.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Save className="w-5 h-5" />
            Generar Reporte ({readings.length} mediciones)
          </button>
        </>
      )}
    </div>
  )
}

