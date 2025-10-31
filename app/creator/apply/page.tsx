'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Upload, AlertCircle, Send } from 'lucide-react'

export default function CreatorApplicationPage() {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: '',
    email: '',
    phone: '',
    organizationType: 'community', // community, ngo, expert, university
    organizationName: '',
    
    // Experience
    experienceYears: '',
    pastProjects: '',
    impactMetrics: '',
    
    // Proposed Module
    moduleTitle: '',
    moduleTopic: '',
    coreValue: 'clean_air',
    targetAudience: '',
    uniqueValue: '',
    
    // Content Plan
    lessonCount: '3',
    estimatedDuration: '4',
    learningObjectives: '',
    expectedOutcomes: '',
    
    // Proof of Impact
    proofDescription: '',
    testimonials: '',
    mediaLinks: '',
    
    // Commitment
    timeCommitment: '',
    supportNeeded: '',
    whyCreate: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/creator/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        alert('Error al enviar la solicitud. Por favor intenta de nuevo.')
      }
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Error al enviar la solicitud. Por favor intenta de nuevo.')
    }

    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            ¡Solicitud Enviada! 🎉
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Hemos recibido tu solicitud para convertirte en creador de contenido. 
            Nuestro equipo la revisará y te contactaremos en 5-7 días hábiles.
          </p>

          <div className="bg-gradient-to-br from-teal-50 to-purple-50 border-2 border-teal-200 rounded-xl p-6 mb-8">
            <h3 className="font-bold text-slate-900 mb-3">Próximos Pasos:</h3>
            <ol className="text-left text-sm text-slate-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">1.</span>
                <span>Revisaremos tu experiencia y propuesta de módulo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">2.</span>
                <span>Te contactaremos para una videollamada (si es necesario)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">3.</span>
                <span>Si eres aprobado, recibirás acceso al Module Builder</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-teal-600">4.</span>
                <span>¡Comienza a crear y ganar por tu conocimiento!</span>
              </li>
            </ol>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/images/logo.png"
                  alt="Crowd Conscious"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <div className="font-bold text-slate-900">Crowd Conscious</div>
                <div className="text-xs text-slate-500">Aplicación de Creador</div>
              </div>
            </Link>

            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Salir
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Conviértete en Creador de Módulos
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Comparte tu experiencia real y genera ingresos mientras empoderas a empresas con conocimiento auténtico
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full mx-1 transition-colors ${
                  s <= step ? 'bg-gradient-to-r from-teal-600 to-purple-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <div className="text-center text-sm text-slate-600">
            Paso {step} de 4
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Información Personal</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="+52 XXX XXX XXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Organización *
                </label>
                <select
                  name="organizationType"
                  value={formData.organizationType}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="community">Comunidad Local</option>
                  <option value="ngo">ONG / Organización Sin Fines de Lucro</option>
                  <option value="expert">Experto Individual</option>
                  <option value="university">Universidad / Institución Educativa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la Organización/Comunidad *
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Nombre de tu organización o comunidad"
                />
              </div>
            </div>
          )}

          {/* Step 2: Experience */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Tu Experiencia e Impacto</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Años de Experiencia en el Tema *
                </label>
                <input
                  type="number"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Proyectos Pasados *
                </label>
                <textarea
                  name="pastProjects"
                  value={formData.pastProjects}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe los proyectos que has realizado relacionados con el tema del módulo que quieres crear..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Métricas de Impacto *
                </label>
                <textarea
                  name="impactMetrics"
                  value={formData.impactMetrics}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ejemplo: Redujimos 500 kg de CO2, plantamos 100 árboles, capacitamos 50 personas..."
                />
                <p className="mt-2 text-sm text-slate-500">
                  Comparte números específicos del impacto que has logrado
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Proposed Module */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Propuesta de Módulo</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Título del Módulo *
                </label>
                <input
                  type="text"
                  name="moduleTitle"
                  value={formData.moduleTitle}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ejemplo: Aire Limpio para Oficinas Corporativas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Valor Central *
                </label>
                <select
                  name="coreValue"
                  value={formData.coreValue}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="clean_air">🌬️ Aire Limpio</option>
                  <option value="clean_water">💧 Agua Limpia</option>
                  <option value="zero_waste">♻️ Cero Residuos</option>
                  <option value="biodiversity">🌱 Biodiversidad</option>
                  <option value="fair_trade">🤝 Comercio Justo</option>
                  <option value="safe_cities">🏙️ Ciudades Seguras</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción del Tema *
                </label>
                <textarea
                  name="moduleTopic"
                  value={formData.moduleTopic}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿De qué trata tu módulo? ¿Qué problema resuelve?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Audiencia Objetivo *
                </label>
                <input
                  type="text"
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ejemplo: Empresas manufactureras, oficinas corporativas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Por qué eres único para enseñar esto? *
                </label>
                <textarea
                  name="uniqueValue"
                  value={formData.uniqueValue}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Qué te hace especial o diferente de otras personas que enseñan esto?"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Número de Lecciones *
                  </label>
                  <input
                    type="number"
                    name="lessonCount"
                    value={formData.lessonCount}
                    onChange={handleChange}
                    required
                    min="3"
                    max="10"
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Duración Estimada (semanas) *
                  </label>
                  <input
                    type="number"
                    name="estimatedDuration"
                    value={formData.estimatedDuration}
                    onChange={handleChange}
                    required
                    min="2"
                    max="12"
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Objetivos de Aprendizaje *
                </label>
                <textarea
                  name="learningObjectives"
                  value={formData.learningObjectives}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Qué aprenderán los empleados? Lista 3-5 objetivos clave..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resultados Esperados *
                </label>
                <textarea
                  name="expectedOutcomes"
                  value={formData.expectedOutcomes}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Qué podrán hacer después de completar el módulo?"
                />
              </div>
            </div>
          )}

          {/* Step 4: Proof & Commitment */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Prueba de Impacto y Compromiso</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Evidencia de Tu Trabajo *
                </label>
                <textarea
                  name="proofDescription"
                  value={formData.proofDescription}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe la evidencia que tienes de tus proyectos (fotos, datos, resultados medibles...)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Testimonios
                </label>
                <textarea
                  name="testimonials"
                  value={formData.testimonials}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Tienes testimonios de personas a las que has ayudado? Compártelos aquí..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Links a Fotos/Videos/Redes Sociales
                </label>
                <input
                  type="text"
                  name="mediaLinks"
                  value={formData.mediaLinks}
                  onChange={handleChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="https://... (separados por comas si son varios)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Compromiso de Tiempo *
                </label>
                <textarea
                  name="timeCommitment"
                  value={formData.timeCommitment}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Cuántas horas por semana puedes dedicar a crear el módulo?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Qué apoyo necesitas de nosotros? *
                </label>
                <textarea
                  name="supportNeeded"
                  value={formData.supportNeeded}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ejemplo: Ayuda con producción de video, diseño gráfico, revisión de contenido..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Por qué quieres crear este módulo? *
                </label>
                <textarea
                  name="whyCreate"
                  value={formData.whyCreate}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Tu motivación personal..."
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
              >
                Anterior
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-transform shadow-lg"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-lg font-bold hover:scale-105 transition-transform shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Enviar Solicitud</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Benefits Section */}
        <div className="mt-12 bg-gradient-to-br from-teal-50 to-purple-50 border-2 border-teal-200 rounded-2xl p-6 sm:p-8">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Beneficios de ser Creador</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Ingresos Recurrentes</div>
                <div className="text-sm text-slate-600">Gana el 20% por cada venta de tu módulo</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Impacto Escalable</div>
                <div className="text-sm text-slate-600">Tu conocimiento llega a cientos de empresas</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Herramientas Gratis</div>
                <div className="text-sm text-slate-600">Acceso al Module Builder y recursos de diseño</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Reconocimiento</div>
                <div className="text-sm text-slate-600">Badge de Creador Certificado en tu perfil</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

