'use client'

import { useState } from 'react'
import { TestTube, Droplets, LineChart, AlertTriangle, CheckCircle } from 'lucide-react'

// Water Quality Tester Log
interface QualityTest {
  id: string
  date: string
  location: string
  ph: number
  turbidity: number
  contaminants: string[]
  compliant: boolean
  notes: string
}

interface WaterQualityTestLogProps {
  onSave?: (tests: QualityTest[]) => void
}

export function WaterQualityTestLog({ onSave }: WaterQualityTestLogProps) {
  const [tests, setTests] = useState<QualityTest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentTest, setCurrentTest] = useState({
    location: '',
    ph: '',
    turbidity: '',
    contaminants: [] as string[],
    notes: ''
  })

  const standards = {
    ph: { min: 6.5, max: 8.5, name: 'pH' },
    turbidity: { max: 5, name: 'Turbidez (NTU)' }
  }

  const addTest = () => {
    if (currentTest.location && currentTest.ph) {
      const ph = parseFloat(currentTest.ph)
      const turbidity = parseFloat(currentTest.turbidity) || 0
      const compliant = 
        ph >= standards.ph.min && 
        ph <= standards.ph.max && 
        turbidity <= standards.turbidity.max

      const newTest: QualityTest = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        location: currentTest.location,
        ph,
        turbidity,
        contaminants: currentTest.contaminants,
        compliant,
        notes: currentTest.notes
      }

      const updatedTests = [...tests, newTest]
      setTests(updatedTests)
      setCurrentTest({
        location: '',
        ph: '',
        turbidity: '',
        contaminants: [],
        notes: ''
      })
      setShowForm(false)

      if (onSave) {
        onSave(updatedTests)
      }
    }
  }

  const complianceRate = tests.length > 0
    ? (tests.filter(t => t.compliant).length / tests.length) * 100
    : 0

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <TestTube className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-purple-900">Registro de Pruebas de Calidad</h3>
          <p className="text-xs sm:text-sm text-purple-700">Monitorea la calidad del agua vs NOM-001-SEMARNAT</p>
        </div>
      </div>

      {/* Summary Stats */}
      {tests.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-purple-200 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-900">{tests.length}</div>
            <div className="text-xs sm:text-sm text-purple-700">Pruebas</div>
          </div>
          <div className={`rounded-lg p-3 sm:p-4 border-2 text-center ${
            complianceRate >= 95 ? 'bg-green-50 border-green-200' : 
            complianceRate >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-2xl sm:text-3xl font-bold ${
              complianceRate >= 95 ? 'text-green-900' : 
              complianceRate >= 80 ? 'text-yellow-900' : 'text-red-900'
            }`}>
              {complianceRate.toFixed(0)}%
            </div>
            <div className={`text-xs sm:text-sm ${
              complianceRate >= 95 ? 'text-green-700' : 
              complianceRate >= 80 ? 'text-yellow-700' : 'text-red-700'
            }`}>
              Cumplimiento
            </div>
          </div>
        </div>
      )}

      {/* Add Test Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-purple-700 transition-colors mb-4 min-h-[44px]"
        >
          + Registrar Nueva Prueba
        </button>
      )}

      {/* Test Form */}
      {showForm && (
        <div className="bg-purple-100 rounded-xl p-4 border-2 border-purple-300 mb-4 space-y-3">
          <h4 className="font-bold text-purple-900 text-sm sm:text-base">Nueva Prueba</h4>

          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">Ubicación</label>
            <select
              value={currentTest.location}
              onChange={(e) => setCurrentTest(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-sm"
            >
              <option value="">Selecciona...</option>
              <option value="Entrada Principal">Entrada Principal</option>
              <option value="Salida de Proceso">Salida de Proceso</option>
              <option value="Descarga Final">Descarga Final</option>
              <option value="Pozo/Cisterna">Pozo/Cisterna</option>
              <option value="Agua Tratada">Agua Tratada</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">
                pH
              </label>
              <input
                type="number"
                step="0.1"
                value={currentTest.ph}
                onChange={(e) => setCurrentTest(prev => ({ ...prev, ph: e.target.value }))}
                placeholder="7.5"
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-sm"
              />
              <p className="text-xs text-purple-600 mt-1">Rango: 6.5-8.5</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-900 mb-2">
                Turbidez (NTU)
              </label>
              <input
                type="number"
                step="0.1"
                value={currentTest.turbidity}
                onChange={(e) => setCurrentTest(prev => ({ ...prev, turbidity: e.target.value }))}
                placeholder="2.0"
                className="w-full px-4 py-3 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none text-sm"
              />
              <p className="text-xs text-purple-600 mt-1">Máx: 5 NTU</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-900 mb-2">Notas</label>
            <textarea
              value={currentTest.notes}
              onChange={(e) => setCurrentTest(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none resize-none text-sm"
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={addTest}
              disabled={!currentTest.location || !currentTest.ph}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Tests List */}
      {tests.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-purple-900 text-sm">Historial de Pruebas:</h4>
          {tests.slice().reverse().map((test) => (
            <div
              key={test.id}
              className={`p-3 rounded-lg border-2 ${
                test.compliant ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-sm">{test.location}</div>
                  <div className="text-xs text-slate-600">{test.date}</div>
                </div>
                <div className="text-2xl">
                  {test.compliant ? '✅' : '⚠️'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={
                  test.ph >= standards.ph.min && test.ph <= standards.ph.max
                    ? 'text-green-700'
                    : 'text-red-700 font-bold'
                }>
                  pH: {test.ph}
                </div>
                <div className={
                  test.turbidity <= standards.turbidity.max
                    ? 'text-green-700'
                    : 'text-red-700 font-bold'
                }>
                  Turbidez: {test.turbidity} NTU
                </div>
              </div>
              {test.notes && (
                <div className="text-xs text-slate-600 mt-2 border-t pt-2">{test.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {tests.length === 0 && !showForm && (
        <div className="text-center py-8 text-slate-500">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay pruebas registradas</p>
        </div>
      )}
    </div>
  )
}

// Recycling System Designer
interface RecyclingSystem {
  type: 'greywater' | 'rainwater' | 'process'
  capacity: number // liters
  treatmentMethod: string
  installCost: number
  operatingCost: number
  reuseFor: string[]
}

interface RecyclingSystemDesignerProps {
  onDesign?: (system: RecyclingSystem) => void
}

export function RecyclingSystemDesigner({ onDesign }: RecyclingSystemDesignerProps) {
  const [system, setSystem] = useState<Partial<RecyclingSystem>>({
    type: 'greywater',
    capacity: 500,
    treatmentMethod: '',
    installCost: 0,
    operatingCost: 0,
    reuseFor: []
  })
  const [calculated, setCalculated] = useState(false)

  const treatmentOptions = {
    greywater: ['Filtración física', 'Biorreactor', 'Humedal artificial', 'UV + Cloración'],
    rainwater: ['Filtro de sedimentos', 'Carbón activado', 'Cloración', 'Sistema completo'],
    process: ['Osmosis inversa', 'Intercambio iónico', 'Tratamiento químico', 'Evaporación']
  }

  const reuseOptions = [
    'Riego de jardines',
    'Descarga de sanitarios',
    'Limpieza de pisos',
    'Enfriamiento de equipos',
    'Lavado de vehículos',
    'Procesos industriales'
  ]

  const calculate = () => {
    const waterPrice = 15 // MXN per m³
    const dailySavings = (system.capacity! / 1000) * waterPrice
    const monthlySavings = dailySavings * 22
    const yearlySavings = dailySavings * 250

    const paybackMonths = system.installCost! / monthlySavings

    setCalculated(true)

    if (onDesign) {
      onDesign(system as RecyclingSystem)
    }

    return {
      dailySavings,
      monthlySavings,
      yearlySavings,
      paybackMonths
    }
  }

  const results = calculated ? calculate() : null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const toggleReuse = (option: string) => {
    setSystem(prev => ({
      ...prev,
      reuseFor: prev.reuseFor?.includes(option)
        ? prev.reuseFor.filter(r => r !== option)
        : [...(prev.reuseFor || []), option]
    }))
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Diseñador de Sistema de Reciclaje</h3>
          <p className="text-xs sm:text-sm text-blue-700">Calcula costos vs ahorros de reutilización</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">Tipo de Sistema</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'greywater', label: '💧 Aguas Grises', desc: 'Lavabos, regaderas' },
                { value: 'rainwater', label: '🌧️ Agua de Lluvia', desc: 'Captación pluvial' },
                { value: 'process', label: '🏭 Agua de Proceso', desc: 'Industrial' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSystem(prev => ({ ...prev, type: option.value as any, treatmentMethod: '' }))}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    system.type === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-blue-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-bold text-sm">{option.label}</div>
                  <div className="text-xs text-slate-600">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Capacidad Diaria (Litros)
            </label>
            <input
              type="number"
              value={system.capacity}
              onChange={(e) => setSystem(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
              placeholder="500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">Método de Tratamiento</label>
            <select
              value={system.treatmentMethod}
              onChange={(e) => setSystem(prev => ({ ...prev, treatmentMethod: e.target.value }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
            >
              <option value="">Selecciona...</option>
              {system.type && treatmentOptions[system.type].map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Costo de Instalación (MXN)
              </label>
              <input
                type="number"
                value={system.installCost || ''}
                onChange={(e) => setSystem(prev => ({ ...prev, installCost: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="50000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Costo Operativo Mensual (MXN)
              </label>
              <input
                type="number"
                value={system.operatingCost || ''}
                onChange={(e) => setSystem(prev => ({ ...prev, operatingCost: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="2000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Reutilizar Para: (selecciona múltiples)
            </label>
            <div className="space-y-2">
              {reuseOptions.map(option => (
                <button
                  key={option}
                  onClick={() => toggleReuse(option)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    system.reuseFor?.includes(option)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-blue-200 hover:border-blue-300'
                  }`}
                >
                  <span className="text-sm">
                    {system.reuseFor?.includes(option) ? '✅ ' : '⭕ '}
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCalculated(true)}
            disabled={!system.capacity || !system.treatmentMethod || !system.installCost}
            className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Calcular Retorno de Inversión
          </button>
        </div>
      ) : results && (
        <div className="space-y-4">
          {/* System Summary */}
          <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">📋 Resumen del Sistema:</h4>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Tipo:</span> {system.type === 'greywater' ? 'Aguas Grises' : system.type === 'rainwater' ? 'Agua de Lluvia' : 'Agua de Proceso'}</div>
              <div><span className="font-medium">Capacidad:</span> {system.capacity} L/día</div>
              <div><span className="font-medium">Tratamiento:</span> {system.treatmentMethod}</div>
              <div><span className="font-medium">Usos:</span> {system.reuseFor?.join(', ')}</div>
            </div>
          </div>

          {/* ROI Results */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-3 text-sm sm:text-base">💰 Análisis Financiero:</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Ahorro mensual:</span>
                <span className="font-bold text-green-900">{formatCurrency(results.monthlySavings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Ahorro anual:</span>
                <span className="font-bold text-green-900">{formatCurrency(results.yearlySavings)}</span>
              </div>
              <div className="border-t border-green-300 pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Recuperación de inversión:</span>
                <span className="font-bold text-teal-900">{results.paybackMonths.toFixed(1)} meses</span>
              </div>
            </div>
          </div>

          <div className={`border-2 rounded-lg p-4 ${
            results.paybackMonths <= 24 ? 'bg-green-50 border-green-200' :
            results.paybackMonths <= 36 ? 'bg-yellow-50 border-yellow-200' :
            'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {results.paybackMonths <= 24 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-yellow-600" />}
              <h4 className="font-bold text-sm sm:text-base">Recomendación:</h4>
            </div>
            <p className="text-sm">
              {results.paybackMonths <= 24 ? (
                <>✅ <strong>Altamente recomendado.</strong> Recuperarás tu inversión en menos de 2 años.</>
              ) : results.paybackMonths <= 36 ? (
                <>⚠️ <strong>Buena opción.</strong> Inversión se recupera en {(results.paybackMonths / 12).toFixed(1)} años.</>
              ) : (
                <>⚠️ <strong>Evaluar alternativas.</strong> Tiempo de recuperación largo ({(results.paybackMonths / 12).toFixed(1)} años). Considera reducir costos de instalación.</>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setCalculated(false)
              setSystem({
                type: 'greywater',
                capacity: 500,
                treatmentMethod: '',
                installCost: 0,
                operatingCost: 0,
                reuseFor: []
              })
            }}
            className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-blue-200 transition-colors min-h-[44px]"
          >
            Diseñar Nuevo Sistema
          </button>
        </div>
      )}
    </div>
  )
}

// Main Module 2 Tools Component
export default function Module2Tools() {
  return (
    <div className="space-y-6">
      <WaterQualityTestLog />
      <RecyclingSystemDesigner />
    </div>
  )
}

