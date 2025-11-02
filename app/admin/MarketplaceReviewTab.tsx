'use client'

import { useState, useEffect } from 'react'
import { Check, X, Eye, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface PendingModule {
  id: string
  title: string
  description: string
  slug: string
  creator_name: string
  core_value: string
  difficulty_level: string
  estimated_duration_hours: number
  base_price_mxn: number
  created_at: string
  communities: { name: string; slug: string }
  profiles: { full_name: string; email: string }
  lessons: any[]
}

export default function MarketplaceReviewTab() {
  const [modules, setModules] = useState<PendingModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewingModule, setReviewingModule] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null)

  useEffect(() => {
    fetchPendingModules()
  }, [])

  const fetchPendingModules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/modules/pending')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch modules')
      }

      setModules(data.modules || [])
    } catch (err) {
      console.error('Error fetching pending modules:', err)
      setError(err instanceof Error ? err.message : 'Failed to load modules')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (moduleId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !reviewNotes[moduleId]?.trim()) {
      alert('Por favor proporciona comentarios para el rechazo')
      return
    }

    setReviewingModule(moduleId)

    try {
      const response = await fetch('/api/admin/modules/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId,
          action,
          reviewNotes: reviewNotes[moduleId] || ''
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to review module')
      }

      // Remove module from list
      setModules(modules.filter(m => m.id !== moduleId))
      setReviewNotes(prev => {
        const newNotes = { ...prev }
        delete newNotes[moduleId]
        return newNotes
      })
      setShowNotesFor(null)

      alert(action === 'approve' 
        ? '✅ Módulo aprobado y publicado exitosamente'
        : '📝 Módulo devuelto al creador para ajustes'
      )
    } catch (err) {
      console.error('Error reviewing module:', err)
      alert(err instanceof Error ? err.message : 'Error al revisar el módulo')
    } finally {
      setReviewingModule(null)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-slate-600">Cargando módulos pendientes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-1">Error</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchPendingModules}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">¡Todo al día!</h3>
        <p className="text-slate-600 max-w-md mx-auto">
          No hay módulos pendientes de revisión en este momento. Los nuevos envíos aparecerán aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Módulos Pendientes de Revisión</h2>
          <p className="text-slate-600 mt-1">{modules.length} módulo(s) esperando aprobación</p>
        </div>
        <button
          onClick={fetchPendingModules}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {modules.map((module) => (
          <div key={module.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{module.title}</h3>
                  <p className="text-slate-600 mb-4">{module.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
                      {module.core_value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                      {module.difficulty_level}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      {module.estimated_duration_hours} horas
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      {formatCurrency(module.base_price_mxn)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span className="text-sm text-amber-600 font-medium">Pendiente</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Creador</p>
                  <p className="text-slate-900 font-medium">{module.profiles?.full_name || 'Usuario'}</p>
                  <p className="text-sm text-slate-600">{module.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Comunidad</p>
                  <p className="text-slate-900 font-medium">{module.communities?.name || 'Desconocida'}</p>
                  <Link
                    href={`/communities/${module.communities?.slug || ''}`}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    Ver comunidad <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Fecha de Envío</p>
                <p className="text-slate-900">{formatDate(module.created_at)}</p>
              </div>

              {/* Review Notes */}
              {showNotesFor === module.id && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comentarios de Revisión {reviewingModule === module.id && '(Opcional para aprobación, requerido para rechazo)'}
                  </label>
                  <textarea
                    value={reviewNotes[module.id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [module.id]: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-opacity-20 focus:outline-none"
                    placeholder="Proporciona retroalimentación específica sobre qué debe mejorar el creador..."
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex items-center justify-between">
              <Link
                href={`/marketplace/${module.slug}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Vista Previa
              </Link>

              <div className="flex items-center gap-3">
                {showNotesFor === module.id ? (
                  <>
                    <button
                      onClick={() => {
                        setShowNotesFor(null)
                        setReviewNotes(prev => {
                          const newNotes = { ...prev }
                          delete newNotes[module.id]
                          return newNotes
                        })
                      }}
                      className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleReview(module.id, 'reject')}
                      disabled={reviewingModule === module.id}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewingModule === module.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Rechazando...
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          Confirmar Rechazo
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowNotesFor(module.id)}
                      className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleReview(module.id, 'approve')}
                      disabled={reviewingModule === module.id}
                      className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewingModule === module.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Aprobando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Aprobar y Publicar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

