'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, Target, TrendingUp, ChevronRight, ChevronLeft, Loader2, CheckCircle } from 'lucide-react'

export default function AssessmentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Step 1: Company Basics
    companyName: '',
    industry: '',
    employeeCount: '',
    location: '',
    
    // Step 2: Current Challenges
    challenges: [] as string[],
    painPoints: '',
    
    // Step 3: Goals & Priorities
    goals: [] as string[],
    budgetRange: '',
    timeline: '',
    
    // Step 4: Contact
    fullName: '',
    email: '',
    phone: '',
    role: '',
  })

  const industries = [
    { value: 'manufacturing', label: 'Manufactura', icon: '🏭' },
    { value: 'office', label: 'Oficinas Corporativas', icon: '🏢' },
    { value: 'retail', label: 'Comercio/Retail', icon: '🏪' },
    { value: 'hospitality', label: 'Hospitalidad', icon: '🏨' },
    { value: 'technology', label: 'Tecnología', icon: '💻' },
    { value: 'education', label: 'Educación', icon: '🎓' },
    { value: 'other', label: 'Otro', icon: '📦' },
  ]

  const challengesOptions = [
    { value: 'high_costs', label: 'Costos operativos altos', icon: '💰', category: 'financial' },
    { value: 'employee_engagement', label: 'Baja satisfacción de empleados', icon: '😐', category: 'people' },
    { value: 'esg_compliance', label: 'Necesidad de cumplimiento ESG', icon: '📊', category: 'compliance' },
    { value: 'waste_management', label: 'Gestión de residuos', icon: '🗑️', category: 'operations' },
    { value: 'energy_consumption', label: 'Alto consumo de energía', icon: '⚡', category: 'operations' },
    { value: 'water_usage', label: 'Alto consumo de agua', icon: '💧', category: 'operations' },
    { value: 'community_relations', label: 'Relaciones comunitarias débiles', icon: '🏘️', category: 'external' },
    { value: 'supply_chain', label: 'Cadena de suministro no sostenible', icon: '🚚', category: 'operations' },
  ]

  const goalsOptions = [
    { value: 'cost_reduction', label: 'Reducir costos operativos', impact: '15-30% ahorro', icon: '📉' },
    { value: 'employee_satisfaction', label: 'Mejorar satisfacción de empleados', impact: '+35% satisfacción', icon: '😊' },
    { value: 'esg_reporting', label: 'Obtener certificación ESG', impact: 'Certificación completa', icon: '✅' },
    { value: 'community_impact', label: 'Crear impacto comunitario', impact: 'Proyectos medibles', icon: '🌱' },
    { value: 'brand_reputation', label: 'Mejorar reputación de marca', impact: 'Visibilidad positiva', icon: '⭐' },
    { value: 'innovation', label: 'Fomentar innovación', impact: 'Cultura de cambio', icon: '💡' },
  ]

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const toggleSelection = (field: 'challenges' | 'goals', value: string) => {
    const current = formData[field]
    if (current.includes(value)) {
      setFormData({ ...formData, [field]: current.filter(v => v !== value) })
    } else {
      setFormData({ ...formData, [field]: [...current, value] })
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/assessment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar evaluación')
      }

      // Redirect to personalized proposal
      router.push(`/proposal/${data.assessment_id}`)
    } catch (error: any) {
      alert(error.message)
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.companyName && formData.industry && formData.employeeCount
      case 2:
        return formData.challenges.length > 0
      case 3:
        return formData.goals.length > 0 && formData.budgetRange
      case 4:
        return formData.fullName && formData.email
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/concientizaciones" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-4">
            ← Volver
          </Link>
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Evaluación Gratuita
          </h1>
          <p className="text-slate-600">
            Descubre tu programa personalizado en 5 minutos
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  s < step ? 'bg-teal-600 text-white' :
                  s === step ? 'bg-gradient-to-r from-teal-600 to-purple-600 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {s < step ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 transition-all ${
                    s < step ? 'bg-teal-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Empresa</span>
            <span>Retos</span>
            <span>Objetivos</span>
            <span>Contacto</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 min-h-[500px]">
          {/* Step 1: Company Basics */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Información de tu Empresa
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Mi Empresa S.A. de C.V."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Industria *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {industries.map((ind) => (
                    <button
                      key={ind.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, industry: ind.value })}
                      className={`p-4 border-2 rounded-xl transition-all ${
                        formData.industry === ind.value
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{ind.icon}</div>
                      <div className="text-sm font-medium text-slate-900">{ind.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número de Empleados *
                  </label>
                  <select
                    value={formData.employeeCount}
                    onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="10-30">10-30 empleados</option>
                    <option value="31-50">31-50 empleados</option>
                    <option value="51-100">51-100 empleados</option>
                    <option value="101-200">101-200 empleados</option>
                    <option value="201-500">201-500 empleados</option>
                    <option value="500+">Más de 500 empleados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Ciudad, Estado"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Challenges */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                ¿Cuáles son tus principales retos?
              </h2>
              <p className="text-slate-600 mb-6">
                Selecciona todos los que apliquen (mínimo 1)
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {challengesOptions.map((challenge) => (
                  <button
                    key={challenge.value}
                    type="button"
                    onClick={() => toggleSelection('challenges', challenge.value)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.challenges.includes(challenge.value)
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{challenge.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{challenge.label}</div>
                        <div className="text-xs text-slate-500 mt-1 capitalize">{challenge.category}</div>
                      </div>
                      {formData.challenges.includes(challenge.value) && (
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Otros retos o comentarios (opcional)
                </label>
                <textarea
                  value={formData.painPoints}
                  onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Describe cualquier otro reto específico..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                ¿Qué quieres lograr?
              </h2>
              <p className="text-slate-600 mb-6">
                Selecciona tus objetivos principales (mínimo 1)
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {goalsOptions.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleSelection('goals', goal.value)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.goals.includes(goal.value)
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{goal.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{goal.label}</div>
                        <div className="text-xs text-purple-600 mt-1 font-medium">{goal.impact}</div>
                      </div>
                      {formData.goals.includes(goal.value) && (
                        <CheckCircle className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Presupuesto Aproximado *
                  </label>
                  <select
                    value={formData.budgetRange}
                    onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="<50k">Menos de $50,000 MXN</option>
                    <option value="50-100k">$50,000 - $100,000 MXN</option>
                    <option value="100-200k">$100,000 - $200,000 MXN</option>
                    <option value="200-500k">$200,000 - $500,000 MXN</option>
                    <option value="500k+">Más de $500,000 MXN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Timeline Deseado
                  </label>
                  <select
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="3months">3 meses</option>
                    <option value="6months">6 meses</option>
                    <option value="12months">12 meses</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                ¿Dónde enviamos tu propuesta personalizada?
              </h2>
              <p className="text-slate-600 mb-6">
                Genera tu cotización y descubre tu programa ideal
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Puesto
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Director de Sustentabilidad"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Corporativo *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="juan.perez@miempresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="+52 555 123 4567"
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-teal-50 to-purple-50 rounded-xl p-6 mt-8">
                <h3 className="font-bold text-slate-900 mb-2">
                  ✨ Lo que recibirás:
                </h3>
                <ul className="space-y-2 text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Propuesta personalizada con módulos recomendados
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Calculadora de ROI con números de TU empresa
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Acceso a Módulo 1 GRATIS (sin compromiso)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Cotización dinámica que puedes ajustar
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-medium hover:border-teal-600 hover:text-teal-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Atrás
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Continuar
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generando Propuesta...
                  </>
                ) : (
                  <>
                    Ver Mi Propuesta Personalizada
                    <TrendingUp className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>🔒 Tu información está segura y nunca será compartida</p>
          <p className="mt-2">⏱️ Toma solo 5 minutos completar</p>
        </div>
      </div>
    </div>
  )
}

