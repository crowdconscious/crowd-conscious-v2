'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Users, Target, Award, TrendingUp, Building2, Leaf } from 'lucide-react'

export default function ConcientizacionesLanding() {
  const [language, setLanguage] = useState<'es' | 'en'>('es')

  const content = {
    es: {
      hero: {
        title: 'Transforma tu Empresa en una Fuerza Comunitaria',
        subtitle: 'Capacitación corporativa que genera impacto real en tu comunidad',
        description: 'No es consultoría. No es teoría. Es transformación real a través de aprendizaje basado en historias que conduce a cambio comunitario medible.',
        ctaPrimary: 'Evaluación Gratuita',
        ctaSecondary: 'Ver Demo'
      },
      stats: {
        title: 'Resultados Comprobados',
        items: [
          { value: '85%', label: 'de fondos a comunidades' },
          { value: '6 meses', label: 'a certificación' },
          { value: '100%', label: 'impacto medible' },
          { value: '77%', label: 'margen de ganancia' }
        ]
      },
      programs: {
        title: 'Nuestros Programas',
        subtitle: 'Elige el programa perfecto para tu empresa',
        items: [
          {
            name: 'Programa Inicial',
            price: '$45,000 MXN',
            duration: '3 meses',
            employees: '10-30 empleados',
            features: [
              '3 módulos principales',
              'Dashboard básico de impacto',
              'Acceso a comunidad',
              'Certificación de Participante',
              'Soporte por email'
            ]
          },
          {
            name: 'Programa Completo',
            price: '$125,000 MXN',
            duration: '6 meses',
            employees: '30-100 empleados',
            recommended: true,
            features: [
              'Los 6 módulos completos',
              'Proyecto personalizado de vecindario',
              'Dashboard avanzado con métricas ESG',
              '$10,000 MXN en créditos comunitarios',
              'Certificación de Contribuidor',
              'Manager de éxito dedicado',
              'Creación de comunidad en plataforma'
            ]
          },
          {
            name: 'Programa Elite',
            price: 'Personalizado',
            duration: '12 meses',
            employees: '100+ empleados',
            features: [
              'Todos los módulos + 2 personalizados',
              'Consultor dedicado',
              'Opción white-label',
              'Integración con sistemas HR',
              '$50,000 MXN en créditos',
              'Certificación de Líder',
              'Red multi-comunidad'
            ]
          }
        ]
      },
      benefits: {
        title: '¿Por Qué Concientizaciones?',
        items: [
          {
            icon: Users,
            title: 'Aumenta el Compromiso',
            description: '87% de aumento en satisfacción de empleados. Tu equipo quiere trabajo con propósito.'
          },
          {
            icon: TrendingUp,
            title: 'Reduce Costos',
            description: '15-25% de ahorro en operaciones. Mide el impacto real en agua, energía y residuos.'
          },
          {
            icon: Award,
            title: 'Cumplimiento ESG',
            description: 'Certificación verificada alineada con ODS de la ONU. Reportes listos para inversionistas.'
          },
          {
            icon: Building2,
            title: 'Mejora tu Reputación',
            description: 'Impacto visible en tu comunidad. Atrae mejor talento y clientes conscientes.'
          },
          {
            icon: Target,
            title: 'Acción Real, No Teoría',
            description: 'Proyectos reales con vecinos. Cambio medible desde el primer mes.'
          },
          {
            icon: Leaf,
            title: 'Comunidad Permanente',
            description: 'Tu empresa se convierte en una comunidad activa. Impacto que continúa después del programa.'
          }
        ]
      },
      howItWorks: {
        title: 'Cómo Funciona',
        steps: [
          {
            number: '1',
            title: 'Evaluación Inicial',
            description: 'Analizamos tu empresa, industria y desafíos únicos. Gratis y sin compromiso.'
          },
          {
            number: '2',
            title: 'Capacitación Basada en Historias',
            description: 'Tus empleados aprenden a través de una historia envolvente con personajes reales.'
          },
          {
            number: '3',
            title: 'Proyectos con Vecinos',
            description: 'Cada módulo incluye un mini-proyecto que beneficia a tu comunidad local.'
          },
          {
            number: '4',
            title: 'Mide el Impacto',
            description: 'Rastrea ahorros reales, reducción de emisiones y beneficio comunitario.'
          },
          {
            number: '5',
            title: 'Obtén Certificación',
            description: 'Certificación verificada que demuestra tu compromiso real con ESG.'
          },
          {
            number: '6',
            title: 'Únete a la Red',
            description: 'Tu empresa se convierte en una comunidad activa en nuestra plataforma.'
          }
        ]
      },
      cta: {
        title: '¿Listo para Transformar tu Empresa?',
        description: 'Únete a las empresas que están creando impacto real en México.',
        button: 'Agenda tu Evaluación Gratuita'
      }
    },
    en: {
      hero: {
        title: 'Transform Your Company into a Community Force',
        subtitle: 'Corporate training that creates real impact in your community',
        description: 'Not consulting. Not theory. Real transformation through story-driven learning that leads to measurable community change.',
        ctaPrimary: 'Free Assessment',
        ctaSecondary: 'Watch Demo'
      },
      stats: {
        title: 'Proven Results',
        items: [
          { value: '85%', label: 'of funds to communities' },
          { value: '6 months', label: 'to certification' },
          { value: '100%', label: 'measurable impact' },
          { value: '77%', label: 'profit margin' }
        ]
      },
      programs: {
        title: 'Our Programs',
        subtitle: 'Choose the perfect program for your company',
        items: [
          {
            name: 'Starter Program',
            price: '$45,000 MXN',
            duration: '3 months',
            employees: '10-30 employees',
            features: [
              '3 core modules',
              'Basic impact dashboard',
              'Community access',
              'Participant Certification',
              'Email support'
            ]
          },
          {
            name: 'Complete Program',
            price: '$125,000 MXN',
            duration: '6 months',
            employees: '30-100 employees',
            recommended: true,
            features: [
              'All 6 modules',
              'Custom neighborhood project',
              'Advanced dashboard with ESG metrics',
              '$10,000 MXN community credits',
              'Contributor Certification',
              'Dedicated success manager',
              'Community creation on platform'
            ]
          },
          {
            name: 'Elite Program',
            price: 'Custom',
            duration: '12 months',
            employees: '100+ employees',
            features: [
              'All modules + 2 custom',
              'Dedicated consultant',
              'White-label option',
              'HR systems integration',
              '$50,000 MXN credits',
              'Leader Certification',
              'Multi-community network'
            ]
          }
        ]
      },
      benefits: {
        title: 'Why Concientizaciones?',
        items: [
          {
            icon: Users,
            title: 'Increase Engagement',
            description: '87% increase in employee satisfaction. Your team wants purposeful work.'
          },
          {
            icon: TrendingUp,
            title: 'Reduce Costs',
            description: '15-25% operational savings. Measure real impact on water, energy, and waste.'
          },
          {
            icon: Award,
            title: 'ESG Compliance',
            description: 'Verified certification aligned with UN SDGs. Investor-ready reports.'
          },
          {
            icon: Building2,
            title: 'Improve Reputation',
            description: 'Visible community impact. Attract better talent and conscious customers.'
          },
          {
            icon: Target,
            title: 'Real Action, Not Theory',
            description: 'Real projects with neighbors. Measurable change from month one.'
          },
          {
            icon: Leaf,
            title: 'Permanent Community',
            description: 'Your company becomes an active community. Impact continues after the program.'
          }
        ]
      },
      howItWorks: {
        title: 'How It Works',
        steps: [
          {
            number: '1',
            title: 'Initial Assessment',
            description: 'We analyze your company, industry, and unique challenges. Free and no commitment.'
          },
          {
            number: '2',
            title: 'Story-Driven Training',
            description: 'Your employees learn through an engaging story with real characters.'
          },
          {
            number: '3',
            title: 'Projects with Neighbors',
            description: 'Each module includes a mini-project that benefits your local community.'
          },
          {
            number: '4',
            title: 'Measure Impact',
            description: 'Track real savings, emission reductions, and community benefit.'
          },
          {
            number: '5',
            title: 'Get Certified',
            description: 'Verified certification that demonstrates your real ESG commitment.'
          },
          {
            number: '6',
            title: 'Join the Network',
            description: 'Your company becomes an active community on our platform.'
          }
        ]
      },
      cta: {
        title: 'Ready to Transform Your Company?',
        description: 'Join companies creating real impact in Mexico.',
        button: 'Schedule Your Free Assessment'
      }
    }
  }

  const currentContent = content[language]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">CC</span>
            </div>
            <div>
              <div className="font-bold text-slate-900">Crowd Conscious</div>
              <div className="text-xs text-slate-600">Concientizaciones</div>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  language === 'es'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🇲🇽 ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                🇺🇸 EN
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-slate-600 hover:text-teal-600 font-medium"
              >
                {language === 'es' ? 'Iniciar Sesión' : 'Sign In'}
              </Link>
              <Link
                href="/assessment"
                className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition-transform"
              >
                {language === 'es' ? 'Evaluación Gratuita' : 'Free Assessment'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            {currentContent.hero.title}
          </h1>
          <p className="text-2xl text-teal-600 font-semibold mb-4">
            {currentContent.hero.subtitle}
          </p>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mb-10">
            {currentContent.hero.description}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/assessment"
              className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl"
            >
              {language === 'es' ? 'Comenzar Evaluación Gratuita' : 'Start Free Assessment'}
            </Link>
            <Link
              href="#how-it-works"
              className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-teal-600 hover:text-teal-600 transition-colors"
            >
              {currentContent.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 bg-gradient-to-r from-teal-600 to-purple-600">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            {currentContent.stats.title}
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {currentContent.stats.items.map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-teal-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-12">
            {currentContent.benefits.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentContent.benefits.items.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-slate-600">
                    {benefit.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-4">
            {currentContent.programs.title}
          </h2>
          <p className="text-xl text-slate-600 text-center mb-12">
            {currentContent.programs.subtitle}
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {currentContent.programs.items.map((program, index) => (
              <div 
                key={index} 
                className={`bg-white rounded-2xl shadow-xl p-8 ${
                  program.recommended 
                    ? 'ring-4 ring-teal-600 relative' 
                    : 'border border-slate-200'
                }`}
              >
                {program.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    {language === 'es' ? 'RECOMENDADO' : 'RECOMMENDED'}
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {program.name}
                </h3>
                <div className="text-3xl font-bold text-teal-600 mb-1">
                  {program.price}
                </div>
                <div className="text-slate-600 mb-2">{program.duration}</div>
                <div className="text-sm text-slate-500 mb-6">{program.employees}</div>
                
                <ul className="space-y-3 mb-8">
                  {program.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link
                  href="/assessment"
                  className={`block text-center px-6 py-3 rounded-lg font-bold transition-colors ${
                    program.recommended
                      ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white hover:scale-105'
                      : 'border-2 border-slate-300 text-slate-700 hover:border-teal-600 hover:text-teal-600'
                  }`}
                >
                  {language === 'es' ? 'Ver Mi Propuesta' : 'See My Proposal'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
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

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4 bg-gradient-to-br from-teal-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {currentContent.cta.title}
          </h2>
          <p className="text-xl text-teal-100 mb-8">
            {currentContent.cta.description}
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto">
            <p className="text-white mb-4 text-lg">
              {language === 'es' 
                ? '📧 Contáctanos para una evaluación gratuita:' 
                : '📧 Contact us for a free assessment:'}
            </p>
            <a 
              href="mailto:comunidad@crowdconscious.app?subject=Evaluación%20Gratuita%20Concientizaciones"
              className="inline-block bg-white text-teal-700 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
            >
              comunidad@crowdconscious.app
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-4">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CC</span>
              </div>
              <div className="text-left">
                <div className="font-bold">Crowd Conscious</div>
                <div className="text-sm text-slate-400">Concientizaciones</div>
              </div>
            </div>
          </div>
          <p className="text-slate-400 mb-4">
            {language === 'es' 
              ? 'Transformando empresas en fuerzas comunitarias' 
              : 'Transforming companies into community forces'}
          </p>
          <div className="flex justify-center gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-teal-400">
              {language === 'es' ? 'Privacidad' : 'Privacy'}
            </Link>
            <Link href="/terms" className="hover:text-teal-400">
              {language === 'es' ? 'Términos' : 'Terms'}
            </Link>
            <Link href="/" className="hover:text-teal-400">
              {language === 'es' ? 'Comunidades' : 'Communities'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

