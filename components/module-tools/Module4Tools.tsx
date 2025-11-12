'use client'

import { useState, useEffect } from 'react'
import { Trash2, Recycle, CheckSquare, TrendingUp, Target, Leaf, Award } from 'lucide-react'
import { useToolDataSaver } from '@/lib/hooks/useToolDataSaver'

// Tool 1: Waste Stream Analyzer
interface WasteCategory {
  type: 'organic' | 'plastic' | 'paper' | 'metal' | 'glass' | 'hazardous' | 'other'
  weight: number // kg per week
  disposalCost: number // MXN per kg
  recyclable: boolean
  currentDestination: 'landfill' | 'recycle' | 'compost' | 'resale' | 'other'
}

interface WasteAnalysis {
  categories: WasteCategory[]
  totalWeight: number
  totalCost: number
  recyclablePercentage: number
  topWasteSources: string[]
  recommendations: string[]
}

export function WasteStreamAnalyzer({ onAnalyze, enrollmentId, moduleId, lessonId }: { 
  onAnalyze?: (analysis: WasteAnalysis) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  const [categories, setCategories] = useState<WasteCategory[]>([])
  const [currentCategory, setCurrentCategory] = useState<Partial<WasteCategory>>({
    type: 'organic',
    weight: 0,
    disposalCost: 3.5, // average MXN per kg
    recyclable: false,
    currentDestination: 'landfill'
  })
  const [analyzed, setAnalyzed] = useState(false)

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      const loadPrevious = async () => {
        const savedData = await loadToolData({
          enrollment_id: enrollmentId!,
          lesson_id: lessonId,
          module_id: moduleId,
          tool_name: 'waste-stream-analyzer'
        })
        if (savedData && savedData.categories) {
          setCategories(savedData.categories)
          if (savedData.analyzed) setAnalyzed(true)
        }
      }
      loadPrevious()
    }
  }, [enrollmentId, moduleId, lessonId])

  const wasteTypes = [
    { value: 'organic', label: '🥗 Orgánicos', recyclable: false, compostable: true },
    { value: 'plastic', label: '🥤 Plástico', recyclable: true, compostable: false },
    { value: 'paper', label: '📄 Papel/Cartón', recyclable: true, compostable: false },
    { value: 'metal', label: '🔧 Metal', recyclable: true, compostable: false },
    { value: 'glass', label: '🫙 Vidrio', recyclable: true, compostable: false },
    { value: 'hazardous', label: '⚠️ Peligrosos', recyclable: false, compostable: false },
    { value: 'other', label: '📦 Otros', recyclable: false, compostable: false }
  ]

  const addCategory = () => {
    if (currentCategory.type && currentCategory.weight && currentCategory.weight > 0) {
      const typeInfo = wasteTypes.find(t => t.value === currentCategory.type)
      const newCategory: WasteCategory = {
        type: currentCategory.type as any,
        weight: currentCategory.weight,
        disposalCost: currentCategory.disposalCost || 3.5,
        recyclable: typeInfo?.recyclable || false,
        currentDestination: currentCategory.currentDestination || 'landfill'
      }

      setCategories(prev => [...prev, newCategory])
      setCurrentCategory({
        type: 'organic',
        weight: 0,
        disposalCost: 3.5,
        recyclable: false,
        currentDestination: 'landfill'
      })
    }
  }

  const analyze = async () => {
    const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0)
    const totalCost = categories.reduce((sum, c) => sum + (c.weight * c.disposalCost), 0)
    const recyclableWeight = categories.filter(c => c.recyclable).reduce((sum, c) => sum + c.weight, 0)
    const recyclablePercentage = (recyclableWeight / totalWeight) * 100

    // Find top 3 waste sources
    const sorted = [...categories].sort((a, b) => b.weight - a.weight)
    const topWasteSources = sorted.slice(0, 3).map(c => wasteTypes.find(t => t.value === c.type)?.label || c.type)

    // Generate recommendations
    const recommendations: string[] = []
    if (recyclablePercentage < 30) {
      recommendations.push('Implementar programa de reciclaje - potencial de mejoría alto')
    }
    const organicWeight = categories.find(c => c.type === 'organic')?.weight || 0
    if (organicWeight > totalWeight * 0.3) {
      recommendations.push('Implementar sistema de compostaje para orgánicos')
    }
    if (categories.some(c => c.currentDestination === 'landfill' && c.recyclable)) {
      recommendations.push('Identificar compradores para materiales reciclables')
    }

    const analysis: WasteAnalysis = {
      categories,
      totalWeight,
      totalCost,
      recyclablePercentage,
      topWasteSources,
      recommendations
    }

    setAnalyzed(true)

    // ✨ Save to database for ESG reporting
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'waste-stream-analyzer',
        tool_data: { categories, analyzed: true, analysis },
        tool_type: 'analyzer'
      })
    }

    if (onAnalyze) {
      onAnalyze(analysis)
    }
  }

  const analysis: WasteAnalysis | null = analyzed ? {
    categories,
    totalWeight: categories.reduce((sum, c) => sum + c.weight, 0),
    totalCost: categories.reduce((sum, c) => sum + (c.weight * c.disposalCost), 0),
    recyclablePercentage: (categories.filter(c => c.recyclable).reduce((sum, c) => sum + c.weight, 0) / categories.reduce((sum, c) => sum + c.weight, 0)) * 100,
    topWasteSources: [...categories].sort((a, b) => b.weight - a.weight).slice(0, 3).map(c => wasteTypes.find(t => t.value === c.type)?.label || c.type),
    recommendations: []
  } : null

  return (
    <div className="bg-gradient-to-br from-green-50 to-lime-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-lime-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-green-900">Analizador de Residuos</h3>
          <p className="text-xs sm:text-sm text-green-700">Categoriza y cuantifica tus residuos</p>
        </div>
      </div>

      {!analyzed ? (
        <div className="space-y-4">
          {/* Summary if categories exist */}
          {categories.length > 0 && (
            <div className="bg-white rounded-lg p-4 border-2 border-green-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-900">
                    {categories.reduce((sum, c) => sum + c.weight, 0).toFixed(0)} kg
                  </div>
                  <div className="text-xs text-green-700">Total Semanal</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-900">
                    ${categories.reduce((sum, c) => sum + (c.weight * c.disposalCost), 0).toFixed(0)}
                  </div>
                  <div className="text-xs text-orange-700">Costo Semanal</div>
                </div>
              </div>
            </div>
          )}

          {/* Add Category Form */}
          <div className="bg-green-100 rounded-xl p-4 border-2 border-green-300 space-y-3">
            <h4 className="font-bold text-green-900 text-sm sm:text-base">Agregar Categoría</h4>

            <div>
              <label className="block text-sm font-medium text-green-900 mb-2">Tipo de Residuo</label>
              <select
                value={currentCategory.type}
                onChange={(e) => setCurrentCategory(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none text-sm"
              >
                {wasteTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">Peso Semanal (kg)</label>
                <input
                  type="number"
                  value={currentCategory.weight || ''}
                  onChange={(e) => setCurrentCategory(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none text-sm"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-green-900 mb-2">Costo ($/kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentCategory.disposalCost || ''}
                  onChange={(e) => setCurrentCategory(prev => ({ ...prev, disposalCost: parseFloat(e.target.value) || 3.5 }))}
                  className="w-full px-4 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none text-sm"
                  placeholder="3.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-green-900 mb-2">Destino Actual</label>
              <select
                value={currentCategory.currentDestination}
                onChange={(e) => setCurrentCategory(prev => ({ ...prev, currentDestination: e.target.value as any }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none text-sm"
              >
                <option value="landfill">🗑️ Relleno Sanitario</option>
                <option value="recycle">♻️ Reciclaje</option>
                <option value="compost">🌱 Compostaje</option>
                <option value="resale">💰 Reventa</option>
                <option value="other">📦 Otro</option>
              </select>
            </div>

            <button
              onClick={addCategory}
              disabled={!currentCategory.weight || currentCategory.weight <= 0}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              + Agregar Categoría
            </button>
          </div>

          {/* Categories List */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-green-900 text-sm">Categorías Agregadas:</h4>
              {categories.map((cat, idx) => {
                const typeInfo = wasteTypes.find(t => t.value === cat.type)
                return (
                  <div key={idx} className="bg-white p-3 rounded-lg border-2 border-green-200 flex justify-between items-center">
                    <div className="flex-1">
                      <div className="font-bold text-sm">{typeInfo?.label}</div>
                      <div className="text-xs text-slate-600">
                        {cat.weight} kg • ${(cat.weight * cat.disposalCost).toFixed(0)} • {
                          cat.currentDestination === 'landfill' ? '🗑️' :
                          cat.currentDestination === 'recycle' ? '♻️' :
                          cat.currentDestination === 'compost' ? '🌱' :
                          cat.currentDestination === 'resale' ? '💰' : '📦'
                        }
                      </div>
                    </div>
                    <button
                      onClick={() => setCategories(prev => prev.filter((_, i) => i !== idx))}
                      className="ml-2 text-red-600 hover:text-red-800 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={categories.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Analizar Residuos ({categories.length} categorías)
          </button>
        </div>
      ) : analysis && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-green-200 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-900">{analysis.totalWeight.toFixed(0)}</div>
              <div className="text-xs sm:text-sm text-green-700">kg/semana</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border-2 border-orange-200 text-center">
              <div className="text-xl sm:text-2xl font-bold text-orange-900">${analysis.totalCost.toFixed(0)}</div>
              <div className="text-xs sm:text-sm text-orange-700">$/semana</div>
            </div>
            <div className={`rounded-lg p-3 sm:p-4 border-2 text-center ${
              analysis.recyclablePercentage >= 50 ? 'bg-green-50 border-green-200' :
              analysis.recyclablePercentage >= 30 ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className={`text-xl sm:text-2xl font-bold ${
                analysis.recyclablePercentage >= 50 ? 'text-green-900' :
                analysis.recyclablePercentage >= 30 ? 'text-yellow-900' :
                'text-red-900'
              }`}>
                {analysis.recyclablePercentage.toFixed(0)}%
              </div>
              <div className={`text-xs sm:text-sm ${
                analysis.recyclablePercentage >= 50 ? 'text-green-700' :
                analysis.recyclablePercentage >= 30 ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                Reciclable
              </div>
            </div>
          </div>

          {/* Pie Chart Visualization (simple bars) */}
          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <h4 className="font-bold text-green-900 mb-3 text-sm sm:text-base">Distribución por Tipo:</h4>
            <div className="space-y-2">
              {analysis.categories.map((cat, idx) => {
                const typeInfo = wasteTypes.find(t => t.value === cat.type)
                const percentage = (cat.weight / analysis.totalWeight) * 100
                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium">{typeInfo?.label}</span>
                      <span className="text-xs font-bold">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-lime-500 h-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top Waste Sources */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <h4 className="font-bold text-red-900 mb-2 text-sm sm:text-base">🔴 Top 3 Fuentes de Residuos:</h4>
            <ol className="space-y-1 text-sm">
              {analysis.topWasteSources.map((source, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="font-bold text-red-900">{idx + 1}.</span>
                  <span>{source}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">💡 Recomendaciones:</h4>
              <ul className="space-y-1 text-xs sm:text-sm text-blue-800">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setAnalyzed(false)
              setCategories([])
            }}
            className="w-full bg-green-100 text-green-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-green-200 transition-colors min-h-[44px]"
          >
            Nuevo Análisis
          </button>
        </div>
      )}
    </div>
  )
}

// Tool 2: 5 R's Implementation Checklist
interface RImplementation {
  r: 'refuse' | 'reduce' | 'reuse' | 'recycle' | 'regenerate'
  actions: {
    action: string
    implemented: boolean
    impact: 'low' | 'medium' | 'high'
    notes: string
  }[]
}

export function FiveRsChecklist({ onComplete, enrollmentId, moduleId, lessonId }: { 
  onComplete?: (data: RImplementation[]) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData, loadToolData } = useToolDataSaver()

  useEffect(() => {
    if (enrollmentId && moduleId && lessonId) {
      loadToolData({ enrollment_id: enrollmentId!, lesson_id: lessonId, module_id: moduleId, tool_name: 'five-rs-checklist' })
        .then(data => { if (data) console.log('Loaded:', data) })
    }
  }, [enrollmentId, moduleId, lessonId])

  const handleSave = async (data: RImplementation[]) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'five-rs-checklist',
        tool_data: { implementation: data },
        tool_type: 'assessment'
      })
    }
    onComplete?.(data)
  }
  const [implementations, setImplementations] = useState<RImplementation[]>([
    { r: 'refuse', actions: [] },
    { r: 'reduce', actions: [] },
    { r: 'reuse', actions: [] },
    { r: 'recycle', actions: [] },
    { r: 'regenerate', actions: [] }
  ])

  const rInfo = {
    refuse: {
      name: '1. Rechazar',
      icon: '🚫',
      color: 'red',
      description: 'Evitar residuos innecesarios desde el origen',
      examples: [
        'Rechazar bolsas de plástico desechables',
        'Evitar empaques innecesarios en compras',
        'Rechazar artículos promocionales desechables',
        'No aceptar volantes y propaganda impresa'
      ]
    },
    reduce: {
      name: '2. Reducir',
      icon: '📉',
      color: 'orange',
      description: 'Minimizar la cantidad de residuos generados',
      examples: [
        'Implementar producción just-in-time',
        'Optimizar diseños para reducir material',
        'Digitalizar documentos y procesos',
        'Comprar a granel para reducir empaques'
      ]
    },
    reuse: {
      name: '3. Reutilizar',
      icon: '🔄',
      color: 'yellow',
      description: 'Dar segunda vida a materiales y productos',
      examples: [
        'Reutilizar cajas y pallets',
        'Implementar envases retornables',
        'Reutilizar agua en procesos',
        'Donar equipos y muebles usables'
      ]
    },
    recycle: {
      name: '4. Reciclar',
      icon: '♻️',
      color: 'green',
      description: 'Convertir residuos en nuevos materiales',
      examples: [
        'Separar residuos en origen',
        'Vender materiales a recicladores',
        'Implementar contenedores de reciclaje',
        'Capacitar al personal en separación'
      ]
    },
    regenerate: {
      name: '5. Regenerar',
      icon: '🌱',
      color: 'teal',
      description: 'Crear valor y restaurar sistemas naturales',
      examples: [
        'Compostaje de orgánicos',
        'Biodigestores para energía',
        'Reforestación con fondos de venta de reciclables',
        'Economía circular: producto → uso → nuevo producto'
      ]
    }
  }

  const toggleAction = (rIndex: number, actionText: string) => {
    setImplementations(prev => {
      const updated = [...prev]
      const r = updated[rIndex]
      const existingIndex = r.actions.findIndex(a => a.action === actionText)
      
      if (existingIndex >= 0) {
        r.actions[existingIndex].implemented = !r.actions[existingIndex].implemented
      } else {
        r.actions.push({
          action: actionText,
          implemented: true,
          impact: 'medium',
          notes: ''
        })
      }
      
      return updated
    })
  }

  const getCompletionRate = () => {
    const total = Object.values(rInfo).reduce((sum, r) => sum + r.examples.length, 0)
    const completed = implementations.reduce((sum, r) => sum + r.actions.filter(a => a.implemented).length, 0)
    return (completed / total) * 100
  }

  const completionRate = getCompletionRate()

  return (
    <div className="bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-blue-900">Las 5 R's en Acción</h3>
          <p className="text-xs sm:text-sm text-blue-700">Implementa la jerarquía de residuos</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-lg p-4 border-2 border-blue-200 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progreso de Implementación:</span>
          <span className="text-sm font-bold text-blue-900">{completionRate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-teal-500 h-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* 5 R's Checklist */}
      <div className="space-y-3">
        {Object.entries(rInfo).map(([key, info], rIndex) => (
          <div key={key} className={`bg-${info.color}-50 border-2 border-${info.color}-200 rounded-lg p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{info.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-sm sm:text-base">{info.name}</h4>
                <p className="text-xs text-slate-600">{info.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {info.examples.map((example, idx) => {
                const implemented = implementations[rIndex].actions.find(a => a.action === example)?.implemented || false
                return (
                  <button
                    key={idx}
                    onClick={() => toggleAction(rIndex, example)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      implemented
                        ? `bg-${info.color}-100 border-${info.color}-400`
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg flex-shrink-0">
                        {implemented ? '✅' : '⭕'}
                      </span>
                      <span className={`text-sm ${implemented ? 'font-medium' : ''}`}>
                        {example}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onComplete && onComplete(implementations)}
        disabled={completionRate < 20}
        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
      >
        Guardar Progreso
      </button>
    </div>
  )
}

// Tool 3: Composting Calculator
export function CompostingCalculator({ onCalculate, enrollmentId, moduleId, lessonId }: { 
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
        tool_name: 'composting-calculator',
        tool_data: result,
        tool_type: 'calculator'
      })
    }
    onCalculate?.(result)
  }
  const [inputs, setInputs] = useState({
    organicWaste: 0, // kg per week
    compostYield: 30, // % conversion rate
    fertilizerPrice: 150, // MXN per 20kg bag
    implementationCost: 15000, // MXN
    operatingCost: 500 // MXN per month
  })

  const [calculated, setCalculated] = useState(false)

  const calculate = () => {
    // Weekly compost production
    const weeklyCompost = inputs.organicWaste * (inputs.compostYield / 100)
    const monthlyCompost = weeklyCompost * 4
    const yearlyCompost = weeklyCompost * 52

    // Fertilizer replacement value
    const bagsReplaced = yearlyCompost / 20 // 20kg per bag
    const yearlySavings = bagsReplaced * inputs.fertilizerPrice

    // ROI calculation
    const totalYearlyCost = (inputs.operatingCost * 12)
    const netYearlySavings = yearlySavings - totalYearlyCost
    const paybackMonths = inputs.implementationCost / (netYearlySavings / 12)

    // CO2 reduction (landfill avoidance)
    const co2Saved = yearlyCompost * 0.5 // ~0.5 kg CO2 per kg of organic waste diverted

    const result = {
      weeklyCompost,
      monthlyCompost,
      yearlyCompost,
      yearlySavings,
      totalYearlyCost,
      netYearlySavings,
      paybackMonths,
      co2Saved
    }

    setCalculated(true)
    if (onCalculate) {
      onCalculate(result)
    }
  }

  const result = calculated ? {
    weeklyCompost: inputs.organicWaste * (inputs.compostYield / 100),
    monthlyCompost: inputs.organicWaste * (inputs.compostYield / 100) * 4,
    yearlyCompost: inputs.organicWaste * (inputs.compostYield / 100) * 52,
    yearlySavings: (inputs.organicWaste * (inputs.compostYield / 100) * 52 / 20) * inputs.fertilizerPrice,
    totalYearlyCost: inputs.operatingCost * 12,
    netYearlySavings: ((inputs.organicWaste * (inputs.compostYield / 100) * 52 / 20) * inputs.fertilizerPrice) - (inputs.operatingCost * 12),
    paybackMonths: inputs.implementationCost / ((((inputs.organicWaste * (inputs.compostYield / 100) * 52 / 20) * inputs.fertilizerPrice) - (inputs.operatingCost * 12)) / 12),
    co2Saved: inputs.organicWaste * (inputs.compostYield / 100) * 52 * 0.5
  } : null

  return (
    <div className="bg-gradient-to-br from-lime-50 to-green-50 border-2 border-lime-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-lime-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-lime-900">Calculadora de Compostaje</h3>
          <p className="text-xs sm:text-sm text-lime-700">Calcula producción y ahorros</p>
        </div>
      </div>

      {!calculated ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-lime-900 mb-2">
              Residuos Orgánicos Semanales (kg)
            </label>
            <input
              type="number"
              value={inputs.organicWaste || ''}
              onChange={(e) => setInputs(prev => ({ ...prev, organicWaste: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-lime-200 focus:border-lime-500 focus:outline-none text-sm sm:text-base"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-lime-900 mb-2">
              Rendimiento de Compostaje (%)
            </label>
            <input
              type="number"
              value={inputs.compostYield}
              onChange={(e) => setInputs(prev => ({ ...prev, compostYield: parseInt(e.target.value) || 30 }))}
              className="w-full px-4 py-3 rounded-lg border-2 border-lime-200 focus:border-lime-500 focus:outline-none text-sm sm:text-base"
              placeholder="30"
            />
            <p className="text-xs text-lime-600 mt-1">Típicamente 25-40%</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-lime-900 mb-2">
                Costo Implementación (MXN)
              </label>
              <input
                type="number"
                value={inputs.implementationCost}
                onChange={(e) => setInputs(prev => ({ ...prev, implementationCost: parseInt(e.target.value) || 15000 }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-lime-200 focus:border-lime-500 focus:outline-none text-sm"
                placeholder="15000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-lime-900 mb-2">
                Operación Mensual (MXN)
              </label>
              <input
                type="number"
                value={inputs.operatingCost}
                onChange={(e) => setInputs(prev => ({ ...prev, operatingCost: parseInt(e.target.value) || 500 }))}
                className="w-full px-4 py-3 rounded-lg border-2 border-lime-200 focus:border-lime-500 focus:outline-none text-sm"
                placeholder="500"
              />
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={inputs.organicWaste <= 0}
            className="w-full bg-gradient-to-r from-lime-600 to-green-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 min-h-[44px]"
          >
            Calcular Beneficios
          </button>
        </div>
      ) : result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-3 sm:p-4 border-2 border-lime-200 text-center">
              <div className="text-xl sm:text-2xl font-bold text-lime-900">{result.yearlyCompost.toFixed(0)} kg</div>
              <div className="text-xs sm:text-sm text-lime-700">Compost/Año</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4 border-2 border-green-200 text-center">
              <div className="text-xl sm:text-2xl font-bold text-green-900">${result.netYearlySavings.toFixed(0)}</div>
              <div className="text-xs sm:text-sm text-green-700">Ahorro Neto/Año</div>
            </div>
          </div>

          <div className="bg-lime-100 border-2 border-lime-300 rounded-lg p-4">
            <h4 className="font-bold text-lime-900 mb-3 text-sm sm:text-base">📊 Análisis Financiero:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Ahorro en fertilizantes:</span>
                <span className="font-bold text-green-900">${result.yearlySavings.toFixed(0)}/año</span>
              </div>
              <div className="flex justify-between">
                <span>Costo operación:</span>
                <span className="font-bold text-orange-900">-${result.totalYearlyCost}/año</span>
              </div>
              <div className="border-t border-lime-400 pt-2 flex justify-between">
                <span className="font-medium">Recuperación de inversión:</span>
                <span className="font-bold text-lime-900">{result.paybackMonths.toFixed(1)} meses</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-2 text-sm sm:text-base">🌍 Impacto Ambiental:</h4>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌳</span>
              <div>
                <div className="font-bold text-green-900">{result.co2Saved.toFixed(0)} kg CO₂ evitados/año</div>
                <div className="text-xs text-green-700">Al evitar descomposición en relleno sanitario</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setCalculated(false)
              setInputs({
                organicWaste: 0,
                compostYield: 30,
                fertilizerPrice: 150,
                implementationCost: 15000,
                operatingCost: 500
              })
            }}
            className="w-full bg-lime-100 text-lime-700 py-3 rounded-lg font-medium text-sm sm:text-base hover:bg-lime-200 transition-colors min-h-[44px]"
          >
            Nuevo Cálculo
          </button>
        </div>
      )}
    </div>
  )
}

// Tool 4: Zero Waste Certification Roadmap (Simplified)
export function ZeroWasteCertificationRoadmap({ onSave, enrollmentId, moduleId, lessonId }: { 
  onSave?: (data: any) => void
  enrollmentId?: string
  moduleId?: string
  lessonId?: string
}) {
  const { saveToolData } = useToolDataSaver()
  
  const handleSaveRoadmap = async (data: any) => {
    if (enrollmentId && moduleId && lessonId) {
      await saveToolData({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        lesson_id: lessonId,
        tool_name: 'continuous-improvement',
        tool_data: data,
        tool_type: 'tracker'
      })
    }
    onSave?.(data)
  }
  const [currentRate, setCurrentRate] = useState(0)
  const [targetLevel, setTargetLevel] = useState<'bronze' | 'silver' | 'gold'>('bronze')

  const levels = {
    bronze: { name: 'Bronce', target: 50, color: 'orange', description: '50% desviación de relleno sanitario' },
    silver: { name: 'Plata', target: 75, color: 'slate', description: '75% desviación de relleno sanitario' },
    gold: { name: 'Oro', target: 90, color: 'yellow', description: '90%+ desviación de relleno sanitario' }
  }

  const levelInfo = levels[targetLevel]
  const gap = Math.max(0, levelInfo.target - currentRate)
  const progress = Math.min(100, (currentRate / levelInfo.target) * 100)

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-amber-900">Ruta a Certificación Cero Residuos</h3>
          <p className="text-xs sm:text-sm text-amber-700">Planifica tu camino hacia la certificación</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-900 mb-2">
            Tasa Actual de Desviación (%)
          </label>
          <input
            type="number"
            value={currentRate || ''}
            onChange={(e) => setCurrentRate(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-sm sm:text-base"
            placeholder="25"
          />
          <p className="text-xs text-amber-600 mt-1">% de residuos que NO van a relleno sanitario</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-900 mb-3">Meta de Certificación:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(levels).map(([key, level]) => (
              <button
                key={key}
                onClick={() => setTargetLevel(key as any)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  targetLevel === key
                    ? `border-${level.color}-500 bg-${level.color}-50`
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{level.name}</div>
                <div className="text-xs text-slate-600">{level.target}%</div>
              </button>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg p-4 border-2 border-amber-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progreso hacia {levelInfo.name}:</span>
            <span className="text-sm font-bold text-amber-900">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-500 h-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Faltan {gap.toFixed(0)} puntos porcentuales para alcanzar certificación {levelInfo.name}
          </p>
        </div>

        {/* Action Plan */}
        {gap > 0 && (
          <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-4">
            <h4 className="font-bold text-amber-900 mb-3 text-sm sm:text-base">📋 Plan de Acción:</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              {gap >= 40 && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">1.</span>
                    <span>Implementar separación en origen (orgánicos, reciclables, residuales)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">2.</span>
                    <span>Establecer alianzas con recicladores locales</span>
                  </li>
                </>
              )}
              {gap >= 20 && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold">{gap >= 40 ? '3' : '1'}.</span>
                    <span>Implementar compostaje para orgánicos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold">{gap >= 40 ? '4' : '2'}.</span>
                    <span>Auditoría mensual de residuos para mejorar</span>
                  </li>
                </>
              )}
              {gap > 0 && gap < 20 && (
                <>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">1.</span>
                    <span>Optimizar procesos de producción para reducir desperdicios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold">2.</span>
                    <span>Documentar todos los flujos de residuos para certificación</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        {gap === 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <div className="font-bold text-green-900 mb-1">¡Felicidades!</div>
            <div className="text-sm text-green-700">
              Has alcanzado el nivel requerido para certificación {levelInfo.name}
            </div>
          </div>
        )}

        <button
          onClick={() => onSave && onSave({ currentRate, targetLevel, gap, progress })}
          className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-white py-3 rounded-lg font-bold text-sm sm:text-base hover:scale-105 transition-transform min-h-[44px]"
        >
          Guardar Roadmap
        </button>
      </div>
    </div>
  )
}

// Main Module 4 Tools Component
export default function Module4Tools() {
  return (
    <div className="space-y-6">
      <WasteStreamAnalyzer />
      <FiveRsChecklist />
      <CompostingCalculator />
      <ZeroWasteCertificationRoadmap />
    </div>
  )
}

