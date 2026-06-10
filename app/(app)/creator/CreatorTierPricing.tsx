'use client'

import { useState } from 'react'
import { Check, Tag } from 'lucide-react'
import { inputBaseClass } from '@/components/ui/input'
import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'
import { validateCreatorPrice, type SponsorshipTier } from '@/lib/sponsorship-tiers'

export type TierPricingItem = {
  tier: SponsorshipTier
  price: number
  enabled: boolean
  min: number
  max: number
  default: number
  currency: string
}

type Props = {
  locale: CreatorLocale
  items: TierPricingItem[]
}

type RowState = { price: string; enabled: boolean }

export default function CreatorTierPricing({ locale, items }: Props) {
  const t = getCreatorCopy(locale)

  const tierMeta: Record<SponsorshipTier, { label: string; desc: string }> = {
    support: { label: t.tierSupportLabel, desc: t.tierSupportDesc },
    sponsor: { label: t.tierSponsorLabel, desc: t.tierSponsorDesc },
    featured: { label: t.tierFeaturedLabel, desc: t.tierFeaturedDesc },
  }

  const [rows, setRows] = useState<Record<SponsorshipTier, RowState>>(() => {
    const initial = {} as Record<SponsorshipTier, RowState>
    for (const item of items) {
      initial[item.tier] = { price: String(Math.round(item.price)), enabled: item.enabled }
    }
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const fmtMoney = (n: number, currency: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)

  const update = (tier: SponsorshipTier, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }))
    setSaved(false)
    setError('')
  }

  const save = async () => {
    setError('')
    // Client-side range validation mirrors the server enforcement.
    for (const item of items) {
      const row = rows[item.tier]
      if (!row.enabled) continue
      const check = validateCreatorPrice(Number(row.price), {
        tier: item.tier,
        minPrice: item.min,
        maxPrice: item.max,
        defaultPrice: item.default,
        currency: item.currency,
      })
      if (!check.ok) {
        setError(t.tierSettingsErrorRange)
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/creator/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tiers: items.map((item) => ({
            tier: item.tier,
            price: Number(rows[item.tier].price) || 0,
            enabled: rows[item.tier].enabled,
          })),
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { code?: string }
        }
        setError(
          json.error?.code === 'TIER_PRICE_OUT_OF_RANGE'
            ? t.tierSettingsErrorRange
            : t.tierSettingsErrorGeneric
        )
        return
      }
      setSaved(true)
    } catch {
      setError(t.tierSettingsErrorGeneric)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="tier-pricing" className="scroll-mt-24 rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Tag className="h-4 w-4" /> {t.tierSettingsTitle}
      </h2>
      <p className="mt-1 text-xs text-slate-500">{t.tierSettingsIntro}</p>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const row = rows[item.tier]
          const meta = tierMeta[item.tier]
          return (
            <div
              key={item.tier}
              className={`rounded-lg border p-4 transition-opacity ${
                row.enabled
                  ? 'border-[#2d3748] bg-[#0f1419]/60'
                  : 'border-dashed border-[#2d3748]/80 bg-[#0f1419]/30'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className={`min-w-0 ${row.enabled ? '' : 'opacity-60'}`}>
                  <p className="font-medium text-white">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{meta.desc}</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => update(item.tier, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-600 bg-[#0f1419] text-emerald-500 focus:ring-emerald-500"
                  />
                  {t.tierSettingsOffer}
                </label>
              </div>

              <div className={`mt-3 ${row.enabled ? '' : 'opacity-60'}`}>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {t.tierSettingsPrice}
                </label>
                <input
                  className={inputBaseClass}
                  value={row.price}
                  onChange={(e) =>
                    update(item.tier, { price: e.target.value.replace(/[^0-9]/g, '') })
                  }
                  inputMode="numeric"
                  disabled={!row.enabled}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t.tierSettingsRange(fmtMoney(item.min, item.currency), fmtMoney(item.max, item.currency))}
                  {' · '}
                  {t.tierSettingsDefault(fmtMoney(item.default, item.currency))}
                </p>
              </div>
              {!row.enabled && (
                <p className="mt-2 text-xs font-medium text-emerald-400/80">
                  {t.tierSettingsActivateHint}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? t.tierSettingsSaving : t.tierSettingsSave}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5" /> {t.tierSettingsSaved}
          </span>
        )}
      </div>
    </section>
  )
}
