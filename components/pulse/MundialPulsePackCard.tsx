'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PULSE_TIERS } from '@/lib/pulse-tiers'
import { PulseCheckoutModal } from '@/components/pulse/PulseCheckoutModal'

type Props = {
  locale: 'es' | 'en'
}

/**
 * Pricing card for the Mundial Pulse Pack (5 Pulses). Single regular SKU —
 * the founding/50%-off offer was retired in Oct 2026.
 */
export function MundialPulsePackCard({ locale }: Props) {
  const es = locale === 'es'
  const [open, setOpen] = useState(false)

  const pack = PULSE_TIERS.mundial_pack
  const name = es ? pack.name : pack.nameEn
  const features = es ? pack.featuresEs : pack.featuresEn

  return (
    <>
      <section
        id="pulse-mundial-pack"
        className="scroll-mt-24 border-t border-white/10 px-4 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {es ? 'Paquete Mundial' : 'Mundial Pack'}
            </span>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{name}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-400">
              {es
                ? '5 Pulses, presencia destacada en plataforma, y 20% de cada peso al Fondo Consciente.'
                : '5 Pulses, featured platform presence, and 20% of every peso to the Conscious Fund.'}
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <div className="relative flex flex-col rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-[#1a2029] to-emerald-950/10 p-6 shadow-lg shadow-emerald-900/20">
              <h3 className="text-lg font-bold text-white">{name}</h3>
              <p className="mt-1 text-3xl font-bold text-emerald-400">
                ${pack.priceMXN.toLocaleString()} MXN
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {es ? '~$2,500 USD · pago único' : '~$2,500 USD · one-time'}
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                {es ? 'Reservar mi espacio' : 'Reserve my spot'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {open && (
        <PulseCheckoutModal
          isOpen
          onClose={() => setOpen(false)}
          tier="mundial_pack"
          tierLabel={name}
          locale={locale}
        />
      )}
    </>
  )
}
