'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRight, 
  ChevronLeft, 
  Lock, 
  Play, 
  CheckCircle, 
  Award,
  Sparkles
} from 'lucide-react'

export default function ModuleTrialPage() {
  const params = useParams()
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)

  const moduleContent = {
    clean_air: {
      name: 'Módulo 1: Aire Limpio',
      icon: '🌬️',
      duration: '3 semanas',
      story: {
        title: 'El Despertar',
        intro: 'La historia de María y el aire que respiramos...',
      },
      previewSlides: [
        {
          type: 'intro',
          title: 'Bienvenido al Módulo 1: Aire Limpio',
          content: 'Descubre cómo tu empresa puede reducir emisiones y ahorrar en costos de energía.',
          icon: '🌬️',
        },
        {
          type: 'story',
          title: 'Capítulo 1: El Despertar de María',
          content: `María trabaja en una fábrica de textiles desde hace 10 años. Cada mañana, al camino al trabajo, nota cómo el aire huele diferente cerca de la fábrica. Su hija, Lupita, ha desarrollado asma en los últimos meses.

Un día, Don Roberto, el maestro jubilado que vive al lado de la fábrica, tose sin parar en la parada del autobús. María se pregunta: ¿Será que la fábrica contribuye a esto?

Carlos, el nuevo gerente de sustentabilidad, llega con una propuesta...`,
          character: '👩‍🏭',
        },
        {
          type: 'learning',
          title: '¿Qué es la calidad del aire?',
          content: `La calidad del aire se mide por varios indicadores:

• PM2.5: Partículas pequeñas que entran a los pulmones
• CO2: Dióxido de carbono, el principal gas de efecto invernadero
• VOCs: Compuestos orgánicos volátiles de productos químicos

Tu fábrica emite estos contaminantes. Pero la buena noticia es que también puedes reducirlos.`,
          stats: {
            currentEmissions: '2,400 kg CO2/mes',
            potential: '20% de reducción posible',
            savings: '$12,000 MXN/año',
          }
        },
        {
          type: 'interactive',
          title: 'Calculadora: Huella de Carbono de tu Empresa',
          content: 'Calcula cuánto CO2 emite tu empresa actualmente...',
          locked: false,
        },
        {
          type: 'paywall',
          title: '¡Te está gustando?',
          content: 'Esto es solo el comienzo. El módulo completo incluye:',
          features: [
            'Historia completa de María y Don Roberto',
            'Herramientas interactivas de medición',
            'Guía paso a paso para reducir emisiones',
            'Mini-proyecto con tu comunidad',
            'Certificación al completar',
          ]
        }
      ]
    }
  }

  const module = moduleContent[params.moduleId as keyof typeof moduleContent]
  const totalSlides = module?.previewSlides.length || 0
  const currentSlideData = module?.previewSlides[currentSlide]

  useEffect(() => {
    // Show paywall after slide 3 (index 3)
    if (currentSlide >= 3 && currentSlideData?.type !== 'paywall') {
      setShowPaywall(true)
    }
  }, [currentSlide, currentSlideData])

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Módulo no encontrado</p>
          <Link href="/concientizaciones" className="text-teal-600 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/concientizaciones" className="text-teal-600 hover:underline text-sm mb-2 block">
              ← Volver
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <span className="text-4xl">{module.icon}</span>
              {module.name}
            </h1>
            <p className="text-slate-600 mt-1">{module.duration} • Vista Previa Gratuita</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">Progreso</div>
            <div className="text-2xl font-bold text-teal-600">{currentSlide + 1}/{totalSlides}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-600 to-purple-600 transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 min-h-[600px] relative">
          {/* Slide Content */}
          {currentSlideData?.type === 'intro' && (
            <div className="text-center animate-fadeIn">
              <div className="text-7xl mb-6">{currentSlideData.icon}</div>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                {currentSlideData.title}
              </h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                {currentSlideData.content}
              </p>
            </div>
          )}

          {currentSlideData?.type === 'story' && (
            <div className="animate-fadeIn">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-6xl">{currentSlideData.character}</div>
                <div>
                  <div className="text-sm text-teal-600 font-medium mb-1">Historia</div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {currentSlideData.title}
                  </h2>
                </div>
              </div>
              <div className="prose prose-lg max-w-none">
                {currentSlideData.content.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-slate-700 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {currentSlideData?.type === 'learning' && (
            <div className="animate-fadeIn">
              <div className="bg-teal-50 rounded-2xl p-6 mb-6">
                <div className="text-sm text-teal-600 font-medium mb-2">Aprendizaje</div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                  {currentSlideData.title}
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none mb-8">
                {currentSlideData.content.split('\n\n').map((paragraph, i) => (
                  <div key={i} className="text-slate-700 leading-relaxed mb-4">
                    {paragraph.split('\n').map((line, j) => (
                      <div key={j}>{line}</div>
                    ))}
                  </div>
                ))}
              </div>

              {currentSlideData.stats && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
                    <div className="text-sm text-red-600 mb-1">Emisiones Actuales</div>
                    <div className="text-2xl font-bold text-red-900">
                      {currentSlideData.stats.currentEmissions}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
                    <div className="text-sm text-yellow-600 mb-1">Potencial</div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {currentSlideData.stats.potential}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                    <div className="text-sm text-green-600 mb-1">Ahorro Anual</div>
                    <div className="text-2xl font-bold text-green-900">
                      {currentSlideData.stats.savings}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentSlideData?.type === 'interactive' && (
            <div className="animate-fadeIn text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {currentSlideData.title}
              </h2>
              <p className="text-slate-600 mb-8">{currentSlideData.content}</p>
              
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-12 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">
                      Herramienta interactiva disponible en versión completa
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentSlideData?.type === 'paywall' && (
            <div className="animate-fadeIn text-center">
              <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                {currentSlideData.title}
              </h2>
              <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                {currentSlideData.content}
              </p>

              <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-2xl p-8 mb-8 max-w-2xl mx-auto">
                <ul className="space-y-4 text-left">
                  {currentSlideData.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-lg">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup-corporate"
                  className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform inline-flex items-center justify-center gap-2"
                >
                  <Award className="w-6 h-6" />
                  Obtener Acceso Completo
                </Link>
                <Link
                  href="/assessment"
                  className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-teal-600 hover:text-teal-600 transition-colors inline-flex items-center justify-center gap-2"
                >
                  Ver Mi Propuesta Personalizada
                </Link>
              </div>

              <p className="text-sm text-slate-500 mt-6">
                ✨ Empieza desde $45,000 MXN • 🎓 Certificación incluida • 🏆 ROI Garantizado
              </p>
            </div>
          )}

          {/* Navigation */}
          {currentSlideData?.type !== 'paywall' && (
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-teal-600 hover:text-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
                Anterior
              </button>

              <button
                onClick={handleNext}
                disabled={currentSlide >= totalSlides - 1}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>🎁 Esta es una vista previa gratuita • No se requiere tarjeta de crédito</p>
        </div>
      </div>
    </div>
  )
}

