'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gift, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase-client'
import { offerDescription, offerTitle } from '@/lib/perks/offer-status'
import { PERKS_COPY, spendErrorMessage } from '@/lib/perks/i18n'
import type { PublicOfferRow } from '@/lib/perks/types'
import type { SpendXpErrorCode } from '@/lib/perks/xp-spend'


export default function LocationOffersSection({ slug }: { slug: string }) {
  const { language } = useLanguage()
  const locale = language
  const router = useRouter()
  const [offers, setOffers] = useState<PublicOfferRow[]>([])
  const [loading, setLoading] = useState(true)
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
            // Modelo Consciente: perks are open to everyone — no XP/tier gating shown.
            const canRedeem = Boolean(authed) && redeemingId !== offer.id

            let disabledReason: string | null = null
            if (!authed) disabledReason = PERKS_COPY.loginToRedeem[locale]

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
