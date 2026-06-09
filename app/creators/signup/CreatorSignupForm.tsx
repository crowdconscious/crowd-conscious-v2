'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClientAuth } from '@/lib/auth'
import { inputBaseClass } from '@/components/ui/input'
import { useLocale } from '@/lib/i18n/useLocale'
import { getCreatorCopy, isValidHandle, normalizeHandle, type CreatorLocale } from '@/lib/i18n/creator'

export default function CreatorSignupForm() {
  const locale = (useLocale() === 'en' ? 'en' : 'es') as CreatorLocale
  const t = getCreatorCopy(locale)

  const [fullName, setFullName] = useState('')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClientAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    const normalized = normalizeHandle(handle)
    if (!isValidHandle(normalized)) {
      setMessage(t.handleInvalid)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/creator`,
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
          setMessage(
            locale === 'es'
              ? 'Este correo ya tiene una cuenta. Intenta iniciar sesión.'
              : 'This email already has an account. Try logging in.'
          )
        } else if (code === 'weak_password') {
          setMessage(
            locale === 'es'
              ? 'La contraseña debe tener al menos 6 caracteres.'
              : 'Password must be at least 6 characters.'
          )
        } else {
          setMessage(locale === 'es' ? 'Algo salió mal. Intenta de nuevo.' : 'Something went wrong. Try again.')
        }
        return
      }

      if (!data?.user || data.user.identities?.length === 0) {
        setMessage(
          locale === 'es'
            ? 'Este correo ya tiene una cuenta. Intenta iniciar sesión.'
            : 'This email already has an account. Try logging in.'
        )
        return
      }

      // Assign the creator role + claim the handle (no admin grant needed).
      const res = await fetch('/api/auth/ensure-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, fullName, handle: normalized }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        if (json.error === 'handle_taken') {
          setMessage(t.handleTaken)
          return
        }
        if (json.error === 'invalid_handle') {
          setMessage(t.handleInvalid)
          return
        }
        // Role assignment failed but the auth user exists; surface gently.
        setMessage(locale === 'es' ? 'Algo salió mal. Intenta de nuevo.' : 'Something went wrong. Try again.')
        return
      }

      setSuccess(true)
      setMessage(t.signupCheckEmail)
    } catch {
      setMessage(locale === 'es' ? 'Algo salió mal. Intenta de nuevo.' : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            {t.heroEyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{t.signupTitle}</h1>
          <p className="mt-2 text-sm text-gray-400">{t.signupSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-300">
              {t.signupName}
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputBaseClass}
              placeholder={t.signupNamePlaceholder}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="handle" className="mb-2 block text-sm font-medium text-gray-300">
              {t.signupHandle}
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">@</span>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                required
                minLength={3}
                maxLength={30}
                className={inputBaseClass}
                placeholder="tu_handle"
                autoComplete="off"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">{t.signupHandleHint}</p>
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
              {t.signupEmail}
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
              {t.signupPassword}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputBaseClass}
              placeholder={locale === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
              autoComplete="new-password"
            />
          </div>

          {message && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                success
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-red-500/30 bg-red-950/40 text-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {success ? (
            <Link
              href="/creator"
              className="block w-full rounded-lg bg-emerald-500 py-3 text-center font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {t.dashTitle} →
            </Link>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t.signupSubmitting : t.signupSubmit}
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {t.signupHasAccount}{' '}
            <Link href="/login?redirect=/creator" className="font-medium text-emerald-400 hover:text-emerald-300">
              {t.signupLogin}
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/creators" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
            ← {t.metaTitle.split('—')[0].trim()}
          </Link>
        </div>
      </div>
    </div>
  )
}
