'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, Calendar, Download, Save, Calculator } from 'lucide-react'

interface ROIResult {
  implementationCost: number
  monthlySavings: number
  annualSavings: number
  coBenefits: number
  totalAnnualBenefits: number
  paybackMonths: number
  paybackYears: number
  threeYearROI: number
  fiveYearROI: number
  npv: number
}

export default function SustainabilityROICalculator() {
  const [formData, setFormData] = useState({
    projectName: '',
    implementationCost: '',
    monthlySavings: '',
    coBenefits: '',
    discountRate: '10', // Default 10%
    timeHorizon: '5' // Default 5 years
  })
  const [result, setResult] = useState<ROIResult | null>(null)
  const [calculated, setCalculated] = useState(false)

  const calculateROI = () => {
    const implementationCost = parseFloat(formData.implementationCost) || 0
    const monthlySavings = parseFloat(formData.monthlySavings) || 0
    const coBenefits = parseFloat(formData.coBenefits) || 0
    const discountRate = parseFloat(formData.discountRate) / 100 || 0.1
    const timeHorizon = parseInt(formData.timeHorizon) || 5

    const annualSavings = monthlySavings * 12
    const totalAnnualBenefits = annualSavings + coBenefits

    // Payback period
    const paybackMonths = implementationCost > 0 ? (implementationCost / monthlySavings) : 0
    const paybackYears = paybackMonths / 12

    // ROI calculations
    const threeYearBenefits = totalAnnualBenefits * 3
    const threeYearROI = implementationCost > 0 ? ((threeYearBenefits - implementationCost) / implementationCost) * 100 : 0

    const fiveYearBenefits = totalAnnualBenefits * 5
    const fiveYearROI = implementationCost > 0 ? ((fiveYearBenefits - implementationCost) / implementationCost) * 100 : 0

    // NPV calculation
    let npv = -implementationCost
    for (let year = 1; year <= timeHorizon; year++) {
      npv += totalAnnualBenefits / Math.pow(1 + discountRate, year)
    }

    setResult({
      implementationCost,
      monthlySavings,
      annualSavings,
      coBenefits,
      totalAnnualBenefits,
      paybackMonths,
      paybackYears,
      threeYearROI,
      fiveYearROI,
      npv
    })
    setCalculated(true)
  }

  const exportToExcel = () => {
    if (!result) return

    const csv = [
      ['Calculadora ROI Sustentabilidad', formData.projectName || 'Sin nombre'],
      [],
      ['Costo de Implementación', `$${result.implementationCost.toLocaleString('es-MX')} MXN`],
      ['Ahorro Mensual', `$${result.monthlySavings.toLocaleString('es-MX')} MXN`],
      ['Ahorro Anual', `$${result.annualSavings.toLocaleString('es-MX')} MXN`],
      ['Co-beneficios Anuales', `$${result.coBenefits.toLocaleString('es-MX')} MXN`],
      ['Beneficios Totales Anuales', `$${result.totalAnnualBenefits.toLocaleString('es-MX')} MXN`],
      [],
      ['Período de Recuperación', `${result.paybackMonths.toFixed(1)} meses (${result.paybackYears.toFixed(2)} años)`],
      ['ROI a 3 años', `${result.threeYearROI.toFixed(1)}%`],
      ['ROI a 5 años', `${result.fiveYearROI.toFixed(1)}%`],
      ['VPN (5 años, ${formData.discountRate}%)', `$${result.npv.toLocaleString('es-MX')} MXN`]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `roi-sustentabilidad-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculadora ROI Sustentabilidad</h2>
        <p className="text-slate-600">Calcula el retorno de inversión de tus proyectos de sustentabilidad</p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Instalación de paneles solares"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Costo de Implementación <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.implementationCost}
                onChange={(e) => setFormData({ ...formData, implementationCost: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
                required
              />
              <span className="absolute right-3 top-2.5 text-slate-500 text-sm">MXN</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ahorro Mensual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.monthlySavings}
                onChange={(e) => setFormData({ ...formData, monthlySavings: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
                required
              />
              <span className="absolute right-3 top-2.5 text-slate-500 text-sm">MXN</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Co-beneficios Anuales</label>
            <p className="text-xs text-slate-500 mb-1">Menos ausentismo, productividad, etc.</p>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                value={formData.coBenefits}
                onChange={(e) => setFormData({ ...formData, coBenefits: e.target.value })}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-slate-500 text-sm">MXN</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tasa de Descuento (%)</label>
            <input
              type="number"
              step="0.1"
              value={formData.discountRate}
              onChange={(e) => setFormData({ ...formData, discountRate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="10"
            />
          </div>
        </div>

        <button
          onClick={calculateROI}
          disabled={!formData.implementationCost || !formData.monthlySavings}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Calculator className="w-5 h-5" />
          Calcular ROI
        </button>
      </div>

      {calculated && result && (
        <>
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 mb-6 border-2 border-teal-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Resultados del Análisis</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Período de Recuperación</div>
                <div className="text-2xl font-bold text-teal-600">
                  {result.paybackMonths.toFixed(1)} meses
                </div>
                <div className="text-xs text-slate-500">({result.paybackYears.toFixed(2)} años)</div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">ROI a 3 Años</div>
                <div className={`text-2xl font-bold ${result.threeYearROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.threeYearROI.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">ROI a 5 Años</div>
                <div className={`text-2xl font-bold ${result.fiveYearROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {result.fiveYearROI.toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">VPN (5 años)</div>
                <div className={`text-2xl font-bold ${result.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${result.npv.toLocaleString('es-MX')}
                </div>
                <div className="text-xs text-slate-500">MXN</div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="text-sm font-semibold text-slate-700 mb-2">Resumen Financiero</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Costo de Implementación:</span>
                  <span className="font-medium">${result.implementationCost.toLocaleString('es-MX')} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Ahorro Anual:</span>
                  <span className="font-medium text-green-600">${result.annualSavings.toLocaleString('es-MX')} MXN</span>
                </div>
                {result.coBenefits > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Co-beneficios Anuales:</span>
                    <span className="font-medium text-green-600">${result.coBenefits.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700">Beneficios Totales Anuales:</span>
                  <span className="font-bold text-teal-600">${result.totalAnnualBenefits.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar a Excel
            </button>
            <button
              onClick={() => {
                console.log('Saving ROI calculation...', { formData, result })
                // Save to database via API
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

