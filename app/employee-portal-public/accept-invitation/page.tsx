'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirm_password: ''
  })

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setError('Token de invitación no válido')
      setLoading(false)
      return
    }

    validateToken()
  }, [token])

  const validateToken = async () => {
    try {
      const response = await fetch(`/api/corporate/accept-invitation?token=${token}`)
      const data = await response.json()

      if (!response.ok || !data.valid) {
        setError(data.error || 'Invitación no válida')
        setLoading(false)
        return
      }

      setInvitation(data.invitation)
      setFormData(prev => ({
        ...prev,
        full_name: data.invitation.full_name || ''
      }))
      setLoading(false)
    } catch (err: any) {
      setError('Error al validar invitación')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setValidating(true)
    setError('')

    try {
      const response = await fetch('/api/corporate/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          full_name: formData.full_name
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al crear cuenta')
        setValidating(false)
        return
      }

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?message=account_created')
      }, 2000)

    } catch (err: any) {
      setError('Error al procesar solicitud')
      setValidating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Validando invitación...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Invitación No Válida
            </h2>
            <p className="text-slate-600 mb-6">
              {error}
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:scale-105 transition-transform"
            >
              Ir al Inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              ¡Cuenta Creada! 🎉
            </h2>
            <p className="text-slate-600 mb-6">
              Tu cuenta ha sido creada exitosamente. Redirigiendo a inicio de sesión...
            </p>
            <Loader className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            ¡Bienvenido a Concientizaciones!
          </h1>
          <p className="text-slate-600">
            {invitation?.company_name} te ha invitado a unirte
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-600"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Confirmar Contraseña *
            </label>
            <input
              type="password"
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:outline-none"
              placeholder="Confirma tu contraseña"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={validating}
            className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {validating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creando Cuenta...
              </>
            ) : (
              'Crear Mi Cuenta'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-teal-600 font-medium hover:text-teal-700">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  )
}

