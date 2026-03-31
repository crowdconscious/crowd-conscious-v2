'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  SPONSOR_TIERS,
  calculateFundAllocationRounded,
  type SponsorTierId,
} from '@/lib/sponsor-tiers'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { useLocale } from '@/lib/i18n/useLocale'

interface SponsorCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  tier: SponsorTierId
  tierLabel: string
  marketId?: string
  marketTitle?: string
  category?: string
}

export function SponsorCheckoutModal({
  isOpen,
  onClose,
  tier,
  tierLabel,
  marketId,
  marketTitle,
  category,
}: SponsorCheckoutModalProps) {
  const router = useRouter()
  const locale = useLocale()
  const es = locale === 'es'
  const MIN_AMOUNT = 100
  const tierConfig = SPONSOR_TIERS[tier]
  const tierPrice = tierConfig.price
  const fundPct = Math.round(tierConfig.fundPercent * 100)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [amount, setAmount] = useState<number>(tierPrice)
  const [customAmountInput, setCustomAmountInput] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      const amountMxn = customAmountInput ? parseInt(customAmountInput, 10) : amount
      const finalAmount = Number.isNaN(amountMxn) || amountMxn < MIN_AMOUNT ? tierPrice : amountMxn

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

      const res = await fetch('/api/sponsor/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          market_id: marketId,
          category,
          amount_mxn: finalAmount,
          sponsor_name: name,
          sponsor_url: url || undefined,
          sponsor_logo_url: finalLogoUrl || undefined,
          email,
          ...(appliedCoupon ? { coupon_code: couponCode.trim().toUpperCase() } : {}),
        }),
      })
      const json = await res.json()
      const data = json.data ?? json

      if (!res.ok) {
        setError(json.error?.message || data.error || 'Something went wrong')
        return
      }
      if (data.redirect_url) {
        window.location.href = data.redirect_url
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

  const previewAmount =
    customAmountInput && !Number.isNaN(parseInt(customAmountInput, 10))
      ? Math.max(MIN_AMOUNT, parseInt(customAmountInput, 10))
      : amount
  const discountedPreview =
    appliedCoupon && appliedCoupon.discount_percent < 100
      ? Math.max(
          MIN_AMOUNT,
          Math.round(previewAmount * (1 - appliedCoupon.discount_percent / 100))
        )
      : previewAmount
  const allocPreview = calculateFundAllocationRounded(discountedPreview, tier)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[#2d3748] bg-[#0f1419] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {es ? 'Patrocinar — ' : 'Sponsor — '}
            {tierLabel}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {marketTitle && (
          <p className="mb-4 text-sm text-slate-400">
            {es ? 'Mercado:' : 'Market:'} {marketTitle}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {es ? 'Monto (MXN) *' : 'Amount (MXN) *'}
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAmount(MIN_AMOUNT)
                  setCustomAmountInput('')
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  amount === MIN_AMOUNT && !customAmountInput
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                100 (name only)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmount(tierPrice)
                  setCustomAmountInput('')
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  amount === tierPrice && !customAmountInput
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-600 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {tierPrice.toLocaleString()} (logo + features)
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={MIN_AMOUNT}
                value={
                  customAmountInput || (amount === tierPrice || amount === MIN_AMOUNT ? '' : amount)
                }
                onChange={(e) => {
                  const v = e.target.value
                  setCustomAmountInput(v)
                  const n = parseInt(v, 10)
                  if (!Number.isNaN(n) && n >= MIN_AMOUNT) setAmount(n)
                }}
                placeholder={tierPrice.toString()}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-500">MXN</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {es ? 'Mín. 100 MXN. Monto personalizado permitido.' : 'Min 100 MXN. Custom amount supported.'}
            </p>
          </div>

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
              {es ? 'Sitio web / red social' : 'Website / Social URL'}
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

          <div className="mt-1">
            <label className="mb-1 block text-sm font-medium text-slate-400">
              {es ? 'Código de descuento' : 'Discount code'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoComplete="off"
                placeholder={es ? 'Código de descuento' : 'Discount code'}
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
                  a causas; el resto apoya la operación de la plataforma.
                </>
              ) : (
                <>
                  Estimated from this amount (after est. processing fees):{' '}
                  <span className="font-medium text-emerald-300/90">
                    ~{allocPreview.fundAmountRounded.toLocaleString()} MXN
                  </span>{' '}
                  to community causes; remainder supports platform operations.
                </>
              )}
            </p>
          </div>

          {marketTitle && (
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
              <p className="mb-2 text-xs text-slate-500">
                {es ? 'Vista previa: tarjeta de mercado' : 'Preview: Your sponsored market card'}
              </p>
              <div className="rounded-lg bg-[#0f1419] p-3 text-sm">
                <p className="line-clamp-2 font-medium text-white">{marketTitle}</p>
                <p className="mt-1 text-xs text-emerald-400">
                  {es ? 'Patrocinado por [Tu marca]' : 'Sponsored by [Your Brand]'}
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            {es ? 'Pago seguro con Stripe' : 'Payment secured by Stripe'}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 py-2.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
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
                    : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
