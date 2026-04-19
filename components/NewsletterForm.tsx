'use client'

import { useEffect, useState, type FormEvent } from 'react'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Status = 'idle' | 'loading' | 'success' | 'error' | 'rate-limited' | 'invalid'

export default function NewsletterForm({
  source = 'landing',
  locale = 'es',
  compact = false,
}: {
  source?: string
  locale?: string
  compact?: boolean
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (status !== 'success') return
    const t = setTimeout(() => setStatus('idle'), 2500)
    return () => clearTimeout(t)
  }, [status])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('invalid')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          source,
          language: locale === 'en' ? 'en' : 'es',
        }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
        return
      }
      if (res.status === 429) {
        setStatus('rate-limited')
        return
      }
      setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const buttonLabel = (() => {
    if (status === 'loading') return '…'
    if (status === 'success') return locale === 'es' ? '¡Gracias!' : 'Thanks!'
    return locale === 'es' ? 'Suscribirme' : 'Subscribe'
  })()

  const errorCopy = (() => {
    if (status === 'invalid')
      return locale === 'es' ? 'Correo no válido.' : 'Invalid email.'
    if (status === 'rate-limited')
      return locale === 'es'
        ? 'Demasiados intentos, prueba en una hora.'
        : 'Too many tries, retry in an hour.'
    if (status === 'error')
      return locale === 'es' ? 'Error. Intenta de nuevo.' : 'Error. Try again.'
    return null
  })()

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex ${
        compact ? 'flex-col gap-2' : 'flex-col gap-2 sm:flex-row sm:items-stretch justify-center'
      }`}
      noValidate
    >
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (status === 'invalid' || status === 'error' || status === 'rate-limited') {
            setStatus('idle')
          }
        }}
        placeholder={locale === 'es' ? 'Tu correo' : 'Your email'}
        aria-label={locale === 'es' ? 'Correo electrónico' : 'Email address'}
        className={`rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none ${
          compact ? 'w-full' : 'flex-1 max-w-xs'
        }`}
      />
      <button
        type="submit"
        disabled={status === 'loading' || status === 'success' || !email.trim()}
        aria-live="polite"
        className={`min-h-[44px] whitespace-nowrap rounded-lg px-5 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
          status === 'success'
            ? 'bg-emerald-600 cursor-default'
            : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {buttonLabel}
      </button>
      {errorCopy && (
        <p
          role="alert"
          className="text-xs text-red-400"
        >
          {errorCopy}
        </p>
      )}
    </form>
  )
}
