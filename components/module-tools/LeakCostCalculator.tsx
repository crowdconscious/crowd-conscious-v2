'use client'

import { useState } from 'react'
import { Droplet, DollarSign, AlertTriangle, Download, Calculator } from 'lucide-react'

export default function LeakCostCalculator() {
  const [formData, setFormData] = useState({
    leakFlowRate: '', // liters per minute
    waterCost: '', // MXN per m³
    duration: '30', // days
    leakDescription: ''
  })
  const [result, setResult] = useState<any>(null)

  const calculateCost = () => {
    const flowRate = parseFloat(formData.leakFlowRate) || 0 // L/min
    const costPerM3 = parseFloat(formData.waterCost) || 0 // MXN/m³
    const days = parseFloat(formData.duration) || 30

    // Convert L/min to m³/day
    const dailyVolume = (flowRate * 60 * 24) / 1000 // m³/day
    const monthlyVolume = dailyVolume * 30 // m³/month
    const annualVolume = dailyVolume * 365 // m³/year
    const totalVolume = dailyVolume * days // m³ for duration

    // Calculate costs
    const dailyCost = dailyVolume * costPerM3
    const monthlyCost = monthlyVolume * costPerM3
    const annualCost = annualVolume * costPerM3
    const totalCost = totalVolume * costPerM3

    setResult({
      flowRate,
      costPerM3,
      days,
      dailyVolume,
      monthlyVolume,
      annualVolume,
      totalVolume,
      dailyCost,
      monthlyCost,
      annualCost,
      totalCost
    })
  }

  const exportReport = () => {
    if (!result) return

    const csv = [
      ['Calculadora de Costo de Fugas de Agua'],
      [],
      ['Descripción de la Fuga', formData.leakDescription || 'No especificada'],
      [],
      ['Parámetros'],
      ['Caudal de Fuga', `${result.flowRate} L/min`],
      ['Costo de Agua', `$${result.costPerM3.toFixed(2)} MXN/m³`],
      ['Duración', `${result.days} días`],
      [],
      ['Volúmenes'],
      ['Volumen Diario', `${result.dailyVolume.toFixed(2)} m³/día`],
      ['Volumen Mensual', `${result.monthlyVolume.toFixed(2)} m³/mes`],
      ['Volumen Anual', `${result.annualVolume.toFixed(2)} m³/año`],
      ['Volumen Total (período)', `${result.totalVolume.toFixed(2)} m³`],
      [],
      ['Costos'],
      ['Costo Diario', `$${result.dailyCost.toFixed(2)} MXN`],
      ['Costo Mensual', `$${result.monthlyCost.toFixed(2)} MXN`],
      ['Costo Anual', `$${result.annualCost.toFixed(2)} MXN`],
      ['Costo Total (período)', `$${result.totalCost.toFixed(2)} MXN`]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `costo-fugas-agua-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculadora: Costo de Fugas</h2>
        <p className="text-slate-600">Calcula el costo real de las fugas de agua en tu instalación</p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">💡 Tip para Medir el Caudal</p>
            <p>Coloca un recipiente de volumen conocido bajo la fuga y mide cuánto tiempo tarda en llenarse. Ejemplo: Si un balde de 10 litros se llena en 2 minutos, el caudal es 5 L/min.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descripción de la Fuga (opcional)
          </label>
          <input
            type="text"
            value={formData.leakDescription}
            onChange={(e) => setFormData({ ...formData, leakDescription: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Fuga en llave del baño principal"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Caudal de Fuga (L/min) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.leakFlowRate}
              onChange={(e) => setFormData({ ...formData, leakFlowRate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="5.0"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Litros por minuto</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Costo de Agua (MXN/m³) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.waterCost}
              onChange={(e) => setFormData({ ...formData, waterCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="15.00"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Precio por metro cúbico</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duración (días)
          </label>
          <input
            type="number"
            step="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="30"
          />
          <p className="text-xs text-slate-500 mt-1">Por cuántos días ha estado la fuga (o estimado)</p>
        </div>

        <button
          onClick={calculateCost}
          disabled={!formData.leakFlowRate || !formData.waterCost}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Calculator className="w-5 h-5" />
          Calcular Costo
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Resultados del Cálculo</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Volumen Diario</div>
                <div className="text-2xl font-bold text-red-600">
                  {result.dailyVolume.toFixed(2)} m³
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Costo Diario</div>
                <div className="text-2xl font-bold text-red-600">
                  ${result.dailyCost.toFixed(2)} MXN
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Costo Mensual</div>
                <div className="text-2xl font-bold text-orange-600">
                  ${result.monthlyCost.toFixed(2)} MXN
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Costo Anual</div>
                <div className="text-2xl font-bold text-red-600">
                  ${result.annualCost.toFixed(2)} MXN
                </div>
              </div>
            </div>

            {result.days !== 30 && (
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="text-sm text-slate-600 mb-1">Costo Total ({result.days} días)</div>
                <div className="text-2xl font-bold text-red-600">
                  ${result.totalCost.toFixed(2)} MXN
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Impacto de Reparar la Fuga</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Ahorro mensual:</strong> ${result.monthlyCost.toFixed(2)} MXN</p>
              <p>• <strong>Ahorro anual:</strong> ${result.annualCost.toFixed(2)} MXN</p>
              <p>• <strong>Agua recuperada:</strong> {result.annualVolume.toFixed(2)} m³/año</p>
              <p className="mt-2 font-semibold">La mayoría de las fugas se pueden reparar por menos de $500 MXN. ¡El ROI es inmediato!</p>
            </div>
          </div>

          <button
            onClick={exportReport}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>
      )}
    </div>
  )
}

