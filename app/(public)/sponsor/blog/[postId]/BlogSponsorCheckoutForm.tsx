'use client'

import { useState } from 'react'
import { inputBaseClass } from '@/components/ui/input'
import type { CreatorLocale } from '@/lib/i18n/creator'

type Props = {
  postId: string
  refParam: string | null
  locale: CreatorLocale
}

export default function BlogSponsorCheckoutForm({ postId, refParam, locale }: Props) {
  const es = locale === 'es'
  const [amount, setAmount] = useState('500')
  const [sponsorName, setSponsorName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amountMxn = parseInt(amount, 10)
    if (Number.isNaN(amountMxn) || amountMxn < 100) {
      setError(es ? 'El monto mínimo es 100 MXN.' : 'Minimum amount is 100 MXN.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sponsor/blog/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          amount_mxn: amountMxn,
          sponsor_name: sponsorName,
          sponsor_logo_url: logoUrl || undefined,
          target_url: targetUrl,
          sponsor_email: email,
          ref: refParam || undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { data?: { url?: string }; error?: string; url?: string }
      const url = json.data?.url ?? json.url
      if (!res.ok || !url) {
        throw new Error(json.error ?? 'Error')
      }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {es ? 'Nombre de la marca' : 'Brand name'}
        </label>
        <input className={inputBaseClass} value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} required maxLength={120} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {es ? 'URL del logo (opcional)' : 'Logo URL (optional)'}
        </label>
        <input className={inputBaseClass} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} type="url" placeholder="https://..." />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {es ? 'URL de destino' : 'Target URL'}
        </label>
        <input className={inputBaseClass} value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} type="url" placeholder="https://..." required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {es ? 'Correo de contacto' : 'Contact email'}
        </label>
        <input className={inputBaseClass} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {es ? 'Monto (MXN)' : 'Amount (MXN)'}
        </label>
        <input className={inputBaseClass} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" required />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading
          ? es ? 'Redirigiendo a Stripe...' : 'Redirecting to Stripe...'
          : es ? 'Continuar al pago' : 'Continue to payment'}
      </button>
      <p className="text-center text-xs text-slate-500">
        {es ? 'Pago seguro con Stripe. 20% al Fondo Consciente.' : 'Secure payment with Stripe. 20% to the Conscious Fund.'}
      </p>
    </form>
  )
}
