'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { PULSE_TIERS } from '@/lib/pulse-tiers'
import { PulseCheckoutModal } from '@/components/pulse/PulseCheckoutModal'
import { daysUntilWorldCup } from '@/lib/world-cup-kickoff'

type Props = {
  locale: 'es' | 'en'
}

type SpotsResponse = {
  founding_total: number
  founding_taken: number
  founding_remaining: number
}

/**
 * Hero pricing card for the Mundial Pulse Pack. Renders BOTH the regular
 * $50,000 SKU and the discounted "Founding Sponsor" $25,000 SKU side by side
 * so a prospect sees the discount and the urgency in the same scan.
 *
 * Founding-spot scarcity is fetched live from /api/pulse/mundial-spots so the
 * count is never stale by more than ~60s.
 */
export function MundialPulsePackCard({ locale }: Props) {
  const es = locale === 'es'
  const [openTier, setOpenTier] = useState<'mundial_pack' | 'mundial_pack_founding' | null>(null)
  const [spots, setSpots] = useState<SpotsResponse | null>(null)
  const [days, setDays] = useState<number>(() => daysUntilWorldCup())

  useEffect(() => {
    let aborted = false
    fetch('/api/pulse/mundial-spots')
      .then((r) => r.json())
      .then((data: SpotsResponse) => {
        if (!aborted) setSpots(data)
      })
      .catch(() => {
        // Non-fatal: card still renders the canonical 5-spot ceiling.
      })
    return () => {
      aborted = true
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setDays(daysUntilWorldCup()), 60_000)
    return () => clearInterval(id)
  }, [])

  const regular = PULSE_TIERS.mundial_pack
  const founding = PULSE_TIERS.mundial_pack_founding
  const remaining = spots?.founding_remaining ?? 5
  const total = spots?.founding_total ?? 5

  const regularName = es ? regular.name : regular.nameEn
  const foundingName = es ? founding.name : founding.nameEn
  const regularFeatures = es ? regular.featuresEs : regular.featuresEn
  const foundingFeatures = es ? founding.featuresEs : founding.featuresEn

  return (
    <>
      <section
        id="pulse-mundial-pack"
        className="scroll-mt-24 border-t border-white/10 px-4 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              {es ? 'Edición Mundial 2026' : 'World Cup 2026 Edition'}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              {es ? 'Mundial Pulse Pack' : 'World Cup Pulse Pack'}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              {es
                ? '5 Pulses durante el torneo, presencia destacada en plataforma, y 40% de cada peso al Fondo Consciente.'
                : '5 Pulses across the tournament, featured platform presence, and 40% of every peso to the Conscious Fund.'}
            </p>
            <p className="mt-2 text-sm text-amber-400">
              {es ? `Faltan ${days} días para la inauguración` : `${days} days until kickoff`}
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {/* Founding Sponsor — first 5, 50% off */}
            <div className="relative flex flex-col rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-[#1a2029] to-amber-950/10 p-6 shadow-lg shadow-amber-900/20">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-slate-900">
                {es ? 'Founding · 50% OFF' : 'Founding · 50% OFF'}
              </span>
              <h3 className="text-lg font-bold text-white">{foundingName}</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-amber-400">
                  ${founding.priceMXN.toLocaleString()} MXN
                </p>
                <p className="text-sm text-slate-500 line-through">
                  ${regular.priceMXN.toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {es ? '~$1,250 USD · pago único' : '~$1,250 USD · one-time'}
              </p>

              <p className="mt-3 text-sm font-semibold text-amber-300">
                {remaining > 0
                  ? es
                    ? `Solo quedan ${remaining} de ${total} espacios`
                    : `Only ${remaining} of ${total} spots left`
                  : es
                    ? 'Todos los espacios fundadores están tomados'
                    : 'All founding spots are taken'}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {foundingFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={remaining <= 0}
                onClick={() => setOpenTier('mundial_pack_founding')}
                className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {remaining > 0
                  ? es
                    ? 'Reservar mi espacio fundador'
                    : 'Claim my founding spot'
                  : es
                    ? 'Lista de espera'
                    : 'Join waitlist'}
              </button>
            </div>

            {/* Regular Mundial Pulse Pack */}
            <div className="relative flex flex-col rounded-2xl border border-emerald-500/30 bg-[#1a2029] p-6">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                {es ? 'Edición Mundial' : 'World Cup Edition'}
              </span>
              <h3 className="text-lg font-bold text-white">{regularName}</h3>
              <p className="mt-1 text-3xl font-bold text-emerald-400">
                ${regular.priceMXN.toLocaleString()} MXN
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {es ? '~$2,500 USD · ~$10,000 MXN por Pulse' : '~$2,500 USD · ~$10,000 MXN per Pulse'}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {es
                  ? '5 Pulses durante todo el Mundial — sin lista de espera.'
                  : '5 Pulses across the entire World Cup — no waitlist.'}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {regularFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setOpenTier('mundial_pack')}
                className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {es ? 'Reservar mi espacio' : 'Reserve my spot'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {openTier && (
        <PulseCheckoutModal
          isOpen
          onClose={() => setOpenTier(null)}
          tier={openTier}
          tierLabel={openTier === 'mundial_pack_founding' ? foundingName : regularName}
          locale={locale}
        />
      )}
    </>
  )
}
