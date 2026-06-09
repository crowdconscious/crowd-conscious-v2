'use client'

import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { inputBaseClass } from '@/components/ui/input'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { fundPreview, type SponsorshipTier } from '@/lib/sponsorship-tiers'

export type TierOption = {
  tier: SponsorshipTier
  price: number
  currency: string
  /** True when the price falls back to the platform default (no creator row). */
  isPlatformDefault: boolean
  defaultPrice: number
}

type Props = {
  postId: string
  refParam: string | null
  locale: CreatorLocale
  tierOptions: TierOption[]
}

export default function BlogSponsorCheckoutForm({
  postId,
  refParam,
  locale,
  tierOptions,
}: Props) {
  const t = getCreatorCopy(locale)
  const es = locale === 'es'

  const tierMeta: Record<SponsorshipTier, { label: string; desc: string }> = {
    support: { label: t.tierSupportLabel, desc: t.tierSupportDesc },
    sponsor: { label: t.tierSponsorLabel, desc: t.tierSponsorDesc },
    featured: { label: t.tierFeaturedLabel, desc: t.tierFeaturedDesc },
  }

  const [selectedTier, setSelectedTier] = useState<SponsorshipTier>(
    tierOptions.find((o) => o.tier === 'sponsor')?.tier ?? tierOptions[0]?.tier ?? 'sponsor'
  )
  const [topUp, setTopUp] = useState('')
  const [sponsorName, setSponsorName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [email, setEmail] = useState('')
  const [supporterMessage, setSupporterMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedOption =
    tierOptions.find((o) => o.tier === selectedTier) ?? tierOptions[0]
  const currency = selectedOption?.currency ?? 'MXN'
  const isLogoTier = selectedTier === 'sponsor' || selectedTier === 'featured'

  const fmtMoney = useMemo(
    () => (n: number) =>
      new Intl.NumberFormat(es ? 'es-MX' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(n),
    [es, currency]
  )

  const topUpNum = (() => {
    const n = Number(topUp)
    return Number.isFinite(n) && n > 0 ? n : 0
  })()
  const gross = (selectedOption?.price ?? 0) + topUpNum
  const fundAmount = fundPreview(gross)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!sponsorName.trim() || !email.trim()) {
      setError(t.sponsorErrorRequired)
      return
    }
    if (isLogoTier && !targetUrl.trim()) {
      setError(t.sponsorErrorRequired)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/sponsor/blog/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          tier: selectedTier,
          top_up_amount: topUpNum,
          sponsor_name: sponsorName.trim(),
          sponsor_logo_url: isLogoTier ? logoUrl.trim() || undefined : undefined,
          target_url: isLogoTier ? targetUrl.trim() || undefined : undefined,
          sponsor_email: email.trim(),
          supporter_message:
            selectedTier === 'support' ? supporterMessage.trim() || undefined : undefined,
          ref: refParam || undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        data?: { url?: string }
        error?: { message?: string } | string
        url?: string
      }
      const url = json.data?.url ?? json.url
      if (!res.ok || !url) {
        throw new Error(t.sponsorErrorGeneric)
      }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t.sponsorErrorGeneric)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      {/* Tier picker */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-white">
          {t.sponsorTierPickerTitle}
        </legend>
        <div className="space-y-2">
          {tierOptions.map((option) => {
            const active = option.tier === selectedTier
            const meta = tierMeta[option.tier]
            return (
              <button
                type="button"
                key={option.tier}
                onClick={() => setSelectedTier(option.tier)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-[#2d3748] bg-[#1a2029] hover:border-emerald-600/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                  }`}
                >
                  {active && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-white">{meta.label}</span>
                    <span className="text-sm font-semibold text-emerald-300">
                      {fmtMoney(option.price)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">{meta.desc}</span>
                  {option.isPlatformDefault && (
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {t.sponsorTierPlatformPrice}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Brand name (all tiers — disclosure requires a sponsor name) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {t.sponsorBrandName}
        </label>
        <input
          className={inputBaseClass}
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      {/* Support tier → moderated shout-out (no logo) */}
      {selectedTier === 'support' && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            {t.sponsorSupporterMessage}
          </label>
          <textarea
            className={`${inputBaseClass} min-h-[80px]`}
            value={supporterMessage}
            onChange={(e) => setSupporterMessage(e.target.value)}
            maxLength={280}
          />
          <p className="mt-1 text-xs text-slate-500">{t.sponsorSupporterMessageHint}</p>
        </div>
      )}

      {/* Logo tiers → logo + target URL */}
      {isLogoTier && (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.sponsorLogoUrl}
            </label>
            <input
              className={inputBaseClass}
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              type="url"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              {t.sponsorTargetUrl}
            </label>
            <input
              className={inputBaseClass}
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              type="url"
              placeholder="https://..."
              required
            />
          </div>
        </>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {t.sponsorContactEmail}
        </label>
        <input
          className={inputBaseClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
      </div>

      {/* Optional top-up */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">
          {t.sponsorTopUp}
        </label>
        <input
          className={inputBaseClass}
          value={topUp}
          onChange={(e) => setTopUp(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          placeholder="0"
        />
        <p className="mt-1 text-xs text-slate-500">{t.sponsorTopUpHint}</p>
      </div>

      {/* Total + live Conscious Fund preview */}
      <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">{t.sponsorTotalLabel}</span>
          <span className="text-lg font-bold text-white">{fmtMoney(gross)}</span>
        </div>
        <p className="mt-1 text-right text-xs font-medium text-emerald-300">
          {t.sponsorFundPreview(fmtMoney(fundAmount))}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading ? t.sponsorRedirecting : t.sponsorContinue}
      </button>
      <p className="text-center text-xs text-slate-500">{t.sponsorSecureNote}</p>
    </form>
  )
}
