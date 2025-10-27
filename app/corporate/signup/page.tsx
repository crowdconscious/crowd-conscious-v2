'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'

export default function CorporateSignup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // Company info
    companyName: '',
    industry: 'manufacturing',
    employeeCount: '',
    address: '',
    
    // Admin user info
    fullName: '',
    email: '',
    password: '',
    phone: '',
    
    // Program selection
    programTier: 'completo',
  })

  const industries = [
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'office', label: 'Oficinas Corporativas' },
    { value: 'retail', label: 'Comercio/Retail' },
    { value: 'hospitality', label: 'Hospitalidad' },
    { value: 'technology', label: 'Tecnología' },
    { value: 'education', label: 'Educación' },
    { value: 'other', label: 'Otro' },
  ]

  const programTiers = [
    {
      value: 'inicial',
      name: 'Programa Inicial',
      price: '$45,000 MXN',
      employees: '30 empleados',
      duration: '3 meses',
    },
    {
      value: 'completo',
      name: 'Programa Completo',
      price: '$125,000 MXN',
      employees: '100 empleados',
      duration: '6 meses',
      recommended: true,
    },
    {
      value: 'elite',
      name: 'Programa Elite',
      price: 'Personalizado',
      employees: 'Ilimitado',
      duration: '12 meses',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/corporate/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear cuenta')
      }

      // Redirect to payment or dashboard
      router.push('/corporate/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/concientizaciones" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-4">
            ← Volver a inicio
          </Link>
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Crear Cuenta Corporativa
          </h1>
          <p className="text-slate-600">
            Únete a las empresas que están transformando su impacto comunitario
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-8">
          {/* Company Information */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Información de la Empresa
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Mi Empresa S.A. de C.V."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Industria *
                </label>
                <select
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {industries.map((industry) => (
                    <option key={industry.value} value={industry.value}>
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Número de Empleados *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.employeeCount}
                  onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Calle, Ciudad, Estado"
                />
              </div>
            </div>
          </div>

          {/* Admin User Information */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Información del Administrador
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Juan Pérez"
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="+52 555 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="juan.perez@miempresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>
          </div>

          {/* Program Selection */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Selecciona tu Programa
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {programTiers.map((tier) => (
                <label
                  key={tier.value}
                  className={`relative cursor-pointer border-2 rounded-xl p-6 transition-all ${
                    formData.programTier === tier.value
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="programTier"
                    value={tier.value}
                    checked={formData.programTier === tier.value}
                    onChange={(e) => setFormData({ ...formData, programTier: e.target.value })}
                    className="sr-only"
                  />
                  {tier.recommended && (
                    <div className="absolute top-0 right-0 -mt-2 -mr-2">
                      <span className="bg-gradient-to-r from-teal-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                        RECOMENDADO
                      </span>
                    </div>
                  )}
                  <div className="text-lg font-bold text-slate-900 mb-2">{tier.name}</div>
                  <div className="text-2xl font-bold text-teal-600 mb-3">{tier.price}</div>
                  <div className="space-y-1 text-sm text-slate-600">
                    <div>✓ {tier.employees}</div>
                    <div>✓ {tier.duration}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Continuar al Pago
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-slate-600 text-center">
            Al crear una cuenta, aceptas nuestros{' '}
            <Link href="/terms" className="text-teal-600 hover:underline">
              Términos de Servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="text-teal-600 hover:underline">
              Política de Privacidad
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

