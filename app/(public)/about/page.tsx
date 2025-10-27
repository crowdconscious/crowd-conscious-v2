'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Target, Heart, Globe, Handshake, TrendingUp } from 'lucide-react'

export default function AboutPage() {
  const [language, setLanguage] = useState<'es' | 'en'>('en')

  const content = {
    en: {
      title: "About Crowd Conscious",
      subtitle: "Building a more sustainable future, one community at a time",
      mission: {
        title: "Our Mission",
        content: "Crowd Conscious empowers local communities to create measurable environmental and social impact through transparent governance, collaborative action, and ethical brand partnerships."
      },
      vision: {
        title: "Our Vision",
        content: "A world where communities have the resources, transparency, and collective power to solve their most pressing challenges while building stronger, more connected neighborhoods."
      },
      values: [
        {
          icon: Users,
          title: "Community-First",
          description: "Every decision is made by and for the community members, ensuring authentic local impact and ownership."
        },
        {
          icon: Target,
          title: "Transparent Governance",
          description: "Open voting, clear fund allocation, and real-time tracking ensure accountability at every step."
        },
        {
          icon: Heart,
          title: "Measurable Impact",
          description: "Track real outcomes across clean air, clean water, safe cities, zero waste, and fair trade initiatives."
        },
        {
          icon: Globe,
          title: "Global Network",
          description: "Local action with global reach—communities share learnings and amplify their collective impact."
        },
        {
          icon: Handshake,
          title: "Ethical Partnerships",
          description: "Brands sponsor community needs only after community approval, ensuring aligned values and authenticity."
        },
        {
          icon: TrendingUp,
          title: "Sustainable Growth",
          description: "15% platform fee funds continuous development while 85% goes directly to community initiatives."
        }
      ],
      howItWorks: {
        title: "How It Works",
        steps: [
          {
            number: "1",
            title: "Create or Join a Community",
            description: "Start your own local community or join an existing one based on your location and shared values."
          },
          {
            number: "2",
            title: "Propose Community Needs",
            description: "Members identify and propose projects—from tree planting to community gardens to clean water initiatives."
          },
          {
            number: "3",
            title: "Vote Democratically",
            description: "Community members vote on proposals with weighted voting power (founders: 3x, admins: 2x, members: 1x)."
          },
          {
            number: "4",
            title: "Attract Ethical Sponsorships",
            description: "Brands discover your needs and propose sponsorships—but the community must approve each partnership."
          },
          {
            number: "5",
            title: "Execute & Track Impact",
            description: "Once funded, communities execute projects and track measurable outcomes visible to all stakeholders."
          },
          {
            number: "6",
            title: "Share Your Success",
            description: "Celebrate achievements, share impact data, and inspire other communities to take action."
          }
        ]
      },
      whyDifferent: {
        title: "What Makes Us Different",
        points: [
          {
            title: "True Community Ownership",
            description: "Unlike traditional crowdfunding, communities control every decision—from proposal to execution to fund allocation."
          },
          {
            title: "Verified Impact Metrics",
            description: "We track and verify real outcomes, not just money raised. Impact categories align with UN Sustainable Development Goals."
          },
          {
            title: "Brand Accountability",
            description: "Sponsors must be approved by the community, preventing greenwashing and ensuring value alignment."
          },
          {
            title: "Built for Scale",
            description: "Our platform handles everything—payments, governance, communications, impact tracking—so communities can focus on creating change."
          }
        ]
      },
      cta: {
        title: "Ready to Create Impact?",
        description: "Join thousands of changemakers building stronger, more sustainable communities.",
        primaryButton: "Start a Community",
        secondaryButton: "Explore Communities"
      }
    },
    es: {
      title: "Acerca de Crowd Conscious",
      subtitle: "Construyendo un futuro más sustentable, una comunidad a la vez",
      mission: {
        title: "Nuestra Misión",
        content: "Crowd Conscious empodera a las comunidades locales para crear un impacto ambiental y social medible a través de gobernanza transparente, acción colaborativa y asociaciones éticas con marcas."
      },
      vision: {
        title: "Nuestra Visión",
        content: "Un mundo donde las comunidades tengan los recursos, la transparencia y el poder colectivo para resolver sus desafíos más urgentes mientras construyen vecindarios más fuertes y conectados."
      },
      values: [
        {
          icon: Users,
          title: "Comunidad Primero",
          description: "Cada decisión es tomada por y para los miembros de la comunidad, asegurando un impacto local auténtico y propiedad."
        },
        {
          icon: Target,
          title: "Gobernanza Transparente",
          description: "Votación abierta, asignación clara de fondos y seguimiento en tiempo real aseguran responsabilidad en cada paso."
        },
        {
          icon: Heart,
          title: "Impacto Medible",
          description: "Rastrea resultados reales en aire limpio, agua limpia, ciudades seguras, cero residuos e iniciativas de comercio justo."
        },
        {
          icon: Globe,
          title: "Red Global",
          description: "Acción local con alcance global—las comunidades comparten aprendizajes y amplifican su impacto colectivo."
        },
        {
          icon: Handshake,
          title: "Asociaciones Éticas",
          description: "Las marcas patrocinan necesidades comunitarias solo después de la aprobación de la comunidad, asegurando valores alineados y autenticidad."
        },
        {
          icon: TrendingUp,
          title: "Crecimiento Sustentable",
          description: "15% de tarifa de plataforma financia desarrollo continuo mientras 85% va directamente a iniciativas comunitarias."
        }
      ],
      howItWorks: {
        title: "Cómo Funciona",
        steps: [
          {
            number: "1",
            title: "Crea o Únete a una Comunidad",
            description: "Inicia tu propia comunidad local o únete a una existente basada en tu ubicación y valores compartidos."
          },
          {
            number: "2",
            title: "Propone Necesidades Comunitarias",
            description: "Los miembros identifican y proponen proyectos—desde plantación de árboles hasta jardines comunitarios e iniciativas de agua limpia."
          },
          {
            number: "3",
            title: "Vota Democráticamente",
            description: "Los miembros votan en propuestas con poder de voto ponderado (fundadores: 3x, admins: 2x, miembros: 1x)."
          },
          {
            number: "4",
            title: "Atrae Patrocinios Éticos",
            description: "Las marcas descubren tus necesidades y proponen patrocinios—pero la comunidad debe aprobar cada asociación."
          },
          {
            number: "5",
            title: "Ejecuta y Rastrea el Impacto",
            description: "Una vez financiadas, las comunidades ejecutan proyectos y rastrean resultados medibles visibles para todos."
          },
          {
            number: "6",
            title: "Comparte tu Éxito",
            description: "Celebra logros, comparte datos de impacto e inspira a otras comunidades a tomar acción."
          }
        ]
      },
      whyDifferent: {
        title: "Lo Que Nos Hace Diferentes",
        points: [
          {
            title: "Verdadera Propiedad Comunitaria",
            description: "A diferencia del crowdfunding tradicional, las comunidades controlan cada decisión—desde la propuesta hasta la ejecución y asignación de fondos."
          },
          {
            title: "Métricas de Impacto Verificadas",
            description: "Rastreamos y verificamos resultados reales, no solo dinero recaudado. Las categorías de impacto se alinean con los ODS de la ONU."
          },
          {
            title: "Responsabilidad de Marca",
            description: "Los patrocinadores deben ser aprobados por la comunidad, previniendo greenwashing y asegurando alineación de valores."
          },
          {
            title: "Construido para Escalar",
            description: "Nuestra plataforma maneja todo—pagos, gobernanza, comunicaciones, seguimiento de impacto—para que las comunidades se enfoquen en crear cambio."
          }
        ]
      },
      cta: {
        title: "¿Listo para Crear Impacto?",
        description: "Únete a miles de agentes de cambio construyendo comunidades más fuertes y sustentables.",
        primaryButton: "Crear una Comunidad",
        secondaryButton: "Explorar Comunidades"
      }
    }
  }

  const currentContent = content[language]

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
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            {currentContent.title}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            {currentContent.subtitle}
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {currentContent.mission.title}
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {currentContent.mission.content}
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {currentContent.vision.title}
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {currentContent.vision.content}
            </p>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {language === 'en' ? 'Our Core Values' : 'Nuestros Valores Fundamentales'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentContent.values.map((value, index) => {
              const Icon = value.icon
              return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-slate-200 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {currentContent.howItWorks.title}
          </h2>
          <div className="space-y-8">
            {currentContent.howItWorks.steps.map((step, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {step.number}
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Different */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {currentContent.whyDifferent.title}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {currentContent.whyDifferent.points.map((point, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {point.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
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

