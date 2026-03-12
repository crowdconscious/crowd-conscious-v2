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
      console.log('[SIGNUP] Attempting signup for:', email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('[SIGNUP] Response data:', JSON.stringify(data, null, 2))
      console.log('[SIGNUP] Response error:', error ? JSON.stringify(error, null, 2) : null)

      if (error) {
        console.error('[SIGNUP] Supabase error:', error.message, error.status)
        const errMsg = error.message?.toLowerCase() || ''
        if (errMsg.includes('already registered') || errMsg.includes('duplicate')) {
          setMessage('Este correo ya está registrado. Intenta iniciar sesión. / This email is already registered. Try signing in.')
        } else if (errMsg.includes('rate limit') || errMsg.includes('too many') || error.status === 429) {
          setMessage('Demasiados intentos. Espera unos minutos. / Too many attempts. Please wait a few minutes.')
        } else {
          setMessage('Algo salió mal. Intenta de nuevo. / Something went wrong. Please try again.')
        }
        return
      }

      if (data?.user) {
        console.log('[SIGNUP] User created:', data.user.id)
        console.log('[SIGNUP] User email confirmed:', data.user.email_confirmed_at)
        console.log('[SIGNUP] Identities:', data.user.identities?.length)

        // CRITICAL: Supabase returns a fake user object with empty identities when user already exists
        if (data.user.identities?.length === 0) {
          console.log('[SIGNUP] User already exists (empty identities)')
          setMessage('Este correo ya está registrado. Intenta iniciar sesión. / This email is already registered. Try signing in.')
          return
        }

        setMessage('¡Cuenta creada! Revisa tu correo para confirmar. / Account created! Check your email to confirm.')
        // No redirect — stay on signup page. User must confirm email first.
      } else {
        console.warn('[SIGNUP] No error but no user in response:', data)
        setMessage('Algo salió mal. Intenta de nuevo. / Something went wrong. Please try again.')
      }
    } catch (error: unknown) {
      console.error('[SIGNUP] Exception:', error)
      setMessage('Algo salió mal. Intenta de nuevo. / Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Join Crowd Conscious</h1>
          <p className="text-slate-600 mt-2">Create your account to start making impact</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Create a password (min 6 characters)"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.includes('Cuenta creada') || message.includes('Account created')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-500 hover:text-slate-700 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
