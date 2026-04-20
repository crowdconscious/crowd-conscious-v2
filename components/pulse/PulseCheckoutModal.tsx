'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { PULSE_TIERS, calculatePulseFundAllocationRounded, type PulseTierId } from '@/lib/pulse-tiers'
import { LogoUpload } from '@/components/ui/LogoUpload'

type CheckoutTier = Exclude<PulseTierId, 'enterprise'>

interface PulseCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  tier: CheckoutTier
  tierLabel: string
  locale: 'es' | 'en'
}

export function PulseCheckoutModal({ isOpen, onClose, tier, tierLabel, locale }: PulseCheckoutModalProps) {
  const router = useRouter()
  const es = locale === 'es'
  const MIN_AMOUNT = 100
  const tierConfig = PULSE_TIERS[tier]
  const tierPrice = tierConfig.priceMXN
  const fundPct = Math.round(tierConfig.fundPercent * 100)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [contactName, setContactName] = useState('')
  const [brandPitch, setBrandPitch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMundial = tier === 'mundial_pack' || tier === 'mundial_pack_founding'
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    coupon_id: string
    discount_percent: number
    type: string
  } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  const validateCoupon = async () => {
    setCouponError('')
    const trimmed = couponCode.trim()
    if (!trimmed) return
    setValidatingCoupon(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: trimmed,
          ...(email.trim() ? { email: email.trim() } : {}),
        }),
      })
      const json = await res.json()
      const data = json.data ?? json
      if (!data.valid) {
        setAppliedCoupon(null)
        setCouponError(data.error || (es ? 'Código no válido' : 'Invalid code'))
        return
      }
      setAppliedCoupon({
        coupon_id: data.coupon_id,
        discount_percent: data.discount_percent,
        type: data.type,
      })
    } catch {
      setCouponError(es ? 'No se pudo validar el código' : 'Could not validate code')
    } finally {
      setValidatingCoupon(false)
    }
  }

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const finalLogoUrl = logoUrl

      if (appliedCoupon?.discount_percent === 100) {
        const res = await fetch('/api/coupons/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: couponCode.trim().toUpperCase(),
            email: email.trim(),
            name: name.trim(),
            company_name: name.trim(),
          }),
        })
        const redeemJson = await res.json()
        if (!res.ok) {
          setError(
            typeof redeemJson.error === 'string'
              ? redeemJson.error
              : es
                ? 'No se pudo activar el acceso'
                : 'Could not activate access'
          )
          return
        }
        if (redeemJson.success && redeemJson.dashboardUrl) {
          router.push(redeemJson.dashboardUrl)
          return
        }
        setError(es ? 'Respuesta inesperada' : 'Unexpected response')
        return
      }

      const res = await fetch('/api/pulse/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          company_name: name.trim(),
          contact_email: email.trim(),
          website: url || undefined,
          logo_url: finalLogoUrl || undefined,
          ...(isMundial
            ? {
                contact_name: contactName.trim(),
                brand_pitch: brandPitch.trim(),
              }
            : {}),
          ...(appliedCoupon ? { coupon_code: couponCode.trim().toUpperCase() } : {}),
        }),
      })
      const json = await res.json()
      const data = json.data ?? json

      if (!res.ok) {
        setError(json.error?.message || data.error || 'Something went wrong')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError('No checkout URL received')
    } catch {
      setError('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  const previewAmount = tierPrice
  const discountedPreview =
    appliedCoupon && appliedCoupon.discount_percent < 100
      ? Math.max(MIN_AMOUNT, Math.round(previewAmount * (1 - appliedCoupon.discount_percent / 100)))
      : previewAmount
  const allocPreview = calculatePulseFundAllocationRounded(discountedPreview, tier)

  return (
    // On mobile the form can be taller than the viewport, especially
    // for Mundial (contact name + brand pitch + coupon + fund banner).
    // Panel is flex-col with a scrollable body between a sticky header
    // and sticky footer so the submit button is always reachable.
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[#2d3748] bg-[#0f1419] shadow-2xl sm:rounded-2xl"
        style={{ maxHeight: 'min(90vh, 100dvh)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#2d3748] bg-[#0f1419] px-6 py-4">
          <h3 className="text-lg font-bold text-white sm:text-xl">
            {es ? 'Conscious Pulse — ' : 'Conscious Pulse — '}
            {tierLabel}
          </h3>
          <button
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
            aria-label={es ? 'Cerrar' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          id="pulse-checkout-form"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-4 pb-24 space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {es ? 'Nombre / Empresa *' : 'Name / Company *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder={es ? 'Tu nombre o empresa' : 'Your name or company'}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {es ? 'Sitio web (opcional)' : 'Website (optional)'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="https://..."
            />
          </div>
          <LogoUpload
            currentLogoUrl={logoUrl || null}
            onUpload={(u) => setLogoUrl(u)}
            onClear={() => setLogoUrl('')}
            label={es ? 'Logo (opcional)' : 'Logo (optional)'}
          />

          {isMundial && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  {es ? 'Nombre del contacto *' : 'Contact name *'}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  placeholder={es ? 'Quién recibirá el seguimiento' : 'Who we should follow up with'}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">
                  {es
                    ? 'Tu marca en una frase * (máx. 280 caracteres)'
                    : 'Your brand in one sentence * (max 280 chars)'}
                </label>
                <textarea
                  value={brandPitch}
                  onChange={(e) => setBrandPitch(e.target.value.slice(0, 280))}
                  required
                  rows={2}
                  className="w-full resize-y rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                  placeholder={
                    es
                      ? 'Ej: "Cerveza artesanal mexicana con presencia en 80+ bares de CDMX"'
                      : 'e.g. "Mexican craft brewery with 80+ CDMX bars on tap"'
                  }
                />
                <p className="mt-1 text-xs text-slate-500">
                  {es
                    ? 'Te contactamos en 24h para definir tus 5 Pulses.'
                    : 'We follow up within 24h to scope your 5 Pulses.'}
                </p>
              </div>
            </>
          )}

          <div className="mt-1">
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {es ? '¿Tienes un código de descuento?' : 'Have a discount code?'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoComplete="off"
                placeholder={es ? 'Código' : 'Code'}
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setAppliedCoupon(null)
                  setCouponError('')
                }}
                className="flex-1 rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm uppercase text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={validateCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                className="shrink-0 rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {validatingCoupon ? '…' : es ? 'Aplicar' : 'Apply'}
              </button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2">
                <span className="text-sm text-emerald-400">
                  ✓{' '}
                  {appliedCoupon.discount_percent === 100
                    ? es
                      ? '¡Acceso gratuito!'
                      : 'Free access!'
                    : `${appliedCoupon.discount_percent}% ${es ? 'de descuento' : 'off'}`}
                </span>
              </div>
            )}
            {couponError && <p className="mt-1 text-xs text-red-400">{couponError}</p>}
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <p className="font-medium text-emerald-400">
              {es ? `Hasta ${fundPct}% → Fondo Consciente` : `Up to ${fundPct}% → Conscious Fund`}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {es ? (
                <>
                  Estimado con este monto (después de comisiones):{' '}
                  <span className="font-medium text-emerald-300/90">
                    ~{allocPreview.fundAmountRounded.toLocaleString()} MXN
                  </span>{' '}
                  a causas; el resto apoya la operación.
                </>
              ) : (
                <>
                  Estimated from this amount (after est. processing fees):{' '}
                  <span className="font-medium text-emerald-300/90">
                    ~{allocPreview.fundAmountRounded.toLocaleString()} MXN
                  </span>{' '}
                  to community causes; remainder supports operations.
                </>
              )}
            </p>
          </div>

          <p className="text-center text-xs text-slate-500">
            {es ? 'Pago seguro con Stripe · Códigos promocionales de Stripe habilitados' : 'Secure payment via Stripe · Stripe promotion codes enabled'}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>

        <div className="shrink-0 border-t border-[#2d3748] bg-[#0f1419]/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-[#0f1419]/80">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 py-2.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              form="pulse-checkout-form"
              disabled={
                loading ||
                (isMundial && (!contactName.trim() || !brandPitch.trim()))
              }
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading
                ? es
                  ? 'Redirigiendo…'
                  : 'Redirecting...'
                : appliedCoupon?.discount_percent === 100
                  ? es
                    ? 'Activar acceso'
                    : 'Activate access'
                  : es
                    ? 'Continuar al pago'
                    : 'Continue to payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
