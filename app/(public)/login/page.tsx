'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getSafeRedirectPath } from '@/lib/auth-redirect'
import { inputBaseClass } from '@/components/ui/input'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useLocale } from '@/lib/i18n/useLocale'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const searchParams = useSearchParams()
  const supabase = createClientAuth()
  const locale = useLocale()

  const redirectParam = searchParams.get('redirect')
  const signupHref = redirectParam
    ? `/signup?redirect=${encodeURIComponent(redirectParam)}`
    : '/signup'

  useEffect(() => {
    const error = searchParams.get('error')
    const passwordReset = searchParams.get('password_reset')

    if (error === 'missing_code') {
      setMessage('Tu enlace de confirmación no es válido. Intenta registrarte de nuevo.')
    } else if (error === 'confirmation_failed') {
      setMessage('La confirmación del correo falló. El enlace puede haber expirado.')
    } else if (error === 'session_failed') {
      setMessage('No se pudo crear la sesión. Por favor inicia sesión.')
    } else if (error === 'auth_callback_error' || error === 'auth_callback_exception') {
      setMessage('Hubo un error al confirmar tu correo. Intenta iniciar sesión.')
    } else if (passwordReset === 'success') {
      setMessage('¡Contraseña restablecida! Inicia sesión con tu nueva contraseña.')
    }
  }, [searchParams])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const errMsg = error.message?.toLowerCase() || ''
        if (errMsg.includes('invalid') && (errMsg.includes('credentials') || errMsg.includes('password'))) {
          setMessage('Correo o contraseña incorrectos.')
        } else {
          setMessage('Algo salió mal. Intenta de nuevo.')
        }
      } else if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!profile) {
          await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: data.user.id }),
          })
        }

        const destination = getSafeRedirectPath(redirectParam)
        window.location.href = destination
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      setMessage(`Error inesperado: ${err?.message || 'Intenta de nuevo.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4">
      <div className="w-full max-w-md rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-gray-400">Inicia sesión en tu cuenta de Crowd Conscious</p>
        </div>

        <GoogleLoginButton />

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#2d3748]" />
          <span className="text-sm text-gray-500">
            {locale === 'es' ? 'o con email' : 'or with email'}
          </span>
          <div className="h-px flex-1 bg-[#2d3748]" />
        </div>

        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputBaseClass}
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Contraseña
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-emerald-400 hover:text-emerald-300">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputBaseClass}
              placeholder="Tu contraseña"
              autoComplete="current-password"
            />
          </div>

          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                message.includes('restablecida') || message.includes('successful')
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/30 bg-red-950/40 text-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            ¿No tienes cuenta?{' '}
            <Link href={signupHref} className="font-medium text-emerald-400 hover:text-emerald-300">
              Regístrate
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
            ← Volver
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f1419]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
