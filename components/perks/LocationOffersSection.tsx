'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gift, Loader2, Lock, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase-client'
import { offerDescription, offerTitle } from '@/lib/perks/offer-status'
import { PERKS_COPY, spendErrorMessage } from '@/lib/perks/i18n'
import type { PublicOfferRow } from '@/lib/perks/types'
import type { SpendXpErrorCode } from '@/lib/perks/xp-spend'
import { tierConfigs } from '@/lib/tier-config'

type Balance = {
  spendable: number
  tier: number
}

export default function LocationOffersSection({ slug }: { slug: string }) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  const [offers, setOffers] = useState<PublicOfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOffers = useCallback(async () => {
    const res = await fetch(`/api/locations/${encodeURIComponent(slug)}/offers`)
    const json = (await res.json()) as { offers?: PublicOfferRow[] }
    setOffers(json.offers ?? [])
  }, [slug])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      await loadOffers()
      if (cancelled) return
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadOffers])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser()
      if (cancelled) return
      setAuthed(Boolean(user))
      if (!user) {
        setBalance(null)
        return
      }
      const res = await fetch('/api/gamification/xp', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as {
        success?: boolean
        data?: { xp?: { total_xp?: number; total_xp_spent?: number; current_tier?: number } }
      }
      if (!json.success || !json.data?.xp) return
      const total = json.data.xp.total_xp ?? 0
      const spent = (json.data.xp as { total_xp_spent?: number }).total_xp_spent ?? 0
      setBalance({
        spendable: Math.max(0, total - spent),
        tier: json.data.xp.current_tier ?? 1,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const redeem = async (offerId: string) => {
    setRedeemingId(offerId)
    setError(null)
    try {
      const res = await fetch('/api/perks/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: offerId }),
      })
      const json = (await res.json()) as {
        error?: string
        code?: SpendXpErrorCode
        redemption?: { redemption_code: string }
      }
      if (!res.ok) {
        const code = json.code ?? 'unknown'
        setError(json.error ?? spendErrorMessage(code, locale))
        return
      }
      const code = json.redemption?.redemption_code
      if (code) {
        router.push(`/perks/redeem/${encodeURIComponent(code)}`)
      }
    } catch {
      setError(locale === 'es' ? 'Error de red' : 'Network error')
    } finally {
      setRedeemingId(null)
    }
  }

  if (loading) {
    return (
      <div className="mb-8 flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {locale === 'es' ? 'Cargando perks…' : 'Loading perks…'}
      </div>
    )
  }

  return (
    <section className="mb-8 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
      <div className="mb-4 flex items-start gap-3">
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-white">{PERKS_COPY.sectionTitle[locale]}</h2>
          <p className="text-sm text-slate-400">{PERKS_COPY.sectionLede[locale]}</p>
          {balance != null && (
            <p className="mt-1 text-sm text-emerald-400/90">
              {locale === 'es' ? 'XP disponible:' : 'Spendable XP:'}{' '}
              <span className="font-semibold">{balance.spendable}</span>
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {offers.length === 0 ? (
        <p className="text-sm text-slate-500">{PERKS_COPY.noOffers[locale]}</p>
      ) : (
        <ul className="space-y-4">
          {offers.map((offer) => {
            const title = offerTitle(offer, locale)
            const desc = offerDescription(offer, locale)
            const tierOk = !offer.min_tier || (balance?.tier ?? 0) >= offer.min_tier
            const xpOk = balance != null && balance.spendable >= offer.xp_cost
            const canRedeem = authed && tierOk && xpOk && redeemingId !== offer.id

            let disabledReason: string | null = null
            if (!authed) disabledReason = PERKS_COPY.loginToRedeem[locale]
            else if (!tierOk) disabledReason = PERKS_COPY.tierLocked[locale]
            else if (balance != null && !xpOk) disabledReason = PERKS_COPY.insufficientXp[locale]

            return (
              <li
                key={offer.id}
                className="rounded-lg border border-[#2d3748] bg-[#0f1419]/60 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    {desc ? <p className="mt-1 text-sm text-slate-400">{desc}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        {offer.xp_cost} {PERKS_COPY.xpCost[locale]}
                      </span>
                      {offer.min_tier ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5" />
                          {PERKS_COPY.tierRequired[locale]}:{' '}
                          {tierConfigs[offer.min_tier]?.name ?? offer.min_tier}
                        </span>
                      ) : null}
                      {offer.stock_remaining != null ? (
                        <span>
                          {offer.stock_remaining} {PERKS_COPY.stockLeft[locale]}
                        </span>
                      ) : (
                        <span>{PERKS_COPY.unlimited[locale]}</span>
                      )}
                    </div>
                  </div>
                  {authed === false ? (
                    <Link
                      href={`/login?redirectTo=${encodeURIComponent(`/locations/${slug}`)}`}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      {PERKS_COPY.loginToRedeem[locale]}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={!canRedeem}
                      onClick={() => void redeem(offer.id)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      title={disabledReason ?? undefined}
                    >
                      {redeemingId === offer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        PERKS_COPY.redeem[locale]
                      )}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
