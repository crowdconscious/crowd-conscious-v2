'use client'

import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'

type Tier = 'market' | 'category' | 'impact' | 'patron'

const TIER_PRICES_MXN: Record<string, number> = {
  market: 2000,
  category: 10000,
  impact: 50000,
}

interface SponsorCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  tier: Tier
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
  const tierPrice = TIER_PRICES_MXN[tier] ?? 2000
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
      // If user selected a file but upload hasn't completed, wait for it
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
    } catch (err) {
      setError('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Sponsor Now — {tierLabel}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {marketTitle && (
          <p className="text-slate-400 text-sm mb-4">Market: {marketTitle}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Amount (MXN) *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setAmount(MIN_AMOUNT); setCustomAmountInput('') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  amount === MIN_AMOUNT && !customAmountInput
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-600'
                }`}
              >
                100 (name only)
              </button>
              <button
                type="button"
                onClick={() => { setAmount(tierPrice); setCustomAmountInput('') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  amount === tierPrice && !customAmountInput
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-600'
                }`}
              >
                {tierPrice.toLocaleString()} (logo + features)
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={MIN_AMOUNT}
                value={customAmountInput || (amount === tierPrice || amount === MIN_AMOUNT ? '' : amount)}
                onChange={(e) => {
                  const v = e.target.value
                  setCustomAmountInput(v)
                  const n = parseInt(v, 10)
                  if (!Number.isNaN(n) && n >= MIN_AMOUNT) setAmount(n)
                }}
                placeholder={tierPrice.toString()}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-slate-500 text-sm">MXN</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Min 100 MXN. Custom amount supported.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Name / Company *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Your name or company"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Website / Social URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Logo (optional)
            </label>
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
                    className="w-16 h-16 object-contain rounded-lg border border-slate-600 bg-slate-800"
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
                        fileInputRef.current?.value && (fileInputRef.current.value = '')
                      }}
                      className="text-sm text-red-400 hover:text-red-300 mt-1"
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
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Uploading...' : 'Upload image'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Max 2MB. JPEG, PNG, WebP, GIF.</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors"
            >
              {loading ? 'Redirecting...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
