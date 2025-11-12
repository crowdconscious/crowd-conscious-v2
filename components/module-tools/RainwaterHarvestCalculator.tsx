'use client'

import { useState } from 'react'
import { Droplet, CloudRain, Calculator, Download, Save } from 'lucide-react'

export default function RainwaterHarvestCalculator() {
  const [formData, setFormData] = useState({
    roofArea: '', // m²
    annualRainfall: '', // mm/year
    collectionEfficiency: '80', // %
    storageCapacity: '', // m³
    waterCost: '', // MXN/m³
    installationCost: '', // MXN
    maintenanceCost: '', // MXN/year
    location: ''
  })
  const [result, setResult] = useState<any>(null)

  const calculate = () => {
    const roofArea = parseFloat(formData.roofArea) || 0 // m²
    const annualRainfall = parseFloat(formData.annualRainfall) || 0 // mm/year
    const efficiency = parseFloat(formData.collectionEfficiency) / 100 || 0.8
    const storageCapacity = parseFloat(formData.storageCapacity) || 0 // m³
    const waterCost = parseFloat(formData.waterCost) || 0 // MXN/m³
    const installationCost = parseFloat(formData.installationCost) || 0 // MXN
    const maintenanceCost = parseFloat(formData.maintenanceCost) || 0 // MXN/year

    // Convert mm to m: 1 mm = 0.001 m
    // Volume = Area (m²) × Rainfall (m) × Efficiency
    const annualCollection = roofArea * (annualRainfall / 1000) * efficiency // m³/year
    const monthlyCollection = annualCollection / 12 // m³/month
    const dailyCollection = annualCollection / 365 // m³/day

    // Storage utilization
    const storageUtilization = storageCapacity > 0 
      ? Math.min(100, (annualCollection / storageCapacity) * 100)
      : 0

    // Financial analysis
    const annualSavings = annualCollection * waterCost // MXN/year
    const netAnnualSavings = annualSavings - maintenanceCost // MXN/year
    const paybackYears = installationCost > 0 && netAnnualSavings > 0
      ? installationCost / netAnnualSavings
      : 0
    const tenYearSavings = netAnnualSavings * 10 - installationCost // MXN
    const tenYearROI = installationCost > 0
      ? ((tenYearSavings / installationCost) * 100)
      : 0

    setResult({
      roofArea,
      annualRainfall,
      efficiency,
      storageCapacity,
      annualCollection,
      monthlyCollection,
      dailyCollection,
      storageUtilization,
      annualSavings,
      netAnnualSavings,
      paybackYears,
      tenYearSavings,
      tenYearROI,
      installationCost,
      maintenanceCost
    })
  }

  const exportReport = () => {
    if (!result) return

    const csv = [
      ['Calculadora: Cosecha de Agua de Lluvia', formData.location || 'Sin ubicación'],
      [],
      ['Parámetros'],
      ['Área de Techo', `${result.roofArea} m²`],
      ['Precipitación Anual', `${result.annualRainfall} mm/año`],
      ['Eficiencia de Captación', `${(result.efficiency * 100).toFixed(0)}%`],
      ['Capacidad de Almacenamiento', `${result.storageCapacity} m³`],
      ['Costo de Agua', `$${formData.waterCost} MXN/m³`],
      ['Costo de Instalación', `$${result.installationCost} MXN`],
      ['Costo de Mantenimiento', `$${result.maintenanceCost} MXN/año`],
      [],
      ['Resultados de Captación'],
      ['Captación Anual', `${result.annualCollection.toFixed(2)} m³/año`],
      ['Captación Mensual', `${result.monthlyCollection.toFixed(2)} m³/mes`],
      ['Captación Diaria', `${result.dailyCollection.toFixed(2)} m³/día`],
      ['Utilización de Almacenamiento', `${result.storageUtilization.toFixed(1)}%`],
      [],
      ['Análisis Financiero'],
      ['Ahorro Anual', `$${result.annualSavings.toFixed(2)} MXN/año`],
      ['Ahorro Neto Anual', `$${result.netAnnualSavings.toFixed(2)} MXN/año`],
      ['Período de Recuperación', `${result.paybackYears.toFixed(2)} años`],
      ['Ahorro a 10 Años', `$${result.tenYearSavings.toFixed(2)} MXN`],
      ['ROI a 10 Años', `${result.tenYearROI.toFixed(1)}%`]
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `calculadora-cosecha-agua-lluvia-${Date.now()}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Calculadora: Cosecha de Agua de Lluvia</h2>
        <p className="text-slate-600">Calcula el potencial de cosecha de agua de lluvia y su viabilidad económica</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 Referencias de Precipitación en México</p>
          <p>• Ciudad de México: ~700 mm/año</p>
          <p>• Guadalajara: ~900 mm/año</p>
          <p>• Monterrey: ~600 mm/año</p>
          <p>• Mérida: ~1000 mm/año</p>
          <p className="mt-2">Consulta datos locales en: <a href="https://www.gob.mx/conagua" target="_blank" rel="noopener noreferrer" className="underline">CONAGUA</a></p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación (opcional)</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Ciudad de México"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Área de Techo (m²) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.roofArea}
              onChange={(e) => setFormData({ ...formData, roofArea: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precipitación Anual (mm/año) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.annualRainfall}
              onChange={(e) => setFormData({ ...formData, annualRainfall: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="700"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Eficiencia de Captación (%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={formData.collectionEfficiency}
              onChange={(e) => setFormData({ ...formData, collectionEfficiency: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="80"
            />
            <p className="text-xs text-slate-500 mt-1">Típicamente 70-90%</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Capacidad de Almacenamiento (m³)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.storageCapacity}
              onChange={(e) => setFormData({ ...formData, storageCapacity: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo de Agua (MXN/m³)</label>
            <input
              type="number"
              step="0.01"
              value={formData.waterCost}
              onChange={(e) => setFormData({ ...formData, waterCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="15.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Instalación (MXN)</label>
            <input
              type="number"
              step="0.01"
              value={formData.installationCost}
              onChange={(e) => setFormData({ ...formData, installationCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mantenimiento (MXN/año)</label>
            <input
              type="number"
              step="0.01"
              value={formData.maintenanceCost}
              onChange={(e) => setFormData({ ...formData, maintenanceCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          onClick={calculate}
          disabled={!formData.roofArea || !formData.annualRainfall}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Calculator className="w-5 h-5" />
          Calcular Potencial
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Resultados de Captación</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Captación Anual</div>
                <div className="text-2xl font-bold text-blue-600">
                  {result.annualCollection.toFixed(2)} m³
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Captación Mensual</div>
                <div className="text-2xl font-bold text-cyan-600">
                  {result.monthlyCollection.toFixed(2)} m³
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Captación Diaria</div>
                <div className="text-2xl font-bold text-teal-600">
                  {result.dailyCollection.toFixed(2)} m³
                </div>
              </div>
            </div>

            {result.storageCapacity > 0 && (
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Utilización de Almacenamiento</div>
                <div className="text-2xl font-bold text-purple-600">
                  {result.storageUtilization.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {result.storageUtilization > 100 
                    ? 'El almacenamiento es insuficiente para captar toda el agua disponible'
                    : 'El almacenamiento es adecuado para la captación anual'}
                </div>
              </div>
            )}
          </div>

          {result.installationCost > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Análisis Financiero</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Ahorro Anual</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${result.annualSavings.toFixed(2)} MXN
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Ahorro Neto Anual</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    ${result.netAnnualSavings.toFixed(2)} MXN
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">Período de Recuperación</div>
                  <div className="text-2xl font-bold text-teal-600">
                    {result.paybackYears.toFixed(1)} años
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">ROI a 10 Años</div>
                  <div className={`text-2xl font-bold ${result.tenYearROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.tenYearROI.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Ahorro Total a 10 Años</div>
                <div className={`text-2xl font-bold ${result.tenYearSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${result.tenYearSavings.toFixed(2)} MXN
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <button
          onClick={exportReport}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors mt-6"
        >
          <Download className="w-4 h-4" />
          Exportar Reporte
        </button>
      )}
    </div>
  )
}

