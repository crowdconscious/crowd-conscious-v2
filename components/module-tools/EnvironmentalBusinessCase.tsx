'use client'

import { useState } from 'react'
import { FileText, Download, Save, DollarSign, AlertTriangle, Calendar, TrendingUp } from 'lucide-react'

interface BusinessCase {
  projectName: string
  problemStatement: string
  proposedSolution: string
  currentCost: string
  implementationCost: string
  annualSavings: string
  paybackPeriod: string
  risks: string[]
  mitigation: string[]
  timeline: string
  stakeholders: string[]
  successMetrics: string[]
}

export default function EnvironmentalBusinessCase() {
  const [formData, setFormData] = useState<BusinessCase>({
    projectName: '',
    problemStatement: '',
    proposedSolution: '',
    currentCost: '',
    implementationCost: '',
    annualSavings: '',
    paybackPeriod: '',
    risks: [''],
    mitigation: [''],
    timeline: '',
    stakeholders: [''],
    successMetrics: ['']
  })

  const addRisk = () => {
    setFormData({ ...formData, risks: [...formData.risks, ''] })
  }

  const updateRisk = (index: number, value: string) => {
    const newRisks = [...formData.risks]
    newRisks[index] = value
    setFormData({ ...formData, risks: newRisks })
  }

  const removeRisk = (index: number) => {
    setFormData({ ...formData, risks: formData.risks.filter((_, i) => i !== index) })
  }

  const addMitigation = () => {
    setFormData({ ...formData, mitigation: [...formData.mitigation, ''] })
  }

  const updateMitigation = (index: number, value: string) => {
    const newMitigation = [...formData.mitigation]
    newMitigation[index] = value
    setFormData({ ...formData, mitigation: newMitigation })
  }

  const removeMitigation = (index: number) => {
    setFormData({ ...formData, mitigation: formData.mitigation.filter((_, i) => i !== index) })
  }

  const addStakeholder = () => {
    setFormData({ ...formData, stakeholders: [...formData.stakeholders, ''] })
  }

  const updateStakeholder = (index: number, value: string) => {
    const newStakeholders = [...formData.stakeholders]
    newStakeholders[index] = value
    setFormData({ ...formData, stakeholders: newStakeholders })
  }

  const removeStakeholder = (index: number) => {
    setFormData({ ...formData, stakeholders: formData.stakeholders.filter((_, i) => i !== index) })
  }

  const addMetric = () => {
    setFormData({ ...formData, successMetrics: [...formData.successMetrics, ''] })
  }

  const updateMetric = (index: number, value: string) => {
    const newMetrics = [...formData.successMetrics]
    newMetrics[index] = value
    setFormData({ ...formData, successMetrics: newMetrics })
  }

  const removeMetric = (index: number) => {
    setFormData({ ...formData, successMetrics: formData.successMetrics.filter((_, i) => i !== index) })
  }

  const calculatePayback = () => {
    const implCost = parseFloat(formData.implementationCost) || 0
    const annualSav = parseFloat(formData.annualSavings) || 0
    if (annualSav > 0) {
      const payback = implCost / annualSav
      setFormData({ ...formData, paybackPeriod: payback.toFixed(2) })
    }
  }

  const exportDocument = () => {
    const content = [
      `CASO DE NEGOCIO AMBIENTAL`,
      `================================`,
      ``,
      `PROYECTO: ${formData.projectName || 'Sin nombre'}`,
      `Fecha: ${new Date().toLocaleDateString('es-MX')}`,
      ``,
      `1. DECLARACIÓN DEL PROBLEMA`,
      `----------------------------`,
      formData.problemStatement || 'No especificado',
      ``,
      `2. SOLUCIÓN PROPUESTA`,
      `---------------------`,
      formData.proposedSolution || 'No especificado',
      ``,
      `3. ANÁLISIS COSTO-BENEFICIO`,
      `---------------------------`,
      `Costo Actual: $${formData.currentCost || '0'} MXN/año`,
      `Costo de Implementación: $${formData.implementationCost || '0'} MXN`,
      `Ahorro Anual: $${formData.annualSavings || '0'} MXN/año`,
      `Período de Recuperación: ${formData.paybackPeriod || 'N/A'} años`,
      ``,
      `4. ANÁLISIS DE RIESGOS`,
      `----------------------`,
      ...formData.risks.filter(r => r.trim()).map((risk, i) => `${i + 1}. ${risk}`),
      ``,
      `5. MITIGACIÓN DE RIESGOS`,
      `------------------------`,
      ...formData.mitigation.filter(m => m.trim()).map((mit, i) => `${i + 1}. ${mit}`),
      ``,
      `6. CRONOGRAMA`,
      `-------------`,
      formData.timeline || 'No especificado',
      ``,
      `7. STAKEHOLDERS`,
      `---------------`,
      ...formData.stakeholders.filter(s => s.trim()).map((stakeholder, i) => `${i + 1}. ${stakeholder}`),
      ``,
      `8. MÉTRICAS DE ÉXITO`,
      `-------------------`,
      ...formData.successMetrics.filter(m => m.trim()).map((metric, i) => `${i + 1}. ${metric}`),
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `caso-negocio-ambiental-${Date.now()}.txt`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Caso de Negocio Ambiental</h2>
        <p className="text-slate-600">Crea un caso de negocio estructurado para proyectos ambientales</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre del Proyecto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Ej: Instalación de Sistema de Reutilización de Agua"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Declaración del Problema <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.problemStatement}
            onChange={(e) => setFormData({ ...formData, problemStatement: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={4}
            placeholder="Describe el problema que este proyecto resolverá..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Solución Propuesta <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.proposedSolution}
            onChange={(e) => setFormData({ ...formData, proposedSolution: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={4}
            placeholder="Describe la solución propuesta en detalle..."
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Actual (MXN/año)</label>
            <input
              type="number"
              step="0.01"
              value={formData.currentCost}
              onChange={(e) => setFormData({ ...formData, currentCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Costo Implementación (MXN)</label>
            <input
              type="number"
              step="0.01"
              value={formData.implementationCost}
              onChange={(e) => setFormData({ ...formData, implementationCost: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ahorro Anual (MXN)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.annualSavings}
                onChange={(e) => setFormData({ ...formData, annualSavings: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={calculatePayback}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                title="Calcular período de recuperación"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {formData.paybackPeriod && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Período de Recuperación</div>
            <div className="text-2xl font-bold text-green-600">{formData.paybackPeriod} años</div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Riesgos</label>
            <button
              type="button"
              onClick={addRisk}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              + Agregar Riesgo
            </button>
          </div>
          <div className="space-y-2">
            {formData.risks.map((risk, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={risk}
                  onChange={(e) => updateRisk(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Describe el riesgo..."
                />
                {formData.risks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRisk(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Mitigación de Riesgos</label>
            <button
              type="button"
              onClick={addMitigation}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              + Agregar Mitigación
            </button>
          </div>
          <div className="space-y-2">
            {formData.mitigation.map((mit, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={mit}
                  onChange={(e) => updateMitigation(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Describe la estrategia de mitigación..."
                />
                {formData.mitigation.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMitigation(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cronograma</label>
          <textarea
            value={formData.timeline}
            onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={3}
            placeholder="Ej: Mes 1-2: Planificación, Mes 3-6: Implementación..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Stakeholders</label>
            <button
              type="button"
              onClick={addStakeholder}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              + Agregar Stakeholder
            </button>
          </div>
          <div className="space-y-2">
            {formData.stakeholders.map((stakeholder, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={stakeholder}
                  onChange={(e) => updateStakeholder(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ej: Gerente de Operaciones, Equipo de Sostenibilidad..."
                />
                {formData.stakeholders.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStakeholder(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-slate-700">Métricas de Éxito</label>
            <button
              type="button"
              onClick={addMetric}
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              + Agregar Métrica
            </button>
          </div>
          <div className="space-y-2">
            {formData.successMetrics.map((metric, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={metric}
                  onChange={(e) => updateMetric(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ej: Reducir consumo de agua en 30%..."
                />
                {formData.successMetrics.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={exportDocument}
          disabled={!formData.projectName || !formData.problemStatement || !formData.proposedSolution}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Documento
        </button>
        <button
          onClick={() => {
            console.log('Saving business case...', formData)
          }}
          disabled={!formData.projectName || !formData.problemStatement || !formData.proposedSolution}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>
    </div>
  )
}

