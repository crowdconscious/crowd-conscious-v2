'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Minimal checkout form for the Pilot Pulse trial tier.
 *
 * Reuses /api/pulse/checkout with `tier: 'pilot'` so the entire post-payment
 * pipeline (sponsor account provisioning, welcome email, dashboard access)
 * works the same as paid Pulse purchases. The actual question lives on the
 * sponsor's dashboard after checkout — we don't ask for it here because it
 * keeps the conversion form to two fields.
 *
 * Identical to the previous app/pulse/pilot/PilotCheckoutForm.tsx; only the
 * file location moved when /pulse → /para-marcas for the B2B surface.
 */
export function PilotCheckoutForm({ locale }: Props) {
  const es = locale === 'es'
  const searchParams = useSearchParams()
  const businessParam = searchParams?.get('business') ?? ''
  const source = searchParams?.get('source') ?? ''
  const [name, setName] = useState(businessParam)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (businessParam && !name) setName(businessParam)
  }, [businessParam, name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/pulse/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'pilot',
          company_name: name.trim(),
          contact_email: email.trim(),
          source: source || undefined,
        }),
      })
      const json = await res.json()
      const data = json.data ?? json
      if (!res.ok) {
        setError(json.error?.message || data.error || (es ? 'Algo salió mal' : 'Something went wrong'))
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(es ? 'No se recibió URL de pago' : 'No checkout URL received')
    } catch {
      setError(es ? 'No se pudo iniciar el pago' : 'Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-400">
          {es ? 'Nombre / Empresa *' : 'Name / Company *'}
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          placeholder={es ? 'Tu nombre o empresa' : 'Your name or company'}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-400">Email *</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
          placeholder="you@company.com"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading
          ? es
            ? 'Redirigiendo…'
            : 'Redirecting...'
          : es
            ? 'Pagar $1,500 MXN'
            : 'Pay $1,500 MXN'}
      </button>

      <p className="text-center text-xs text-slate-500">
        {es ? 'Pago seguro con Stripe' : 'Secure payment via Stripe'}
      </p>
    </form>
  )
}
