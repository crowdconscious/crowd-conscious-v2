'use client'

import { useState } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClientAuth()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        const code = (error as { code?: string }).code ?? ''
        const errMsg = error.message?.toLowerCase() || ''
        if (
          code === 'user_already_exists' ||
          code === 'email_exists' ||
          errMsg.includes('already registered') ||
          errMsg.includes('duplicate')
        ) {
          setMessage('Este correo ya tiene una cuenta. Intenta iniciar sesión.')
        } else if (
          code === 'over_email_send_rate_limit' ||
          code === 'over_request_rate_limit' ||
          errMsg.includes('rate limit') ||
          errMsg.includes('too many') ||
          error.status === 429
        ) {
          setMessage('Demasiados intentos. Espera un momento.')
        } else if (code === 'weak_password') {
          setMessage('La contraseña debe tener al menos 6 caracteres.')
        } else if (
          code === 'email_address_invalid' ||
          code === 'validation_failed' ||
          errMsg.includes('invalid email')
        ) {
          setMessage('Por favor ingresa un correo válido.')
        } else if (code === 'signup_disabled' || code === 'email_provider_disabled') {
          setMessage('Registros temporalmente deshabilitados.')
        } else {
          console.error('[SIGNUP] Unhandled error:', { code, message: error.message, status: error.status })
          setMessage('Algo salió mal. Intenta de nuevo.')
        }
        return
      }

      if (data?.user) {
        // CRITICAL: Supabase returns a fake user object with empty identities when user already exists
        if (data.user.identities?.length === 0) {
          setMessage('Este correo ya tiene una cuenta. Intenta iniciar sesión.')
          return
        }

        // Belt-and-suspenders: ensure profile exists (trigger may be disabled)
        try {
          await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          })
        } catch (err) {
          console.warn('[SIGNUP] ensure-profile failed (non-blocking):', err)
        }

        setMessage('Revisa tu correo para confirmar tu cuenta.')
      } else {
        setMessage('Algo salió mal. Intenta de nuevo.')
      }
    } catch (error: unknown) {
      console.error('[SIGNUP] Exception:', error)
      setMessage('Algo salió mal. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Únete a Crowd Conscious</h1>
          <p className="text-slate-600 mt-2">Crea tu cuenta y empieza a predecir</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Nombre Completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Tu nombre completo"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Tu correo electrónico"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Crea una contraseña (mín. 6 caracteres)"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Revisa tu correo')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Iniciar Sesión
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
