'use client'

import { useState } from 'react'
import { Heart, Loader2, Lock } from 'lucide-react'
import { DONATION_MAX_MXN, DONATION_MIN_MXN, DONATION_PRESETS_MXN } from '@/lib/patrocinio/donations'

type Props = { locale: 'es' | 'en'; cancelled?: boolean }

export function DonationForm({ locale, cancelled = false }: Props) {
  const es = locale === 'es'
  const fmt = (n: number) => `$${n.toLocaleString(es ? 'es-MX' : 'en-US')}`
  const [preset, setPreset] = useState<number | null>(250)
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = custom.trim() ? Math.floor(Number(custom)) : preset ?? 0
  const valid = Number.isFinite(amount) && amount >= DONATION_MIN_MXN && amount <= DONATION_MAX_MXN

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) {
      setError(
        es
          ? `Elige un monto entre ${fmt(DONATION_MIN_MXN)} y ${fmt(DONATION_MAX_MXN)} MXN.`
          : `Choose an amount between ${fmt(DONATION_MIN_MXN)} and ${fmt(DONATION_MAX_MXN)} MXN.`
      )
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/patrocinio/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_mxn: amount, name: anonymous ? '' : name, email, anonymous, locale }),
      })
      const json = await res.json().catch(() => null)
      const url = json?.data?.url as string | undefined
      if (!res.ok || !url) throw new Error(json?.error?.message || 'checkout')
      window.location.href = url
    } catch {
      setError(es ? 'No pudimos abrir el pago. Intenta de nuevo.' : 'We could not open checkout. Please try again.')
      setLoading(false)
    }
  }

  const input =
    'w-full min-h-[44px] rounded-xl border border-[#3b4757] bg-[#0b1016] px-3 text-base text-[#ffffff] placeholder:text-[#8b98a9] focus:border-emerald-400 focus:outline-none'

  return (
    <form id="apoyar" onSubmit={submit} className="scroll-mt-28 rounded-2xl border border-[#2d3748] bg-[#0b1016] p-4 sm:p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-[#ffffff]">
        <Heart className="h-4 w-4 text-[#6ee7b7]" />
        {es ? 'Tu aportación al Fondo Consciente' : 'Your contribution to the Conscious Fund'}
      </p>
      {cancelled ? (
        <p className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-[#fcd34d]">
          {es ? 'Cancelaste el pago. No se hizo ningún cargo.' : 'You cancelled the payment. You were not charged.'}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={es ? 'Monto' : 'Amount'}>
        {DONATION_PRESETS_MXN.map((p) => {
          const on = !custom.trim() && preset === p
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setPreset(p)
                setCustom('')
              }}
              className={`min-h-[48px] rounded-xl border text-base font-semibold transition-colors ${
                on
                  ? 'border-[#34d399] bg-[#047857] text-[#ffffff]'
                  : 'border-[#3b4757] bg-[#151b23] text-[#e2e8f0] hover:border-emerald-400/60'
              }`}
            >
              {fmt(p)}
            </button>
          )
        })}
      </div>

      <label className="mt-3 block text-sm text-[#cbd5e1]">
        {es ? 'Otro monto (MXN)' : 'Other amount (MXN)'}
        <input
          type="number"
          inputMode="numeric"
          min={DONATION_MIN_MXN}
          max={DONATION_MAX_MXN}
          step={1}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={`${DONATION_MIN_MXN} – ${DONATION_MAX_MXN.toLocaleString(es ? 'es-MX' : 'en-US')}`}
          className={`mt-1 ${input}`}
        />
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm text-[#cbd5e1]">
          {es ? 'Nombre (opcional)' : 'Name (optional)'}
          <input
            type="text"
            value={name}
            disabled={anonymous}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="name"
            className={`mt-1 ${input} disabled:opacity-50`}
          />
        </label>
        <label className="block text-sm text-[#cbd5e1]">
          {es ? 'Correo para tu recibo (opcional)' : 'Email for your receipt (optional)'}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={320}
            autoComplete="email"
            className={`mt-1 ${input}`}
          />
        </label>
      </div>

      <label className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-[#cbd5e1]">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="h-5 w-5 accent-emerald-500"
        />
        {es ? 'Aportar de forma anónima' : 'Contribute anonymously'}
      </label>

      <p className="mt-2 text-sm text-[#cbd5e1]">
        {es
          ? 'Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente.'
          : 'Card fees are deducted; the rest goes to the Conscious Fund.'}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-[#fca5a5]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#047857] px-6 py-3 text-base font-semibold text-[#ffffff] shadow-lg shadow-emerald-900/40 transition-colors hover:bg-[#065f46] disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {valid
          ? es
            ? `Aportar ${fmt(amount)} MXN con tarjeta`
            : `Give ${fmt(amount)} MXN by card`
          : es
            ? 'Aportar con tarjeta'
            : 'Give by card'}
      </button>
      <p className="mt-3 text-xs leading-relaxed text-[#a3b1c2]">
        {es
          ? 'Pago seguro con Stripe. Recibirás un comprobante de aportación por correo; no es factura ni comprobante fiscal, y no es deducible de impuestos.'
          : 'Secure payment with Stripe. You will get a contribution confirmation by email; it is not a tax invoice and not tax-deductible.'}
      </p>
    </form>
  )
}
