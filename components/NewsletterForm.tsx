'use client'

import { useState, type FormEvent } from 'react'

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) return

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, language: locale === 'en' ? 'en' : 'es' }),
      })
      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="py-2 text-sm font-medium text-emerald-400">
        {locale === 'es'
          ? '¡Listo! Recibirás el próximo análisis.'
          : "You're on the list for our next analysis."}
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex ${compact ? 'flex-col gap-2' : 'flex-col gap-2 sm:flex-row sm:items-stretch'} ${compact ? '' : 'justify-center'}`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={locale === 'es' ? 'Tu correo' : 'Your email'}
        className={`rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:outline-none ${compact ? 'w-full' : 'flex-1 max-w-xs'}`}
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="whitespace-nowrap rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        {status === 'loading' ? '…' : locale === 'es' ? 'Suscribirme' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-400">{locale === 'es' ? 'Error. Intenta de nuevo.' : 'Error. Try again.'}</p>
      )}
    </form>
  )
}
