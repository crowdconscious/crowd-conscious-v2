'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, MapPin, DollarSign, CheckCircle, BarChart3, Users } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

// =========================================================
// TOOL 1: Supply Chain Mapper
// =========================================================
interface Supplier {
  id: string
  name: string
  type: 'raw_material' | 'manufacturer' | 'distributor' | 'retailer'
  location: string
  workers: number
  certified: boolean
  riskLevel: 'low' | 'medium' | 'high'
  notes: string
}

export function SupplyChainMapper({ onSave, enrollmentId, moduleId, lessonId }: { 
  onSave?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({
    name: '',
    type: 'raw_material',
    location: '',
    workers: 0,
    certified: false,
    riskLevel: 'low',
    notes: ''
  })

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ enrollment_id: enrollmentId!, lesson_id: lessonId, module_id: moduleId, tool_name: 'supply-chain-mapper' })
        .then(data => { if (data?.suppliers) setSuppliers(data.suppliers) })
    }
  }, [enrollmentId, moduleId, lessonId])

  const handleSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'supply-chain-mapper',
        tool_data: data,
        tool_type: 'mapper'
      })
    }
    onSave?.(data)
  }

  const addSupplier = () => {
    if (currentSupplier.name && currentSupplier.location) {
      const newSupplier: Supplier = {
        id: Date.now().toString(),
        name: currentSupplier.name,
        type: currentSupplier.type as any,
        location: currentSupplier.location,
        workers: currentSupplier.workers || 0,
        certified: currentSupplier.certified || false,
        riskLevel: currentSupplier.riskLevel as any,
        notes: currentSupplier.notes || ''
      }

      const updated = [...suppliers, newSupplier]
      setSuppliers(updated)
      setCurrentSupplier({
        name: '',
        type: 'raw_material',
        location: '',
        workers: 0,
        certified: false,
        riskLevel: 'low',
        notes: ''
      })
      setShowForm(false)

      if (onSave) {
        onSave({ suppliers: updated, traceabilityScore: calculateTraceability(updated) })
      }
    }
  }

  const calculateTraceability = (sups: Supplier[]) => {
    if (sups.length === 0) return 0
    const certifiedCount = sups.filter(s => s.certified).length
    const lowRiskCount = sups.filter(s => s.riskLevel === 'low').length
    return Math.round(((certifiedCount + lowRiskCount) / (sups.length * 2)) * 100)
  }

  const traceabilityScore = calculateTraceability(suppliers)

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Mapa de Cadena de Suministro</h3>
          <p className="text-xs sm:text-sm text-blue-700">Visualiza y evalúa tu cadena de valor</p>
        </div>
      </div>

      {suppliers.length > 0 && (
        <div className="mb-4 bg-white rounded-lg p-4 border-2 border-blue-200">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900">{traceabilityScore}%</div>
            <div className="text-sm text-blue-700">Puntuación de Trazabilidad</div>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-blue-700 transition-colors mb-4 min-h-[44px]"
        >
          + Agregar Proveedor
        </button>
      )}

      {showForm && (
        <div className="bg-blue-100 rounded-xl p-4 border-2 border-blue-300 mb-4 space-y-3">
          <h4 className="font-bold text-blue-900 text-sm sm:text-base">Nuevo Proveedor</h4>

          <input
            type="text"
            placeholder="Nombre del proveedor"
            value={currentSupplier.name}
            onChange={(e) => setCurrentSupplier(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
          />

          <select
            value={currentSupplier.type}
            onChange={(e) => setCurrentSupplier(prev => ({ ...prev, type: e.target.value as any }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="raw_material">🌾 Materia Prima</option>
            <option value="manufacturer">🏭 Manufactura</option>
            <option value="distributor">🚚 Distribución</option>
            <option value="retailer">🏪 Venta al Público</option>
          </select>

          <input
            type="text"
            placeholder="Ubicación (ciudad, país)"
            value={currentSupplier.location}
            onChange={(e) => setCurrentSupplier(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
          />

          <input
            type="number"
            placeholder="Número de trabajadores"
            value={currentSupplier.workers || ''}
            onChange={(e) => setCurrentSupplier(prev => ({ ...prev, workers: parseInt(e.target.value) || 0 }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
          />

          <select
            value={currentSupplier.riskLevel}
            onChange={(e) => setCurrentSupplier(prev => ({ ...prev, riskLevel: e.target.value as any }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="low">✅ Bajo Riesgo</option>
            <option value="medium">⚠️ Riesgo Medio</option>
            <option value="high">🚨 Alto Riesgo</option>
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={currentSupplier.certified || false}
              onChange={(e) => setCurrentSupplier(prev => ({ ...prev, certified: e.target.checked }))}
              className="w-5 h-5"
            />
            <span className="text-sm">Certificado (Fair Trade, SA8000, etc.)</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              onClick={addSupplier}
              disabled={!currentSupplier.name || !currentSupplier.location}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-blue-900 text-sm">Proveedores en tu Cadena:</h4>
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`p-3 rounded-lg border-2 ${
                supplier.riskLevel === 'high' ? 'bg-red-50 border-red-300' :
                supplier.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                'bg-green-50 border-green-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-sm flex items-center gap-2">
                    {supplier.name}
                    {supplier.certified && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Certificado</span>}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    📍 {supplier.location} • 👥 {supplier.workers} trabajadores
                  </div>
                </div>
                <button
                  onClick={() => setSuppliers(prev => prev.filter(s => s.id !== supplier.id))}
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
// TOOL 2: Fair Wage Calculator
// =========================================================
export function FairWageCalculator({ onCalculate, enrollmentId, moduleId, lessonId }: { 
  onCalculate?: (result: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleCalculateWithSave = async (result: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'fair-wage-calculator',
        tool_data: result,
        tool_type: 'calculator'
      })
    }
    onCalculate?.(result)
  }
  const [inputs, setInputs] = useState({
    region: '',
    role: '',
    currentWage: 0,
    hoursPerWeek: 40
  })
  const [calculated, setCalculated] = useState(false)

  const regionData: Record<string, { minimum: number; living: number }> = {
    'CDMX': { minimum: 248.93, living: 450 },
    'Monterrey': { minimum: 248.93, living: 420 },
    'Guadalajara': { minimum: 248.93, living: 400 },
    'Tijuana': { minimum: 374.89, living: 480 },
    'Otro': { minimum: 248.93, living: 380 }
  }

  const calculate = () => {
    const data = regionData[inputs.region] || regionData['Otro']
    const monthlyWage = (inputs.currentWage * inputs.hoursPerWeek * 4.33)
    const gap = data.living - inputs.currentWage
    const gapPercentage = (gap / data.living) * 100
    const yearlyImpact = gap * inputs.hoursPerWeek * 52

    const result = {
      currentDaily: inputs.currentWage,
      minimumWage: data.minimum,
      livingWage: data.living,
      monthlyWage,
      gap: Math.max(0, gap),
      gapPercentage: Math.max(0, gapPercentage),
      yearlyImpact: Math.max(0, yearlyImpact),
      meetsLiving: inputs.currentWage >= data.living
    }

    setCalculated(true)
    if (onCalculate) {
      onCalculate(result)
    }
  }

  const data = regionData[inputs.region] || regionData['Otro']
  const result = calculated ? {
    currentDaily: inputs.currentWage,
    minimumWage: data.minimum,
    livingWage: data.living,
    monthlyWage: (inputs.currentWage * inputs.hoursPerWeek * 4.33),
    gap: Math.max(0, data.living - inputs.currentWage),
    gapPercentage: Math.max(0, ((data.living - inputs.currentWage) / data.living) * 100),
    yearlyImpact: Math.max(0, (data.living - inputs.currentWage) * inputs.hoursPerWeek * 52),
    meetsLiving: inputs.currentWage >= data.living
  } : null

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-green-900">Calculadora de Salario Digno</h3>
          <p className="text-xs sm:text-sm text-green-700">Compara vs salario mínimo y salario digno</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-4">
          <select
            value={inputs.region}
            onChange={(e) => setInputs(prev => ({ ...prev, region: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm"
          >
            <option value="">Selecciona región...</option>
            <option value="CDMX">Ciudad de México</option>
            <option value="Monterrey">Monterrey</option>
            <option value="Guadalajara">Guadalajara</option>
            <option value="Tijuana">Tijuana (Zona Frontera)</option>
            <option value="Otro">Otra región</option>
          </select>

          <input
            type="text"
            placeholder="Puesto (ej: Operador de producción)"
            value={inputs.role}
            onChange={(e) => setInputs(prev => ({ ...prev, role: e.target.value }))}
            className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm"
          />

          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              Salario Actual Diario (MXN)
            </label>
            <input
              type="number"
              value={inputs.currentWage || ''}
              onChange={(e) => setInputs(prev => ({ ...prev, currentWage: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500 focus:outline-none text-sm"
              placeholder="350"
            />
          </div>

          <button
            onClick={calculate}
            disabled={!inputs.region || inputs.currentWage <= 0}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Calcular Brecha Salarial
          </button>
        </div>
      ) : result && (
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border-2 ${
            result.meetsLiving ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'
          }`}>
            <div className="text-center">
              <div className="text-3xl mb-2">
                {result.meetsLiving ? '✅' : '⚠️'}
              </div>
              <div className="font-bold text-lg">
                {result.meetsLiving ? '¡Salario Digno!' : 'Por Debajo del Salario Digno'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Salario Mínimo:</span>
              <span className="font-bold">${result.minimumWage}/día</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Salario Actual:</span>
              <span className="font-bold text-blue-900">${result.currentDaily}/día</span>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-sm font-medium">Salario Digno:</span>
              <span className="font-bold text-green-900">${result.livingWage}/día</span>
            </div>
          </div>

          {!result.meetsLiving && (
            <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
              <h4 className="font-bold text-orange-900 mb-2 text-sm">💰 Brecha Salarial:</h4>
              <div className="space-y-2 text-sm">
                <div>Diferencia diaria: <strong>${result.gap.toFixed(2)}</strong></div>
                <div>Diferencia mensual: <strong>${(result.gap * 22).toFixed(0)}</strong></div>
                <div>Impacto anual: <strong>${result.yearlyImpact.toFixed(0)}</strong></div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setCalculated(false)
              setInputs({ region: '', role: '', currentWage: 0, hoursPerWeek: 40 })
            }}
            className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-medium text-sm hover:bg-green-200 transition-colors min-h-[44px]"
          >
            Calcular Otro Puesto
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 3: Local Supplier Finder (Simplified)
// =========================================================
export function LocalSupplierFinder({ onFind, enrollmentId, moduleId, lessonId }: { 
  onFind?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleFindWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'local-supplier-finder',
        tool_data: data,
        tool_type: 'planner'
      })
    }
    onFind?.(data)
  }
  const [category, setCategory] = useState('')
  const [maxDistance, setMaxDistance] = useState(50)
  const [searched, setSearched] = useState(false)

  const categories = [
    'Alimentos y Bebidas',
    'Materias Primas',
    'Empaques y Envases',
    'Servicios de Limpieza',
    'Mantenimiento',
    'Transporte Local',
    'Papelería y Oficina'
  ]

  const search = () => {
    setSearched(true)
    if (onFind) {
      onFind({ category, maxDistance, timestamp: new Date().toISOString() })
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-amber-900">Buscador de Proveedores Locales</h3>
          <p className="text-xs sm:text-sm text-amber-700">Encuentra opciones cercanas y reduce tu huella</p>
        </div>
      </div>

      <div className="space-y-4">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-sm"
        >
          <option value="">Selecciona categoría...</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">
            Distancia máxima: {maxDistance} km
          </label>
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={maxDistance}
            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {!searched ? (
          <button
            onClick={search}
            disabled={!category}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Buscar Proveedores
          </button>
        ) : (
          <div className="bg-white rounded-lg p-4 border-2 border-amber-200">
            <div className="text-center mb-3">
              <div className="text-sm text-amber-700 mb-2">
                🔍 Búsqueda guardada para: <strong>{category}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Radio: {maxDistance} km
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
              <strong>💡 Próximamente:</strong> Directorio completo de proveedores locales certificados en tu región.
              Por ahora, tu preferencia ha sido registrada para reportes de impacto.
            </div>
            <button
              onClick={() => setSearched(false)}
              className="w-full mt-3 bg-amber-100 text-amber-700 py-2 rounded-lg font-medium text-sm hover:bg-amber-200"
            >
              Nueva Búsqueda
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =========================================================
// TOOL 4: Responsible Procurement Scorecard
// =========================================================
export function ResponsibleProcurementScorecard({ onScore, enrollmentId, moduleId, lessonId }: { 
  onScore?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleScoreWithSave = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'responsible-procurement-scorecard',
        tool_data: data,
        tool_type: 'assessment'
      })
    }
    onScore?.(data)
  }
  const [supplierName, setSupplierName] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [scored, setScored] = useState(false)

  const criteria = [
    { key: 'labor', label: 'Condiciones Laborales', weight: 15 },
    { key: 'wages', label: 'Salarios Dignos', weight: 15 },
    { key: 'environment', label: 'Impacto Ambiental', weight: 12 },
    { key: 'transparency', label: 'Transparencia', weight: 10 },
    { key: 'certifications', label: 'Certificaciones', weight: 10 },
    { key: 'local', label: 'Compra Local', weight: 10 },
    { key: 'diversity', label: 'Diversidad e Inclusión', weight: 10 },
    { key: 'ethics', label: 'Ética Empresarial', weight: 10 },
    { key: 'community', label: 'Impacto Comunitario', weight: 8 }
  ]

  const calculateTotal = () => {
    let total = 0
    criteria.forEach(c => {
      const score = scores[c.key] || 0
      total += (score / 5) * c.weight
    })
    return Math.round(total)
  }

  const handleScore = () => {
    const totalScore = calculateTotal()
    setScored(true)
    if (onScore) {
      onScore({ supplierName, scores, totalScore })
    }
  }

  const totalScore = calculateTotal()
  const allScored = criteria.every(c => scores[c.key] !== undefined)

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-purple-900">Scorecard de Compras Responsables</h3>
          <p className="text-xs sm:text-sm text-purple-700">Evalúa proveedores en 9 criterios</p>
        </div>
      </div>

      {!scored ? (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del proveedor"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-purple-200 focus:border-purple-500 focus:outline-none text-sm"
          />

          <div className="space-y-3">
            {criteria.map(c => (
              <div key={c.key} className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className="text-xs text-purple-600">Peso: {c.weight}%</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setScores(prev => ({ ...prev, [c.key]: rating }))}
                      className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
                        scores[c.key] === rating
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleScore}
            disabled={!supplierName || !allScored}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Calcular Puntuación
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`p-6 rounded-lg border-2 text-center ${
            totalScore >= 80 ? 'bg-green-50 border-green-300' :
            totalScore >= 60 ? 'bg-yellow-50 border-yellow-300' :
            'bg-red-50 border-red-300'
          }`}>
            <div className="text-4xl font-bold mb-1">
              {totalScore}/100
            </div>
            <div className="text-sm font-medium">
              {supplierName}
            </div>
            <div className="text-xs mt-2">
              {totalScore >= 80 ? '✅ Proveedor Preferido' :
               totalScore >= 60 ? '⚠️ Proveedor Aceptable' :
               '🚨 Requiere Mejoras'}
            </div>
          </div>

          <button
            onClick={() => {
              setScored(false)
              setSupplierName('')
              setScores({})
            }}
            className="w-full bg-purple-100 text-purple-700 py-3 rounded-lg font-medium text-sm hover:bg-purple-200 min-h-[44px]"
          >
            Evaluar Otro Proveedor
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================
// TOOL 5: Impact Report Generator (Simplified)
// =========================================================
export function ImpactReportGenerator({ onGenerate, enrollmentId, moduleId, lessonId }: { 
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
        tool_name: 'impact-report-generator',
        tool_data: data,
        tool_type: 'calculator'
      })
    }
    onGenerate?.(data)
  }
  const [data, setData] = useState({
    localSpend: 0,
    jobsSupported: 0,
    co2Saved: 0
  })
  const [generated, setGenerated] = useState(false)

  const generate = () => {
    setGenerated(true)
    if (onGenerate) {
      onGenerate(data)
    }
  }

  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-teal-900">Generador de Reporte de Impacto</h3>
          <p className="text-xs sm:text-sm text-teal-700">Cuantifica tu impacto de comercio justo</p>
        </div>
      </div>

      {!generated ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              Gasto en Proveedores Locales/Justos (MXN/año)
            </label>
            <input
              type="number"
              value={data.localSpend || ''}
              onChange={(e) => setData(prev => ({ ...prev, localSpend: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm"
              placeholder="500000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              Empleos Sostenidos (estimado)
            </label>
            <input
              type="number"
              value={data.jobsSupported || ''}
              onChange={(e) => setData(prev => ({ ...prev, jobsSupported: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm"
              placeholder="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-teal-900 mb-2">
              CO₂ Ahorrado vs Importación (kg/año)
            </label>
            <input
              type="number"
              value={data.co2Saved || ''}
              onChange={(e) => setData(prev => ({ ...prev, co2Saved: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-teal-200 focus:border-teal-500 focus:outline-none text-sm"
              placeholder="2500"
            />
          </div>

          <button
            onClick={generate}
            disabled={data.localSpend <= 0}
            className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-3 rounded-lg font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50 min-h-[44px]"
          >
            Generar Reporte
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg p-3 border-2 border-teal-200 text-center">
              <div className="text-xl font-bold text-teal-900">${(data.localSpend / 1000).toFixed(0)}K</div>
              <div className="text-xs text-teal-700">Inversión Local</div>
            </div>
            <div className="bg-white rounded-lg p-3 border-2 border-teal-200 text-center">
              <div className="text-xl font-bold text-teal-900">{data.jobsSupported}</div>
              <div className="text-xs text-teal-700">Empleos</div>
            </div>
            <div className="bg-white rounded-lg p-3 border-2 border-teal-200 text-center">
              <div className="text-xl font-bold text-teal-900">{(data.co2Saved / 1000).toFixed(1)}t</div>
              <div className="text-xs text-teal-700">CO₂ Evitado</div>
            </div>
          </div>

          <div className="bg-teal-100 border-2 border-teal-300 rounded-lg p-4">
            <h4 className="font-bold text-teal-900 mb-2 text-sm">📊 Resumen Ejecutivo:</h4>
            <ul className="space-y-1 text-xs text-teal-800">
              <li>✓ Invirtiendo ${data.localSpend.toLocaleString()} en comercio justo</li>
              <li>✓ Sosteniendo {data.jobsSupported} empleos dignos</li>
              <li>✓ Reduciendo {data.co2Saved.toLocaleString()} kg CO₂ en transporte</li>
            </ul>
          </div>

          <button
            onClick={() => {
              setGenerated(false)
              setData({ localSpend: 0, jobsSupported: 0, co2Saved: 0 })
            }}
            className="w-full bg-teal-100 text-teal-700 py-3 rounded-lg font-medium text-sm hover:bg-teal-200 min-h-[44px]"
          >
            Nuevo Reporte
          </button>
        </div>
      )}
    </div>
  )
}

// Main Module 5 Tools Component
export default function Module5Tools() {
  return (
    <div className="space-y-6">
      <SupplyChainMapper />
      <FairWageCalculator />
      <LocalSupplierFinder />
      <ResponsibleProcurementScorecard />
      <ImpactReportGenerator />
    </div>
  )
}

