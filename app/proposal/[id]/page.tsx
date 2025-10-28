'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  TrendingUp, 
  Leaf, 
  Users, 
  Award, 
  ChevronRight, 
  CheckCircle, 
  Loader2,
  Sparkles,
  DollarSign,
  Target,
  BarChart3,
  Play
} from 'lucide-react'

interface ProposalData {
  companyName: string
  contact: {
    fullName: string
    email: string
  }
  roi: {
    totalSavings: number
    breakdown: {
      energy: number
      water: number
      waste: number
      productivity: number
    }
    metrics: {
      energyReduction: string
      waterReduction: string
      wasteReduction: string
      satisfactionIncrease: string
    }
  }
  modules: string[]
  pricing: {
    tier: string
    basePrice: number
    pricePerModule: number
    moduleCount: number
    employeeLimit: number
  }
}

export default function ProposalPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [proposalData, setProposalData] = useState<ProposalData | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [customPrice, setCustomPrice] = useState(0)

  const moduleDetails: Record<string, any> = {
    clean_air: {
      name: 'Aire Limpio',
      icon: '🌬️',
      duration: '3 semanas',
      description: 'Reduce emisiones y costos de energía',
      impact: '20% reducción en consumo energético',
      preview: 'Historia de María y las emisiones de la fábrica...',
    },
    clean_water: {
      name: 'Agua Limpia',
      icon: '💧',
      duration: '3 semanas',
      description: 'Optimiza uso de agua y ahorra costos',
      impact: '18% reducción en consumo de agua',
      preview: 'Carlos descubre el desperdicio de agua...',
    },
    safe_cities: {
      name: 'Ciudades Seguras',
      icon: '🏙️',
      duration: '3 semanas',
      description: 'Mejora relaciones con la comunidad',
      impact: 'Proyectos comunitarios medibles',
      preview: 'Don Roberto y la seguridad del vecindario...',
    },
    zero_waste: {
      name: 'Cero Residuos',
      icon: '♻️',
      duration: '4 semanas',
      description: 'Convierte residuos en recursos',
      impact: '25% reducción en costos de residuos',
      preview: 'El tesoro escondido en la basura...',
    },
    fair_trade: {
      name: 'Comercio Justo',
      icon: '🤝',
      duration: '4 semanas',
      description: 'Optimiza cadena de suministro local',
      impact: 'Ahorro en transporte y mejor calidad',
      preview: 'María propone comprar local...',
    },
    integration: {
      name: 'Integración & Impacto',
      icon: '🎉',
      duration: '2 semanas',
      description: 'Mide y reporta tu impacto total',
      impact: 'Certificación ESG completa',
      preview: 'La celebración del cambio...',
    },
  }

  useEffect(() => {
    // Fetch proposal data from localStorage first, then API
    const fetchProposal = async () => {
      try {
        // Try localStorage first
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(`proposal_${params.id}`)
          if (stored) {
            const data = JSON.parse(stored)
            setProposalData(data)
            setSelectedModules(data.modules)
            setCustomPrice(data.pricing.basePrice)
            setLoading(false)
            return
          }
        }

        // Fallback to API if localStorage doesn't have it
        const response = await fetch(`/api/assessment/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setProposalData(data)
          setSelectedModules(data.modules)
          setCustomPrice(data.pricing.basePrice)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error fetching proposal:', error)
        setLoading(false)
      }
    }

    fetchProposal()
  }, [params.id])

  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      // Remove module
      const newModules = selectedModules.filter(m => m !== moduleId)
      setSelectedModules(newModules)
      // Recalculate price
      if (proposalData) {
        setCustomPrice(Math.round(proposalData.pricing.pricePerModule * newModules.length))
      }
    } else {
      // Add module
      const newModules = [...selectedModules, moduleId]
      setSelectedModules(newModules)
      // Recalculate price
      if (proposalData) {
        setCustomPrice(Math.round(proposalData.pricing.pricePerModule * newModules.length))
      }
    }
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Generando tu propuesta personalizada...</p>
        </div>
      </div>
    )
  }

  if (!proposalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No se encontró la propuesta</p>
          <Link href="/assessment" className="text-teal-600 hover:underline">
            Crear nueva evaluación
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Tu Programa Personalizado
          </h1>
          <p className="text-xl text-slate-600">
            {proposalData.companyName}, aquí está tu camino hacia la transformación
          </p>
        </div>

        {/* ROI Calculator Section */}
        <div className="bg-gradient-to-br from-teal-600 to-purple-600 rounded-3xl shadow-2xl p-8 md:p-12 text-white mb-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-10 h-10" />
            <h2 className="text-3xl font-bold">Impacto Proyectado</h2>
          </div>
          
          <div className="mb-8">
            <div className="text-sm opacity-90 mb-2">Ahorro Total Anual</div>
            <div className="text-5xl md:text-6xl font-bold">
              {formatMoney(proposalData.roi.totalSavings)}
            </div>
            <div className="text-sm opacity-75 mt-2">
              + Beneficios intangibles (satisfacción, reputación, ESG)
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {proposalData.roi.breakdown.energy > 0 && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className="font-medium">Energía</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatMoney(proposalData.roi.breakdown.energy)}
                </div>
                <div className="text-sm opacity-75">
                  {proposalData.roi.metrics.energyReduction} reducción
                </div>
              </div>
            )}

            {proposalData.roi.breakdown.water > 0 && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💧</span>
                  <span className="font-medium">Agua</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatMoney(proposalData.roi.breakdown.water)}
                </div>
                <div className="text-sm opacity-75">
                  {proposalData.roi.metrics.waterReduction} reducción
                </div>
              </div>
            )}

            {proposalData.roi.breakdown.waste > 0 && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🗑️</span>
                  <span className="font-medium">Residuos</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatMoney(proposalData.roi.breakdown.waste)}
                </div>
                <div className="text-sm opacity-75">
                  {proposalData.roi.metrics.wasteReduction} reducción
                </div>
              </div>
            )}

            {proposalData.roi.breakdown.productivity > 0 && (
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">😊</span>
                  <span className="font-medium">Productividad</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatMoney(proposalData.roi.breakdown.productivity)}
                </div>
                <div className="text-sm opacity-75">
                  {proposalData.roi.metrics.satisfactionIncrease} satisfacción
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Modules */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">
            Módulos Recomendados para Ti
          </h2>
          <p className="text-slate-600 mb-8">
            Basado en tus retos y objetivos, estos son los módulos ideales. Puedes ajustar la selección.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {Object.keys(moduleDetails).map((moduleId) => {
              const module = moduleDetails[moduleId]
              const isRecommended = proposalData.modules.includes(moduleId)
              const isSelected = selectedModules.includes(moduleId)
              
              return (
                <div
                  key={moduleId}
                  className={`border-2 rounded-2xl p-6 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                  onClick={() => toggleModule(moduleId)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{module.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{module.name}</h3>
                        <div className="text-sm text-slate-500">{module.duration}</div>
                      </div>
                    </div>
                    {isRecommended && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold">
                        Recomendado
                      </span>
                    )}
                  </div>

                  <p className="text-slate-600 mb-3">{module.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm text-teal-600 mb-4">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">{module.impact}</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 italic mb-4">
                    "{module.preview}"
                  </div>

                  <div className="flex items-center justify-between">
                    <button className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1">
                      <Play className="w-4 h-4" />
                      Ver Vista Previa
                    </button>
                    {isSelected && (
                      <CheckCircle className="w-6 h-6 text-teal-600" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold text-slate-900">Tu Inversión</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-200">
                  <span className="text-slate-600">Módulos seleccionados:</span>
                  <span className="font-bold text-slate-900">{selectedModules.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-200">
                  <span className="text-slate-600">Programa:</span>
                  <span className="font-bold text-slate-900 capitalize">{proposalData.pricing.tier}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-200">
                  <span className="text-slate-600">Empleados permitidos:</span>
                  <span className="font-bold text-slate-900">Hasta {proposalData.pricing.employeeLimit}</span>
                </div>
                <div className="flex justify-between items-center py-4 bg-purple-50 rounded-xl px-4">
                  <span className="text-lg font-medium text-slate-900">Total:</span>
                  <span className="text-3xl font-bold text-purple-600">{formatMoney(customPrice)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-xl">
                <div className="flex items-start gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-green-900 mb-1">ROI: {Math.round((proposalData.roi.totalSavings / customPrice) * 100)}%</div>
                    <div className="text-sm text-green-700">
                      Recuperas tu inversión en {Math.ceil(customPrice / (proposalData.roi.totalSavings / 12))} meses
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-purple-50 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Incluye:</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Acceso completo a módulos seleccionados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Dashboard de impacto en tiempo real</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Certificación para empleados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Acceso a comunidad principal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Reporte ESG completo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Soporte durante el programa</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para transformar tu empresa?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Prueba el Módulo 1 GRATIS - Sin tarjeta de crédito, sin compromiso
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/module-trial/clean_air"
              className="bg-gradient-to-r from-teal-500 to-purple-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform inline-flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Probar Módulo 1 Gratis
            </Link>
            <Link
              href={`/signup-corporate?proposal=${params.id}`}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-slate-900 transition-colors inline-flex items-center justify-center gap-2"
            >
              Comenzar Ahora
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <p className="text-sm text-slate-400 mt-6">
            🎓 Más de 1,000 empresas ya se transformaron • ⭐ 4.9/5 satisfacción
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-slate-600">
          <p>¿Tienes preguntas? Contacta a nuestro equipo:</p>
          <a href="mailto:comunidad@crowdconscious.app" className="text-teal-600 hover:underline font-medium">
            comunidad@crowdconscious.app
          </a>
        </div>
      </div>
    </div>
  )
}

