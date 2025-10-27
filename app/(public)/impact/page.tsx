'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Droplet, Wind, Building2, Leaf, ShoppingBag, TrendingUp, Users, Target, Award } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImpactStats {
  total_funds_raised: number
  active_communities: number
  needs_fulfilled: number
  total_members: number
}

interface ImpactMetric {
  category: string
  value: number
  unit: string
  description: string
}

export default function ImpactPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('en')
  const [stats, setStats] = useState<ImpactStats>({
    total_funds_raised: 0,
    active_communities: 0,
    needs_fulfilled: 0,
    total_members: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Get total funding
        const { data: fundingData } = await supabase
          .from('community_content')
          .select('current_funding')
          .eq('type', 'need')
          .not('current_funding', 'is', null)

        const totalFundsRaised = fundingData?.reduce((sum, item) => sum + (item.current_funding || 0), 0) || 0

        // Get active communities count
        const { count: activeCommunities } = await supabase
          .from('communities')
          .select('*', { count: 'exact', head: true })

        // Get fulfilled needs count
        const { count: needsFulfilled } = await supabase
          .from('community_content')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'need')
          .eq('status', 'completed')

        // Get total members
        const { count: totalMembers } = await supabase
          .from('community_members')
          .select('*', { count: 'exact', head: true })

        setStats({
          total_funds_raised: totalFundsRaised,
          active_communities: activeCommunities || 0,
          needs_fulfilled: needsFulfilled || 0,
          total_members: totalMembers || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const content = {
    en: {
      title: "Global Impact",
      subtitle: "Real change, real communities, real results",
      statsTitle: "Our Collective Impact",
      metricsTitle: "Impact Categories",
      metrics: [
        {
          icon: Wind,
          category: "Clean Air",
          color: "from-sky-400 to-blue-500",
          bgColor: "bg-sky-50",
          description: "Tree planting, urban gardens, and emission reduction initiatives creating cleaner, healthier air for communities."
        },
        {
          icon: Droplet,
          category: "Clean Water",
          color: "from-blue-500 to-cyan-600",
          bgColor: "bg-blue-50",
          description: "Water filtration systems, watershed protection, and access to clean drinking water for underserved areas."
        },
        {
          icon: Building2,
          category: "Safe Cities",
          color: "from-pink-500 to-rose-600",
          bgColor: "bg-pink-50",
          description: "Community safety programs, public space revitalization, and inclusive urban development projects."
        },
        {
          icon: Leaf,
          category: "Zero Waste",
          color: "from-amber-500 to-orange-600",
          bgColor: "bg-amber-50",
          description: "Recycling programs, composting initiatives, and circular economy projects reducing landfill waste."
        },
        {
          icon: ShoppingBag,
          category: "Fair Trade",
          color: "from-green-500 to-emerald-600",
          bgColor: "bg-green-50",
          description: "Supporting local artisans, fair wage practices, and ethical supply chains for community products."
        }
      ],
      howWeTrack: {
        title: "How We Track Impact",
        subtitle: "Transparency and accountability in every metric",
        points: [
          {
            icon: Target,
            title: "Community-Verified Data",
            description: "Communities report and verify their own impact metrics, ensuring authenticity and local ownership."
          },
          {
            icon: TrendingUp,
            title: "Real-Time Tracking",
            description: "Impact data is updated in real-time as communities complete projects and achieve milestones."
          },
          {
            icon: Award,
            title: "UN SDG Alignment",
            description: "Our impact categories align with the United Nations Sustainable Development Goals for global comparability."
          }
        ]
      },
      transparency: {
        title: "Complete Transparency",
        subtitle: "Every dollar tracked, every impact measured",
        points: [
          "85% of funds go directly to community projects",
          "15% platform fee covers operational costs and continued development",
          "All transactions are publicly auditable on the platform",
          "Communities control 100% of fund allocation decisions",
          "Impact metrics are verified by community members",
          "Monthly impact reports available for all stakeholders"
        ]
      },
      cta: {
        title: "Ready to Make an Impact?",
        description: "Join communities creating measurable change with transparent funding and democratic governance.",
        primaryButton: "Start Creating Impact",
        secondaryButton: "Explore Active Communities"
      }
    },
    es: {
      title: "Impacto Global",
      subtitle: "Cambio real, comunidades reales, resultados reales",
      statsTitle: "Nuestro Impacto Colectivo",
      metricsTitle: "Categorías de Impacto",
      metrics: [
        {
          icon: Wind,
          category: "Aire Limpio",
          color: "from-sky-400 to-blue-500",
          bgColor: "bg-sky-50",
          description: "Plantación de árboles, jardines urbanos e iniciativas de reducción de emisiones creando aire más limpio y saludable."
        },
        {
          icon: Droplet,
          category: "Agua Limpia",
          color: "from-blue-500 to-cyan-600",
          bgColor: "bg-blue-50",
          description: "Sistemas de filtración de agua, protección de cuencas y acceso a agua potable para áreas desatendidas."
        },
        {
          icon: Building2,
          category: "Ciudades Seguras",
          color: "from-pink-500 to-rose-600",
          bgColor: "bg-pink-50",
          description: "Programas de seguridad comunitaria, revitalización de espacios públicos y proyectos de desarrollo urbano inclusivo."
        },
        {
          icon: Leaf,
          category: "Cero Residuos",
          color: "from-amber-500 to-orange-600",
          bgColor: "bg-amber-50",
          description: "Programas de reciclaje, iniciativas de compostaje y proyectos de economía circular reduciendo residuos."
        },
        {
          icon: ShoppingBag,
          category: "Comercio Justo",
          color: "from-green-500 to-emerald-600",
          bgColor: "bg-green-50",
          description: "Apoyo a artesanos locales, prácticas de salarios justos y cadenas de suministro éticas para productos comunitarios."
        }
      ],
      howWeTrack: {
        title: "Cómo Rastreamos el Impacto",
        subtitle: "Transparencia y responsabilidad en cada métrica",
        points: [
          {
            icon: Target,
            title: "Datos Verificados por la Comunidad",
            description: "Las comunidades reportan y verifican sus propias métricas de impacto, asegurando autenticidad y propiedad local."
          },
          {
            icon: TrendingUp,
            title: "Seguimiento en Tiempo Real",
            description: "Los datos de impacto se actualizan en tiempo real mientras las comunidades completan proyectos y logran hitos."
          },
          {
            icon: Award,
            title: "Alineación con ODS de la ONU",
            description: "Nuestras categorías de impacto se alinean con los Objetivos de Desarrollo Sostenible de la ONU para comparabilidad global."
          }
        ]
      },
      transparency: {
        title: "Transparencia Completa",
        subtitle: "Cada peso rastreado, cada impacto medido",
        points: [
          "85% de los fondos van directamente a proyectos comunitarios",
          "15% de tarifa de plataforma cubre costos operativos y desarrollo continuo",
          "Todas las transacciones son auditables públicamente en la plataforma",
          "Las comunidades controlan 100% de las decisiones de asignación de fondos",
          "Las métricas de impacto son verificadas por miembros de la comunidad",
          "Reportes mensuales de impacto disponibles para todos los interesados"
        ]
      },
      cta: {
        title: "¿Listo para Hacer un Impacto?",
        description: "Únete a comunidades creando cambio medible con financiamiento transparente y gobernanza democrática.",
        primaryButton: "Empieza a Crear Impacto",
        secondaryButton: "Explorar Comunidades Activas"
      }
    }
  }

  const currentContent = content[language]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: language === 'es' ? 'MXN' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Header with Language Toggle */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-bold text-slate-900">Crowd Conscious</span>
          </Link>
          
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                language === 'en'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => setLanguage('es')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
                language === 'es'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🇲🇽 Español
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-teal-50 via-purple-50 to-blue-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            {currentContent.title}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {currentContent.subtitle}
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {currentContent.statsTitle}
          </h2>
          
          {loading ? (
            <div className="text-center text-slate-500">
              {language === 'en' ? 'Loading impact data...' : 'Cargando datos de impacto...'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
                <div className="text-4xl font-bold text-teal-600 mb-2">
                  {formatCurrency(stats.total_funds_raised)}
                </div>
                <div className="text-slate-600 font-medium">
                  {language === 'en' ? 'Funds Raised' : 'Fondos Recaudados'}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {stats.active_communities}
                </div>
                <div className="text-slate-600 font-medium">
                  {language === 'en' ? 'Active Communities' : 'Comunidades Activas'}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stats.needs_fulfilled}
                </div>
                <div className="text-slate-600 font-medium">
                  {language === 'en' ? 'Needs Fulfilled' : 'Necesidades Cumplidas'}
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {stats.total_members.toLocaleString()}
                </div>
                <div className="text-slate-600 font-medium">
                  {language === 'en' ? 'Community Members' : 'Miembros'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Impact Categories */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {currentContent.metricsTitle}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentContent.metrics.map((metric, index) => {
              const Icon = metric.icon
              return (
                <div key={index} className={`${metric.bgColor} p-6 rounded-2xl shadow-lg border border-slate-200 hover:scale-105 transition-transform`}>
                  <div className={`w-14 h-14 bg-gradient-to-br ${metric.color} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {metric.category}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {metric.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How We Track */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              {currentContent.howWeTrack.title}
            </h2>
            <p className="text-xl text-slate-600">
              {currentContent.howWeTrack.subtitle}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {currentContent.howWeTrack.points.map((point, index) => {
              const Icon = point.icon
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {point.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-teal-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {currentContent.transparency.title}
          </h2>
          <p className="text-xl text-teal-100 mb-10">
            {currentContent.transparency.subtitle}
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
            <ul className="space-y-4 text-left">
              {currentContent.transparency.points.map((point, index) => (
                <li key={index} className="flex items-start gap-3 text-white">
                  <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-teal-300 font-bold">✓</span>
                  </div>
                  <span className="text-lg">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            {currentContent.cta.title}
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            {currentContent.cta.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="bg-gradient-to-r from-teal-600 to-purple-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {currentContent.cta.primaryButton}
            </Link>
            <Link 
              href="/communities" 
              className="border-2 border-slate-300 text-slate-700 font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:border-teal-600 hover:text-teal-600 hover:scale-105"
            >
              {currentContent.cta.secondaryButton}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

