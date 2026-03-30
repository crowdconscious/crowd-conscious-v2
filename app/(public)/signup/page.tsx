'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientAuth } from '../../../lib/auth'
import Link from 'next/link'
import { setPendingVote } from '@/lib/guest-vote-storage'
import { inputBaseClass } from '@/components/ui/input'
import GoogleLoginButton from '@/components/auth/GoogleLoginButton'
import { useLocale } from '@/lib/i18n/useLocale'

/**
 * Persist guest-flow query params so the vote submits after email confirm + login.
 */
function PendingVoteFromQuery() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const market = searchParams.get('market')
    const outcome = searchParams.get('outcome')
    const confidence = searchParams.get('confidence')
    const vote = searchParams.get('vote')
    const guestId = searchParams.get('guest_id')
    if (!market || !outcome || confidence == null || !guestId) return
    const conf = parseInt(confidence, 10)
    if (Number.isNaN(conf)) return
    setPendingVote({
      marketId: market,
      outcomeId: outcome,
      confidence: conf,
      vote: vote === 'yes' || vote === 'no' ? vote : undefined,
      guestId,
    })
  }, [searchParams])

  return null
}

function SignUpForm() {
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const loginHref = redirectParam
    ? `/login?redirect=${encodeURIComponent(redirectParam)}`
    : '/login'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClientAuth()
  const locale = useLocale()

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
        if (data.user.identities?.length === 0) {
          setMessage('Este correo ya tiene una cuenta. Intenta iniciar sesión.')
          return
        }

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
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4">
      <PendingVoteFromQuery />
      <div className="w-full max-w-md rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Únete a Crowd Conscious</h1>
          <p className="mt-2 text-sm text-gray-400">Crea tu cuenta y empieza a predecir</p>
          <p className="mt-4 text-sm font-medium text-emerald-400/90">
            100% gratis · Sin dinero real · XP y leaderboard
          </p>
        </div>

        <GoogleLoginButton />

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#2d3748]" />
          <span className="text-sm text-gray-500">
            {locale === 'es' ? 'o con email' : 'or with email'}
          </span>
          <div className="h-px flex-1 bg-[#2d3748]" />
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-300">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputBaseClass}
              placeholder="Tu nombre"
              autoComplete="name"
            />
          </div>

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
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputBaseClass}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </div>

          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                message.includes('Revisa tu correo')
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            ¿Ya tienes cuenta?{' '}
            <Link href={loginHref} className="font-medium text-emerald-400 hover:text-emerald-300">
              Iniciar sesión
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

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f1419]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
