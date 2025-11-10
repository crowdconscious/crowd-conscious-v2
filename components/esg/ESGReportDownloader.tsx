'use client'

import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ESGReportDownloaderProps {
  type: 'individual' | 'module' | 'corporate'
  enrollmentId?: string
  moduleId?: string
  moduleName?: string
  coreValue?: string
  corporateAccountId?: string
  dateFrom?: string
  dateTo?: string
  className?: string
}

export default function ESGReportDownloader({
  type,
  enrollmentId,
  moduleId,
  moduleName,
  coreValue,
  corporateAccountId,
  dateFrom,
  dateTo,
  className = ''
}: ESGReportDownloaderProps) {
  
  // Map core values to emojis
  const getCoreValueEmoji = (cv: string | undefined) => {
    if (!cv) return '📊'
    const emojiMap: Record<string, string> = {
      'clean_air': '🌬️',
      'clean_water': '💧',
      'safe_cities': '🏙️',
      'zero_waste': '♻️',
      'fair_trade': '🤝',
      'impact_integration': '📈'
    }
    return emojiMap[cv] || '📊'
  }
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const downloadReport = async (format: 'pdf' | 'excel') => {
    try {
      setDownloading(format)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams({
        format,
        type
      })

      if (enrollmentId) params.set('enrollment_id', enrollmentId)
      if (moduleId) params.set('module_id', moduleId)
      if (corporateAccountId) params.set('corporate_account_id', corporateAccountId)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      console.log('📥 Downloading ESG report:', { format, type })

      const response = await fetch(`/api/esg/generate-report?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar reporte')
      }

      // Get blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `esg-report-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 animate-fade-in'
      notification.innerHTML = `
        <span class="text-2xl">✅</span>
        <div>
          <div class="font-bold">¡Reporte descargado!</div>
          <div class="text-sm text-green-100">Revisa tu carpeta de descargas</div>
        </div>
      `
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)

    } catch (err) {
      console.error('❌ Error downloading report:', err)
      setError(err instanceof Error ? err.message : 'Error descargando reporte')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className={`bg-white border-2 border-slate-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
          {getCoreValueEmoji(coreValue)}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">
            {moduleName || 'Reporte ESG'}
          </h3>
          <p className="text-sm text-slate-600">Descargar reporte en PDF o Excel</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PDF Button */}
        <button
          onClick={() => downloadReport('pdf')}
          disabled={downloading !== null}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 px-6 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {downloading === 'pdf' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Descargar PDF</span>
            </>
          )}
        </button>

        {/* Excel Button */}
        <button
          onClick={() => downloadReport('excel')}
          disabled={downloading !== null}
          className="flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {downloading === 'excel' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-5 h-5" />
              <span>Descargar Excel</span>
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center">
        Los reportes incluyen métricas de impacto, uso de herramientas y cumplimiento ESG
      </p>
    </div>
  )
}

