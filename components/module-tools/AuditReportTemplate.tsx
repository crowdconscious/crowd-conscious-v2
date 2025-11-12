'use client'

import { useState } from 'react'
import { FileText, Download, Save, Plus, Trash2 } from 'lucide-react'

interface Finding {
  id: string
  category: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recommendation: string
  priority: 'high' | 'medium' | 'low'
}

export default function AuditReportTemplate() {
  const [reportData, setReportData] = useState({
    projectName: '',
    auditDate: '',
    auditorName: '',
    facilityName: '',
    executiveSummary: '',
    methodology: '',
    findings: [] as Finding[],
    recommendations: '',
    nextSteps: ''
  })
  const [showFindingForm, setShowFindingForm] = useState(false)
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null)

  const addFinding = (finding: Omit<Finding, 'id'>) => {
    const newFinding: Finding = {
      ...finding,
      id: Date.now().toString()
    }

    if (editingFindingId) {
      setReportData({
        ...reportData,
        findings: reportData.findings.map(f => f.id === editingFindingId ? newFinding : f)
      })
      setEditingFindingId(null)
    } else {
      setReportData({
        ...reportData,
        findings: [...reportData.findings, newFinding]
      })
    }
    setShowFindingForm(false)
  }

  const deleteFinding = (id: string) => {
    setReportData({
      ...reportData,
      findings: reportData.findings.filter(f => f.id !== id)
    })
  }

  const exportReport = () => {
    const content = [
      `INFORME DE AUDITORÍA`,
      `====================`,
      ``,
      `Proyecto: ${reportData.projectName || 'Sin nombre'}`,
      `Instalación: ${reportData.facilityName || 'Sin nombre'}`,
      `Fecha de Auditoría: ${reportData.auditDate || 'Sin fecha'}`,
      `Auditor: ${reportData.auditorName || 'Sin nombre'}`,
      ``,
      `1. RESUMEN EJECUTIVO`,
      `-------------------`,
      reportData.executiveSummary || 'No especificado',
      ``,
      `2. METODOLOGÍA`,
      `-------------`,
      reportData.methodology || 'No especificado',
      ``,
      `3. HALLAZGOS`,
      `-----------`,
      ...reportData.findings.map((f, i) => [
        `${i + 1}. ${f.description}`,
        `   Categoría: ${f.category}`,
        `   Severidad: ${f.severity === 'critical' ? 'Crítica' : f.severity === 'high' ? 'Alta' : f.severity === 'medium' ? 'Media' : 'Baja'}`,
        `   Prioridad: ${f.priority === 'high' ? 'Alta' : f.priority === 'medium' ? 'Media' : 'Baja'}`,
        `   Recomendación: ${f.recommendation}`,
        ``
      ]).flat(),
      `4. RECOMENDACIONES GENERALES`,
      `---------------------------`,
      reportData.recommendations || 'No especificado',
      ``,
      `5. PRÓXIMOS PASOS`,
      `----------------`,
      reportData.nextSteps || 'No especificado',
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `informe-auditoria-${Date.now()}.txt`
    link.click()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Template: Informe de Auditoría</h2>
        <p className="text-slate-600">Plantilla para crear informes de auditoría estructurados</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
            <input
              type="text"
              value={reportData.projectName}
              onChange={(e) => setReportData({ ...reportData, projectName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: Auditoría de Seguridad Comunitaria"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Auditoría</label>
            <input
              type="date"
              value={reportData.auditDate}
              onChange={(e) => setReportData({ ...reportData, auditDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Auditor</label>
            <input
              type="text"
              value={reportData.auditorName}
              onChange={(e) => setReportData({ ...reportData, auditorName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Nombre del auditor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instalación/Área Auditada</label>
            <input
              type="text"
              value={reportData.facilityName}
              onChange={(e) => setReportData({ ...reportData, facilityName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Ej: Planta Principal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Resumen Ejecutivo</label>
          <textarea
            value={reportData.executiveSummary}
            onChange={(e) => setReportData({ ...reportData, executiveSummary: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={4}
            placeholder="Resumen de los hallazgos principales y conclusiones..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Metodología</label>
          <textarea
            value={reportData.methodology}
            onChange={(e) => setReportData({ ...reportData, methodology: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={3}
            placeholder="Describe cómo se realizó la auditoría..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-slate-700">Hallazgos ({reportData.findings.length})</label>
            <button
              onClick={() => setShowFindingForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Hallazgo
            </button>
          </div>

          {reportData.findings.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay hallazgos agregados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportData.findings.map((finding) => (
                <div key={finding.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          finding.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          finding.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {finding.severity === 'critical' ? 'Crítica' : finding.severity === 'high' ? 'Alta' : finding.severity === 'medium' ? 'Media' : 'Baja'}
                        </span>
                        <span className="text-xs text-slate-500">{finding.category}</span>
                      </div>
                      <div className="font-semibold text-slate-900 mb-1">{finding.description}</div>
                      <div className="text-sm text-slate-600">Recomendación: {finding.recommendation}</div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingFindingId(finding.id)
                          setShowFindingForm(true)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteFinding(finding.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Recomendaciones Generales</label>
          <textarea
            value={reportData.recommendations}
            onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={4}
            placeholder="Recomendaciones generales y estrategias de mejora..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Próximos Pasos</label>
          <textarea
            value={reportData.nextSteps}
            onChange={(e) => setReportData({ ...reportData, nextSteps: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            rows={3}
            placeholder="Acciones inmediatas y seguimiento recomendado..."
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={exportReport}
          disabled={!reportData.projectName}
          className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Exportar Informe
        </button>
        <button
          onClick={() => {
            console.log('Saving audit report...', reportData)
          }}
          disabled={!reportData.projectName}
          className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>

      {showFindingForm && (
        <FindingFormModal
          finding={editingFindingId ? reportData.findings.find(f => f.id === editingFindingId) : undefined}
          onSave={addFinding}
          onCancel={() => {
            setShowFindingForm(false)
            setEditingFindingId(null)
          }}
        />
      )}
    </div>
  )
}

function FindingFormModal({ finding, onSave, onCancel }: {
  finding?: Finding
  onSave: (finding: Omit<Finding, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    category: finding?.category || '',
    description: finding?.description || '',
    severity: (finding?.severity || 'medium') as Finding['severity'],
    recommendation: finding?.recommendation || '',
    priority: (finding?.priority || 'medium') as Finding['priority']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{finding ? 'Editar' : 'Agregar'} Hallazgo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Ej: Iluminación, Infraestructura"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del Hallazgo</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={3}
              placeholder="Describe el hallazgo en detalle..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severidad</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Finding['severity'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Finding['priority'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Recomendación</label>
            <textarea
              value={formData.recommendation}
              onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
              placeholder="Recomendación específica para este hallazgo..."
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {finding ? 'Actualizar' : 'Agregar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

