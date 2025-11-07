'use client'

import { useState } from 'react'
import { Shield, MapPin, Users, Home, Camera, Plus, Minus, Save, Download } from 'lucide-react'

// Security Audit Tool - For Lesson 3.1
export function SecurityAuditTool({ onSave }: { onSave?: (data: any) => void }) {
  const [auditData, setAuditData] = useState<Record<string, any>>({
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: 'day',
    assessors: '',
    zones: []
  })

  const [currentZone, setCurrentZone] = useState({
    name: '',
    lighting: 5,
    visibility: 5,
    maintenance: 5,
    activity: 5,
    notes: '',
    photos: []
  })

  const checklistItems = [
    { id: 'lighting', label: 'Iluminación adecuada', category: 'Infraestructura' },
    { id: 'visibility', label: 'Buena visibilidad / sin puntos ciegos', category: 'Diseño' },
    { id: 'maintenance', label: 'Buen mantenimiento / sin deterioro', category: 'Mantenimiento' },
    { id: 'signage', label: 'Señalización clara', category: 'Navegación' },
    { id: 'greenery', label: 'Vegetación bien podada', category: 'Paisajismo' },
    { id: 'activity', label: 'Actividad social visible', category: 'Uso' },
    { id: 'access', label: 'Puntos de acceso controlados', category: 'Seguridad' },
    { id: 'emergency', label: 'Salidas de emergencia claras', category: 'Seguridad' }
  ]

  const addZone = () => {
    if (currentZone.name) {
      setAuditData((prev: any) => ({
        ...prev,
        zones: [...prev.zones, { ...currentZone, id: Date.now() }]
      }))
      setCurrentZone({
        name: '',
        lighting: 5,
        visibility: 5,
        maintenance: 5,
        activity: 5,
        notes: '',
        photos: []
      })
    }
  }

  const calculateScore = (zone: any) => {
    return Math.round((zone.lighting + zone.visibility + zone.maintenance + zone.activity) / 4)
  }

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-8 h-8 text-blue-600" />
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Auditoría de Seguridad</h3>
          <p className="text-slate-600">Evaluación CPTED de espacios públicos</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ubicación</label>
          <input
            type="text"
            value={auditData.location}
            onChange={(e) => setAuditData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ej: Entrada principal, Estacionamiento"
            className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Evaluadores</label>
          <input
            type="text"
            value={auditData.assessors}
            onChange={(e) => setAuditData(prev => ({ ...prev, assessors: e.target.value }))}
            placeholder="Nombres del equipo"
            className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Add Zone */}
      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <h4 className="font-bold text-blue-900 mb-3">📍 Agregar Zona</h4>
        
        <input
          type="text"
          value={currentZone.name}
          onChange={(e) => setCurrentZone(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Nombre de la zona (ej: Entrada, Pasillo, Estacionamiento)"
          className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none mb-4"
        />

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Lighting Rating */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              💡 Iluminación: {currentZone.lighting}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentZone.lighting}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, lighting: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Visibility Rating */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              👁️ Visibilidad: {currentZone.visibility}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentZone.visibility}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, visibility: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Maintenance Rating */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              🔧 Mantenimiento: {currentZone.maintenance}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentZone.maintenance}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, maintenance: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Activity Rating */}
          <div>
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              🚶 Actividad: {currentZone.activity}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentZone.activity}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, activity: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>

        <textarea
          value={currentZone.notes}
          onChange={(e) => setCurrentZone(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Observaciones y problemas identificados..."
          rows={2}
          className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none mb-3"
        />

        <button
          onClick={addZone}
          disabled={!currentZone.name}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar Zona
        </button>
      </div>

      {/* Zone List */}
      {auditData.zones.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900">Zonas Evaluadas ({auditData.zones.length})</h4>
          {auditData.zones.map((zone: any, index: number) => {
            const score = calculateScore(zone)
            const colorClass = score >= 7 ? 'bg-green-100 border-green-300' : score >= 5 ? 'bg-yellow-100 border-yellow-300' : 'bg-red-100 border-red-300'
            
            return (
              <div key={zone.id} className={`p-4 rounded-lg border-2 ${colorClass}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-slate-900">{zone.name}</h5>
                    <p className="text-sm text-slate-600 mt-1">{zone.notes}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{score}/10</div>
                    <div className="text-xs text-slate-600">Puntuación</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={() => onSave?.(auditData)}
        disabled={auditData.zones.length === 0}
        className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        Guardar Auditoría
      </button>
    </div>
  )
}

// Community Survey Tool - For Lesson 3.2
export function CommunitySurveyTool({ onSave }: { onSave?: (data: any) => void }) {
  const [surveyData, setsurveyData] = useState({
    respondent_count: 0,
    demographics: {
      age_ranges: { '18-30': 0, '31-50': 0, '51+': 0 },
      gender: { male: 0, female: 0, other: 0 },
      resident_years: { '<1': 0, '1-5': 0, '5+': 0 }
    },
    safety_perception: {
      day: 0,
      night: 0,
      alone: 0,
      children: 0
    },
    priorities: [],
    comments: []
  })

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-8 h-8 text-purple-600" />
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Encuesta Comunitaria</h3>
          <p className="text-slate-600">Recopila percepciones de seguridad</p>
        </div>
      </div>

      <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
        <h4 className="font-bold text-purple-900 mb-3">📊 Resumen</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-900">{surveyData.respondent_count}</div>
            <div className="text-sm text-purple-700">Encuestados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-900">{surveyData.safety_perception.day.toFixed(1)}</div>
            <div className="text-sm text-purple-700">Seguridad día (1-10)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-900">{surveyData.safety_perception.night.toFixed(1)}</div>
            <div className="text-sm text-purple-700">Seguridad noche (1-10)</div>
          </div>
        </div>
      </div>

      <div className="text-center text-slate-600">
        <p>Herramienta interactiva completa disponible próximamente</p>
        <p className="text-sm mt-2">Por ahora, usa formularios externos (Google Forms, TypeForm) y carga los resultados como evidencia</p>
      </div>
    </div>
  )
}

// Cost Calculator - For Lesson 3.4
export function CostCalculatorTool({ onSave }: { onSave?: (data: any) => void }) {
  const [improvements, setImprovements] = useState<Array<{
    name: string
    cost: number
    impact: number
    priority: string
  }>>([])

  const [currentItem, setCurrentItem] = useState({
    name: '',
    cost: 0,
    impact: 5,
    priority: 'medium'
  })

  const addImprovement = () => {
    if (currentItem.name && currentItem.cost > 0) {
      setImprovements(prev => [...prev, { ...currentItem }])
      setCurrentItem({ name: '', cost: 0, impact: 5, priority: 'medium' })
    }
  }

  const totalCost = improvements.reduce((sum, item) => sum + item.cost, 0)
  const avgImpact = improvements.length > 0 
    ? improvements.reduce((sum, item) => sum + item.impact, 0) / improvements.length 
    : 0

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Home className="w-8 h-8 text-green-600" />
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Calculadora de Costos</h3>
          <p className="text-slate-600">Prioriza mejoras de seguridad por impacto/costo</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
          <div className="text-2xl font-bold text-green-900">${(totalCost / 1000).toFixed(1)}k</div>
          <div className="text-sm text-green-700">Inversión Total</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="text-2xl font-bold text-blue-900">{improvements.length}</div>
          <div className="text-sm text-blue-700">Mejoras Planeadas</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="text-2xl font-bold text-purple-900">{avgImpact.toFixed(1)}/10</div>
          <div className="text-sm text-purple-700">Impacto Promedio</div>
        </div>
      </div>

      {/* Add Improvement Form */}
      <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200 space-y-3">
        <h4 className="font-bold text-green-900">➕ Agregar Mejora</h4>
        
        <input
          type="text"
          value={currentItem.name}
          onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Instalar 10 luces LED exteriores"
          className="w-full px-4 py-2 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1">Costo (MXN)</label>
            <input
              type="number"
              value={currentItem.cost || ''}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
              placeholder="15000"
              className="w-full px-4 py-2 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-green-900 mb-1">Impacto: {currentItem.impact}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentItem.impact}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, impact: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>
        </div>

        <button
          onClick={addImprovement}
          disabled={!currentItem.name || currentItem.cost === 0}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agregar Mejora
        </button>
      </div>

      {/* Improvements List */}
      {improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900">Mejoras Priorizadas</h4>
          {improvements
            .sort((a, b) => (b.impact / b.cost) - (a.impact / a.cost))
            .map((item, index) => {
              const roi = (item.impact / (item.cost / 1000)).toFixed(2)
              return (
                <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-sm text-slate-600">ROI: {roi} impacto/k MXN</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">${(item.cost / 1000).toFixed(1)}k</div>
                    <div className="text-sm text-slate-600">Impacto: {item.impact}/10</div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      <button
        onClick={() => onSave?.({ improvements, totalCost, avgImpact })}
        disabled={improvements.length === 0}
        className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Save className="w-5 h-5" />
        Guardar Análisis de Costos
      </button>
    </div>
  )
}

