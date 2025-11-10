'use client'

import { useState, useEffect } from 'react'
import { TestTube, Droplets, LineChart, AlertTriangle, CheckCircle } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

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
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

export function WaterQualityTestLog({ onSave, enrollmentId, moduleId, lessonId }: WaterQualityTestLogProps) {
  const [tests, setTests] = useState<QualityTest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentTest, setCurrentTest] = useState({
    location: '',
    ph: '',
    turbidity: '',
    contaminants: [] as string[],
    notes: ''
  })

  // ✨ ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()

  // ✨ Load previous data on mount
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'water-quality-tester'
        })

        if (savedData && savedData.tests) {
          setTests(savedData.tests)
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const standards = {
    ph: { min: 6.5, max: 8.5, name: 'pH' },
    turbidity: { max: 5, name: 'Turbidez (NTU)' }
  }

  const addTest = async () => {
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

      // ✨ Save to database for ESG reporting
      if (enrollmentId && moduleId && lessonId) {
        await saveToolData({
          enrollment_id: enrollmentId,
          module_id: moduleId,
          lesson_id: lessonId,
          tool_name: 'water-quality-tester',
          tool_data: { tests: updatedTests },
          tool_type: 'tracker'
        })
      }

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
  // ESG Reporting Props
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

export function RecyclingSystemDesigner({ onDesign, enrollmentId, moduleId, lessonId }: RecyclingSystemDesignerProps) {
  const [system, setSystem] = useState<Partial<RecyclingSystem>>({
    type: 'greywater',
    capacity: 500,
    treatmentMethod: '',
    installCost: 0,
    operatingCost: 0,
    reuseFor: []
  })
  const [calculated, setCalculated] = useState(false)

  // ✨ ESG Data Saving
  const { saveToolData, loadToolData, loading: saving } = useToolDataSaver()

  // ✨ Load previous data on mount
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'recycling-system-designer'
        })

        if (savedData && savedData.system) {
          setSystem(savedData.system)
          if (savedData.calculated) {
            setCalculated(true)
          }
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

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

  const calculate = async () => {
    const waterPrice = 15 // MXN per m³
    const dailySavings = (system.capacity! / 1000) * waterPrice
    const monthlySavings = dailySavings * 22
    const yearlySavings = dailySavings * 250

    const paybackMonths = system.installCost! / monthlySavings

    const results = {
      dailySavings,
      monthlySavings,
      yearlySavings,
      paybackMonths
    }

    setCalculated(true)

    // ✨ Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'recycling-system-designer',
        tool_data: { system, calculated: true, results },
        tool_type: 'planner'
      })
    }

    if (onDesign) {
      onDesign(system as RecyclingSystem)
    }

    return results
  }

  const calculateResults = () => {
    const waterPrice = 15 // MXN per m³
    const dailySavings = (system.capacity! / 1000) * waterPrice
    const monthlySavings = dailySavings * 22
    const yearlySavings = dailySavings * 250
    const paybackMonths = system.installCost! / monthlySavings
    return { dailySavings, monthlySavings, yearlySavings, paybackMonths }
  }

  const results = calculated ? calculateResults() : null

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
            onClick={calculate}
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

// =========================================================
// TOOL 3: Water Footprint Calculator
// =========================================================

interface WaterFootprintCalculatorProps {
  onCalculate?: (result: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

export function WaterFootprintCalculator({ 
  onCalculate, 
  enrollmentId, 
  moduleId, 
  lessonId 
}: WaterFootprintCalculatorProps) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [inputs, setInputs] = useState({
    production: 0,      // Liters per day
    bathrooms: 0,
    cooling: 0,
    irrigation: 0,
    cleaning: 0,
    other: 0,
    waterCostPerM3: 15  // MXN per cubic meter
  })

  const [calculated, setCalculated] = useState(false)
  const [results, setResults] = useState({
    totalLitersPerDay: 0,
    totalLitersPerYear: 0,
    totalCubicMetersPerYear: 0,
    annualCost: 0,
    costPerDay: 0,
    breakdown: {} as Record<string, { liters: number; percentage: number }>
  })

  // Load previous data
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ lesson_id: lessonId, module_id: moduleId, tool_name: 'water-footprint-calculator' })
        .then(data => {
          if (data?.inputs) setInputs(data.inputs)
          if (data?.calculated) {
            setCalculated(true)
            setResults(data.results)
          }
        })
    }
  }, [enrollmentId, moduleId, lessonId])

  const calculate = async () => {
    const totalLitersPerDay = 
      inputs.production + 
      inputs.bathrooms + 
      inputs.cooling + 
      inputs.irrigation + 
      inputs.cleaning + 
      inputs.other

    const totalLitersPerYear = totalLitersPerDay * 365
    const totalCubicMetersPerYear = totalLitersPerYear / 1000
    const annualCost = totalCubicMetersPerYear * inputs.waterCostPerM3
    const costPerDay = annualCost / 365

    // Calculate breakdown
    const breakdown: Record<string, { liters: number; percentage: number }> = {
      production: { 
        liters: inputs.production * 365, 
        percentage: (inputs.production / totalLitersPerDay) * 100 
      },
      bathrooms: { 
        liters: inputs.bathrooms * 365, 
        percentage: (inputs.bathrooms / totalLitersPerDay) * 100 
      },
      cooling: { 
        liters: inputs.cooling * 365, 
        percentage: (inputs.cooling / totalLitersPerDay) * 100 
      },
      irrigation: { 
        liters: inputs.irrigation * 365, 
        percentage: (inputs.irrigation / totalLitersPerDay) * 100 
      },
      cleaning: { 
        liters: inputs.cleaning * 365, 
        percentage: (inputs.cleaning / totalLitersPerDay) * 100 
      },
      other: { 
        liters: inputs.other * 365, 
        percentage: (inputs.other / totalLitersPerDay) * 100 
      }
    }

    const calculatedResults = {
      totalLitersPerDay,
      totalLitersPerYear,
      totalCubicMetersPerYear,
      annualCost,
      costPerDay,
      breakdown
    }

    setResults(calculatedResults)
    setCalculated(true)

    // Save to database
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'water-footprint-calculator',
        tool_data: { 
          inputs, 
          results: calculatedResults, 
          calculated: true,
          totalWater: totalLitersPerDay // For ESG reporting
        },
        tool_type: 'calculator'
      })
    }

    onCalculate?.(calculatedResults)
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Droplets className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Calculadora de Huella Hídrica</h3>
          <p className="text-sm text-slate-600">Calcula tu consumo total de agua y costos</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-4">
          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                💧 Producción (L/día)
              </label>
              <input
                type="number"
                value={inputs.production || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, production: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🚽 Baños (L/día)
              </label>
              <input
                type="number"
                value={inputs.bathrooms || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, bathrooms: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                ❄️ Enfriamiento (L/día)
              </label>
              <input
                type="number"
                value={inputs.cooling || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, cooling: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🌱 Riego (L/día)
              </label>
              <input
                type="number"
                value={inputs.irrigation || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, irrigation: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                🧹 Limpieza (L/día)
              </label>
              <input
                type="number"
                value={inputs.cleaning || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, cleaning: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                📦 Otros (L/día)
              </label>
              <input
                type="number"
                value={inputs.other || ''}
                onChange={(e) => setInputs(prev => ({ ...prev, other: Number(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-blue-100 rounded-lg p-4">
            <label className="block text-sm font-semibold text-blue-900 mb-2">
              💰 Costo del Agua (MXN por m³)
            </label>
            <input
              type="number"
              value={inputs.waterCostPerM3}
              onChange={(e) => setInputs(prev => ({ ...prev, waterCostPerM3: Number(e.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none"
              placeholder="15"
            />
            <p className="text-xs text-blue-700 mt-1">Promedio en México: $15-25 MXN/m³</p>
          </div>

          <button
            onClick={calculate}
            disabled={inputs.production + inputs.bathrooms + inputs.cooling + inputs.irrigation + inputs.cleaning + inputs.other === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            💾 Calcular y Guardar
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.totalLitersPerDay.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600">Litros/día</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-cyan-600">
                {results.totalCubicMetersPerYear.toFixed(0)}
              </div>
              <div className="text-xs text-slate-600">m³/año</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                ${results.annualCost.toLocaleString()}
              </div>
              <div className="text-xs text-slate-600">Costo anual (MXN)</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                ${results.costPerDay.toFixed(0)}
              </div>
              <div className="text-xs text-slate-600">Costo/día (MXN)</div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-bold text-slate-900 mb-3">Desglose por Área</h4>
            <div className="space-y-2">
              {Object.entries(results.breakdown)
                .filter(([_, data]) => data.percentage > 0)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .map(([key, data]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{key}</span>
                        <span className="text-slate-600">{data.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 w-24 text-right">
                      {(data.liters / 1000).toFixed(0)} m³/año
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <h4 className="font-bold text-yellow-900 mb-2">💡 Oportunidades de Ahorro</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {results.breakdown.production?.percentage > 30 && (
                <li>• Considera sistemas de recirculación en producción</li>
              )}
              {results.breakdown.bathrooms?.percentage > 20 && (
                <li>• Instala sanitarios y grifos de bajo flujo</li>
              )}
              {results.breakdown.irrigation?.percentage > 15 && (
                <li>• Implementa riego por goteo o recolección de agua de lluvia</li>
              )}
              {results.annualCost > 50000 && (
                <li>• Con tu consumo, un ahorro del 20% = ${(results.annualCost * 0.2).toLocaleString()} MXN/año</li>
              )}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={async () => {
                // Re-save current data
                if (enrollmentId && moduleId && lessonId) {
                  await saveToolData({
                    enrollment_id: enrollmentId,
                    module_id: moduleId,
                    lesson_id: lessonId,
                    tool_name: 'water-footprint-calculator',
                    tool_data: { inputs, results, calculated: true, totalWater: results.totalLitersPerDay },
                    tool_type: 'calculator'
                  })
                }
              }}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              💾 Guardar Datos
            </button>
            <button
              onClick={() => setCalculated(false)}
              className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-lg font-medium hover:bg-blue-200 transition-colors"
            >
              🔄 Recalcular
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 4: Water Audit Tool
// =========================================================

interface WaterAuditZone {
  id: string
  name: string
  usage: number        // Liters per day
  issues: string[]     // Leaks, waste, etc.
  priority: 'low' | 'medium' | 'high'
  photos: string[]
  notes: string
}

interface WaterAuditToolProps {
  onSave?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

export function WaterAuditTool({ onSave, enrollmentId, moduleId, lessonId }: WaterAuditToolProps) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [zones, setZones] = useState<WaterAuditZone[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentZone, setCurrentZone] = useState({
    name: '',
    usage: 0,
    issues: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: ''
  })

  // Load previous data
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ lesson_id: lessonId, module_id: moduleId, tool_name: 'water-audit-tool' })
        .then(data => { if (data?.zones) setZones(data.zones) })
    }
  }, [enrollmentId, moduleId, lessonId])

  const addZone = async () => {
    if (currentZone.name && currentZone.usage > 0) {
      const newZone: WaterAuditZone = {
        id: Date.now().toString(),
        ...currentZone,
        photos: []
      }

      const updatedZones = [...zones, newZone]
      setZones(updatedZones)
      setCurrentZone({ name: '', usage: 0, issues: [], priority: 'medium', notes: '' })
      setShowForm(false)

      // Save to database
      if (enrollmentId && moduleId && lessonId) {
        await saveToolData({
          enrollment_id: enrollmentId,
          module_id: moduleId,
          lesson_id: lessonId,
          tool_name: 'water-audit-tool',
          tool_data: { zones: updatedZones },
          tool_type: 'assessment'
        })
      }

      onSave?.(updatedZones)
    }
  }

  const issueOptions = [
    'Fuga visible',
    'Goteo constante',
    'Grifos sin cerrar completamente',
    'Uso excesivo',
    'Sin medidor',
    'Equipo ineficiente',
    'Desperdicio de agua',
    'Falta de mantenimiento'
  ]

  const totalUsage = zones.reduce((sum, zone) => sum + zone.usage, 0)
  const highPriorityIssues = zones.filter(z => z.priority === 'high').length

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Auditoría de Agua</h3>
          <p className="text-sm text-slate-600">Mapeo zona por zona</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{zones.length}</div>
          <div className="text-xs text-slate-600">Zonas Auditadas</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalUsage.toLocaleString()}</div>
          <div className="text-xs text-slate-600">L/día Total</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{highPriorityIssues}</div>
          <div className="text-xs text-slate-600">Alta Prioridad</div>
        </div>
      </div>

      {/* Add Zone Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-lg font-bold hover:scale-105 transition-transform mb-4"
        >
          + Agregar Zona
        </button>
      )}

      {/* Add Zone Form */}
      {showForm && (
        <div className="bg-white rounded-lg p-4 mb-4 space-y-4">
          <h4 className="font-bold text-slate-900">Nueva Zona</h4>
          
          <input
            type="text"
            value={currentZone.name}
            onChange={(e) => setCurrentZone(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre de la zona (ej: Baño Principal)"
            className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-cyan-500 focus:outline-none"
          />

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Uso Estimado (L/día)
            </label>
            <input
              type="number"
              value={currentZone.usage || ''}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, usage: Number(e.target.value) }))}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-cyan-500 focus:outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Problemas Identificados
            </label>
            <div className="grid grid-cols-2 gap-2">
              {issueOptions.map(issue => (
                <label key={issue} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={currentZone.issues.includes(issue)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCurrentZone(prev => ({ ...prev, issues: [...prev.issues, issue] }))
                      } else {
                        setCurrentZone(prev => ({ ...prev, issues: prev.issues.filter(i => i !== issue) }))
                      }
                    }}
                    className="rounded"
                  />
                  {issue}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Prioridad
            </label>
            <select
              value={currentZone.priority}
              onChange={(e) => setCurrentZone(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="low">Baja - Puede esperar</option>
              <option value="medium">Media - Planear</option>
              <option value="high">Alta - Urgente</option>
            </select>
          </div>

          <textarea
            value={currentZone.notes}
            onChange={(e) => setCurrentZone(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas adicionales..."
            rows={2}
            className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-cyan-500 focus:outline-none resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={addZone}
              disabled={!currentZone.name || currentZone.usage === 0}
              className="flex-1 bg-cyan-600 text-white py-2 rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
            >
              Agregar
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setCurrentZone({ name: '', usage: 0, issues: [], priority: 'medium', notes: '' })
              }}
              className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Zones List */}
      {zones.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-900">Zonas Auditadas</h4>
            <button
              onClick={async () => {
                if (enrollmentId && moduleId && lessonId) {
                  await saveToolData({
                    enrollment_id: enrollmentId,
                    module_id: moduleId,
                    lesson_id: lessonId,
                    tool_name: 'water-audit-tool',
                    tool_data: { zones },
                    tool_type: 'assessment'
                  })
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              💾 Guardar Todo
            </button>
          </div>
          {zones.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 }
            return priorityOrder[b.priority] - priorityOrder[a.priority]
          }).map((zone) => {
            const priorityColor = zone.priority === 'high' ? 'bg-red-100 border-red-300' : 
                                   zone.priority === 'medium' ? 'bg-yellow-100 border-yellow-300' : 
                                   'bg-green-100 border-green-300'
            
            return (
              <div key={zone.id} className={`rounded-lg border-2 p-4 ${priorityColor}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-bold text-slate-900">{zone.name}</h5>
                    <p className="text-sm text-slate-600">{zone.usage} L/día</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    zone.priority === 'high' ? 'bg-red-200 text-red-800' :
                    zone.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-green-200 text-green-800'
                  }`}>
                    {zone.priority === 'high' ? '🔴 Alta' : zone.priority === 'medium' ? '🟡 Media' : '🟢 Baja'}
                  </span>
                </div>
                
                {zone.issues.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Problemas:</p>
                    <div className="flex flex-wrap gap-1">
                      {zone.issues.map((issue, i) => (
                        <span key={i} className="text-xs bg-white px-2 py-1 rounded">
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {zone.notes && (
                  <p className="text-sm text-slate-600 mt-2">{zone.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 5: Conservation Tracker
// =========================================================

interface ConservationLog {
  week: number
  date: string
  waterUsed: number  // Liters
  target: number
  saved: number
  notes: string
}

interface ConservationTrackerProps {
  onTrack?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}

export function ConservationTracker({ onTrack, enrollmentId, moduleId, lessonId }: ConservationTrackerProps) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [baselineUsage, setBaselineUsage] = useState(0)
  const [reductionGoal, setReductionGoal] = useState(20) // Percentage
  const [logs, setLogs] = useState<ConservationLog[]>([])
  const [showAddLog, setShowAddLog] = useState(false)
  const [currentLog, setCurrentLog] = useState({
    waterUsed: 0,
    notes: ''
  })

  // Load previous data
  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ lesson_id: lessonId, module_id: moduleId, tool_name: 'conservation-tracker' })
        .then(data => {
          if (data?.baselineUsage) setBaselineUsage(data.baselineUsage)
          if (data?.reductionGoal) setReductionGoal(data.reductionGoal)
          if (data?.logs) setLogs(data.logs)
        })
    }
  }, [enrollmentId, moduleId, lessonId])

  const addLog = async () => {
    if (currentLog.waterUsed > 0) {
      const weekNumber = logs.length + 1
      const target = baselineUsage * (1 - reductionGoal / 100)
      const saved = baselineUsage - currentLog.waterUsed

      const newLog: ConservationLog = {
        week: weekNumber,
        date: new Date().toISOString().split('T')[0],
        waterUsed: currentLog.waterUsed,
        target,
        saved,
        notes: currentLog.notes
      }

      const updatedLogs = [...logs, newLog]
      setLogs(updatedLogs)
      setCurrentLog({ waterUsed: 0, notes: '' })
      setShowAddLog(false)

      // Save to database
      if (enrollmentId && moduleId && lessonId) {
        await saveToolData({
          enrollment_id: enrollmentId,
          module_id: moduleId,
          lesson_id: lessonId,
          tool_name: 'conservation-tracker',
          tool_data: { baselineUsage, reductionGoal, logs: updatedLogs },
          tool_type: 'tracker'
        })
      }

      onTrack?.(updatedLogs)
    }
  }

  const totalSaved = logs.reduce((sum, log) => sum + log.saved, 0)
  const avgUsage = logs.length > 0 ? logs.reduce((sum, log) => sum + log.waterUsed, 0) / logs.length : 0
  const actualReduction = baselineUsage > 0 ? ((baselineUsage - avgUsage) / baselineUsage) * 100 : 0

  return (
    <div className="bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-green-500 rounded-lg flex items-center justify-center">
          <LineChart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Seguimiento de Conservación</h3>
          <p className="text-sm text-slate-600">Rastrea tu reducción de agua semana a semana</p>
        </div>
      </div>

      {/* Setup */}
      {baselineUsage === 0 ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              💧 Consumo Actual/Línea Base (L/día)
            </label>
            <input
              type="number"
              value={baselineUsage || ''}
              onChange={(e) => setBaselineUsage(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-teal-500 focus:outline-none"
              placeholder="ej: 5000"
            />
            <p className="text-xs text-slate-500 mt-1">Usa la calculadora de huella hídrica si no conoces este dato</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              🎯 Meta de Reducción (%)
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={reductionGoal}
              onChange={(e) => setReductionGoal(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-slate-600">
              <span>5%</span>
              <span className="font-bold text-teal-700">{reductionGoal}%</span>
              <span>50%</span>
            </div>
            {baselineUsage > 0 && (
              <p className="text-sm text-teal-700 mt-2 font-medium">
                Meta: {(baselineUsage * (1 - reductionGoal / 100)).toFixed(0)} L/día (ahorro de {(baselineUsage * reductionGoal / 100).toFixed(0)} L/día)
              </p>
            )}
          </div>

          <button
            onClick={async () => {
              // Save baseline
              if (enrollmentId && moduleId && lessonId) {
                await saveToolData({
                  enrollment_id: enrollmentId,
                  module_id: moduleId,
                  lesson_id: lessonId,
                  tool_name: 'conservation-tracker',
                  tool_data: { baselineUsage, reductionGoal, logs: [] },
                  tool_type: 'tracker'
                })
              }
            }}
            disabled={baselineUsage === 0}
            className="w-full bg-gradient-to-r from-teal-600 to-green-600 text-white py-4 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            Comenzar Seguimiento
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{baselineUsage}</div>
              <div className="text-xs text-slate-600">Línea Base (L/día)</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">{avgUsage.toFixed(0)}</div>
              <div className="text-xs text-slate-600">Promedio Actual (L/día)</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{actualReduction.toFixed(1)}%</div>
              <div className="text-xs text-slate-600">Reducción Lograda</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalSaved.toFixed(0)}</div>
              <div className="text-xs text-slate-600">Total Ahorrado (L)</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold">Progreso hacia meta de {reductionGoal}%</span>
              <span className={`font-bold ${actualReduction >= reductionGoal ? 'text-green-600' : 'text-orange-600'}`}>
                {actualReduction >= reductionGoal ? '✅ ¡Meta alcanzada!' : `${(actualReduction / reductionGoal * 100).toFixed(0)}%`}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-teal-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((actualReduction / reductionGoal * 100), 100)}%` }}
              />
            </div>
          </div>

          {/* Add Log Button */}
          {!showAddLog && (
            <button
              onClick={() => setShowAddLog(true)}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              + Registrar Semana {logs.length + 1}
            </button>
          )}

          {/* Add Log Form */}
          {showAddLog && (
            <div className="bg-white rounded-lg p-4 space-y-4">
              <h4 className="font-bold text-slate-900">Semana {logs.length + 1}</h4>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Consumo de Agua (L/día)
                </label>
                <input
                  type="number"
                  value={currentLog.waterUsed || ''}
                  onChange={(e) => setCurrentLog(prev => ({ ...prev, waterUsed: Number(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-teal-500 focus:outline-none"
                  placeholder="0"
                />
                {currentLog.waterUsed > 0 && (
                  <p className={`text-sm mt-1 font-medium ${
                    currentLog.waterUsed < baselineUsage ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentLog.waterUsed < baselineUsage 
                      ? `✅ Ahorro: ${baselineUsage - currentLog.waterUsed} L/día (${((1 - currentLog.waterUsed / baselineUsage) * 100).toFixed(1)}%)`
                      : `⚠️ Aumento: ${currentLog.waterUsed - baselineUsage} L/día`
                    }
                  </p>
                )}
              </div>

              <textarea
                value={currentLog.notes}
                onChange={(e) => setCurrentLog(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas: ¿Qué acciones tomaste esta semana?"
                rows={2}
                className="w-full px-4 py-2 rounded-lg border-2 border-slate-300 focus:border-teal-500 focus:outline-none resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={addLog}
                  disabled={currentLog.waterUsed === 0}
                  className="flex-1 bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setShowAddLog(false)
                    setCurrentLog({ waterUsed: 0, notes: '' })
                  }}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Logs History */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900">Historial</h4>
                <button
                  onClick={async () => {
                    if (enrollmentId && moduleId && lessonId) {
                      await saveToolData({
                        enrollment_id: enrollmentId,
                        module_id: moduleId,
                        lesson_id: lessonId,
                        tool_name: 'conservation-tracker',
                        tool_data: { baselineUsage, reductionGoal, logs },
                        tool_type: 'tracker'
                      })
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  💾 Guardar Progreso
                </button>
              </div>
              {logs.slice().reverse().map((log) => (
                <div 
                  key={log.week} 
                  className={`rounded-lg border-2 p-3 ${
                    log.waterUsed <= log.target ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900">Semana {log.week}</div>
                      <div className="text-xs text-slate-600">{log.date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{log.waterUsed} L/día</div>
                      <div className={`text-xs font-medium ${log.saved > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {log.saved > 0 ? `↓ ${log.saved.toFixed(0)} L ahorrados` : `↑ ${Math.abs(log.saved).toFixed(0)} L más`}
                      </div>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-slate-600 mt-2">{log.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
      <WaterFootprintCalculator />
      <WaterAuditTool />
      <ConservationTracker />
    </div>
  )
}

