'use client'

import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'
import {
  SPONSOR_TIERS,
  calculateFundAllocationRounded,
  type SponsorTierId,
} from '@/lib/sponsor-tiers'

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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP, GIF)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB')
      return
    }
    setError('')
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const res = await fetch('/api/sponsor/upload-logo', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      const data = json.data ?? json
      if (!res.ok) {
        setError(data.error?.message || data.error || 'Failed to upload logo')
        setLogoPreview(null)
        setLogoFile(null)
        return
      }
      setLogoUrl(data.url || '')
    } catch {
      setError('Failed to upload logo')
      setLogoPreview(null)
      setLogoFile(null)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let finalLogoUrl = logoUrl
      if (logoFile && !logoUrl && !uploadingLogo) {
        setError('Please wait for logo upload to complete')
        setLoading(false)
        return
      }
      const amountMxn = customAmountInput ? parseInt(customAmountInput, 10) : amount
      const finalAmount = Number.isNaN(amountMxn) || amountMxn < MIN_AMOUNT ? tierPrice : amountMxn

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
  const allocPreview = calculateFundAllocationRounded(previewAmount, tier)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Sponsor Now — {tierLabel}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {marketTitle && (
          <p className="mb-4 text-sm text-slate-400">Market: {marketTitle}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Amount (MXN) *</label>
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
            <p className="mt-1 text-xs text-slate-500">Min 100 MXN. Custom amount supported.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Name / Company *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="Your name or company"
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
            <label className="mb-1 block text-sm font-medium text-slate-400">Website / Social URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Logo (optional)</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleLogoChange}
                className="hidden"
              />
              {logoPreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-16 rounded-lg border border-slate-600 bg-slate-800 object-contain"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-400">
                      {uploadingLogo ? 'Uploading...' : 'Logo uploaded'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview(null)
                        setLogoUrl('')
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="mt-1 text-sm text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? 'Uploading...' : 'Upload image'}
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Max 2MB. JPEG, PNG, WebP, GIF.</p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <p className="font-medium text-emerald-400">
              Up to {fundPct}% → Conscious Fund
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Estimated from this amount (after est. processing fees):{' '}
              <span className="font-medium text-emerald-300/90">
                ~{allocPreview.fundAmountRounded.toLocaleString()} MXN
              </span>{' '}
              to community causes; remainder supports platform operations.
            </p>
          </div>

          {marketTitle && (
            <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-3">
              <p className="mb-2 text-xs text-slate-500">Preview: Your sponsored market card</p>
              <div className="rounded-lg bg-slate-900 p-3 text-sm">
                <p className="line-clamp-2 font-medium text-white">{marketTitle}</p>
                <p className="mt-1 text-xs text-emerald-400">Sponsored by [Your Brand]</p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">Payment secured by Stripe</p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-600 py-2.5 text-slate-300 transition-colors hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-emerald-600 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Redirecting...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
