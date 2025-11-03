'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Template {
  id: string
  title: string
  description: string
  core_value: string
  difficulty_level: string
  estimated_duration_hours: number
  lesson_count: number
  xp_reward: number
  thumbnail_url: string | null
  industry_tags: string[]
}

interface TemplateBrowserClientProps {
  communityId: string
  communityName: string
  userId: string
}

export default function TemplateBrowserClient({
  communityId,
  communityName,
  userId
}: TemplateBrowserClientProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState<string | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/modules/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloneTemplate = async (templateId: string) => {
    setCloning(templateId)
    try {
      const response = await fetch('/api/modules/clone-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, communityId })
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to module builder with the cloned module
        router.push(`/communities/${communityId}/modules`)
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error cloning template:', error)
      alert('Error al clonar plantilla')
    } finally {
      setCloning(null)
    }
  }

  const getCoreValueLabel = (value: string) => {
    const labels: Record<string, string> = {
      clean_air: 'Aire Limpio',
      clean_water: 'Agua Limpia',
      zero_waste: 'Cero Residuos',
      safe_cities: 'Ciudades Seguras',
      fair_trade: 'Comercio Justo',
      biodiversity: 'Biodiversidad'
    }
    return labels[value] || value
  }

  const getDifficultyLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado'
    }
    return labels[level] || level
  }

  const getDifficultyColor = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-700',
      intermediate: 'bg-yellow-100 text-yellow-700',
      advanced: 'bg-red-100 text-red-700'
    }
    return colors[level] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/communities/${communityId}/modules`}
            className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
          >
            <span className="mr-2">←</span>
            Volver a Módulos
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                📚 Plantillas de Módulos
              </h1>
              <p className="text-lg text-slate-600">
                Comienza con una plantilla pre-construida para {communityName}
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-teal-900 mb-2">
                ¿Cómo funcionan las plantillas?
              </h3>
              <p className="text-teal-700 mb-3">
                Las plantillas son módulos pre-construidos que puedes clonar y personalizar para tu comunidad. 
                Incluyen estructura completa, lecciones de ejemplo, y mejores prácticas.
              </p>
              <ul className="space-y-1 text-sm text-teal-600">
                <li>✓ Clona la plantilla a tu comunidad</li>
                <li>✓ Personaliza el contenido según tu experiencia</li>
                <li>✓ Ajusta precios y detalles</li>
                <li>✓ Envía para revisión cuando esté listo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay plantillas disponibles
            </h3>
            <p className="text-slate-600 mb-6">
              Las plantillas estarán disponibles próximamente
            </p>
            <Link
              href={`/communities/${communityId}/modules/create`}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <span>✨</span>
              Crear Módulo desde Cero
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div className="h-48 bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">🎓</div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 flex-1 pr-2">
                      {template.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty_level)}`}>
                      {getDifficultyLabel(template.difficulty_level)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                    {template.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-lg font-semibold text-slate-900">
                        {template.lesson_count}
                      </div>
                      <div className="text-xs text-slate-600">Lecciones</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-lg font-semibold text-slate-900">
                        {template.estimated_duration_hours}h
                      </div>
                      <div className="text-xs text-slate-600">Duración</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-lg font-semibold text-slate-900">
                        {template.xp_reward}
                      </div>
                      <div className="text-xs text-slate-600">XP</div>
                    </div>
                  </div>

                  {/* Core Value Tag */}
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                      <span>🌱</span>
                      {getCoreValueLabel(template.core_value)}
                    </span>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleCloneTemplate(template.id)}
                    disabled={cloning === template.id}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cloning === template.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Clonando...
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        Usar esta Plantilla
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create from Scratch Option */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                ¿Prefieres crear desde cero?
              </h3>
              <p className="text-slate-600">
                Si tienes una idea única, puedes construir tu módulo completamente personalizado
              </p>
            </div>
            <Link
              href={`/communities/${communityId}/modules/create`}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ml-4"
            >
              Crear desde Cero →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

