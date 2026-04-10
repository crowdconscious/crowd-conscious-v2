'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { PULSE_TIERS, type PulseTierId } from '@/lib/pulse-tiers'
import { PulseCheckoutModal } from '@/components/pulse/PulseCheckoutModal'

const CONTACT_EMAIL = 'comunidad@crowdconscious.app'

type CheckoutTier = Exclude<PulseTierId, 'enterprise'>

type Props = {
  locale: 'es' | 'en'
}

export function PulsePricingSection({ locale }: Props) {
  const es = locale === 'es'
  const L = (a: string, b: string) => (es ? a : b)
  const [modalTier, setModalTier] = useState<CheckoutTier | null>(null)
  const [modalLabel, setModalLabel] = useState('')

  const tiers: { id: PulseTierId; checkout: boolean }[] = [
    { id: 'pulse_unico', checkout: true },
    { id: 'pulse_pack', checkout: true },
    { id: 'suscripcion', checkout: true },
    { id: 'enterprise', checkout: false },
  ]

  return (
    <>
      <section id="pulse-pricing" className="scroll-mt-24 border-t border-white/10 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
            {L('Precios', 'Pricing')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
            {L(
              'Elige el plan que encaja con tu investigación. Todos incluyen impacto al Fondo Consciente.',
              'Pick the plan that fits your research. All include Conscious Fund impact.'
            )}
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {tiers.map(({ id, checkout }) => {
              const t = PULSE_TIERS[id]
              const name = es ? t.name : t.nameEn
              const priceLabel =
                t.contactOnly || t.priceMXN <= 0
                  ? L('A medida', 'Custom')
                  : `$${t.priceMXN.toLocaleString()} MXN`
              const subPrice =
                id === 'suscripcion'
                  ? L('~$1,000 USD / mes', '~$1,000 USD / mo')
                  : id === 'pulse_unico'
                    ? L('~$250 USD', '~$250 USD')
                    : id === 'pulse_pack'
                      ? L('~$600 USD', '~$600 USD')
                      : ''
              const features = es ? t.featuresEs : t.featuresEn
              const bestFor = es ? t.bestForEs : t.bestForEn
              const popular = 'popular' in t && t.popular

              return (
                <div
                  key={id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    popular
                      ? 'border-emerald-500/50 bg-[#1a2029] shadow-lg shadow-emerald-900/20'
                      : 'border-[#2d3748] bg-[#1a2029]'
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white">
                      {L('Más popular', 'Most popular')}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white">{name}</h3>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">{priceLabel}</p>
                  {subPrice ? <p className="text-xs text-slate-500">{subPrice}</p> : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {es ? t.durationLabelEs : t.durationLabelEn}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                    {features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-500">
                    {L('Ideal para: ', 'Best for: ')}
                    {bestFor}
                  </p>
                  {checkout ? (
                    <button
                      type="button"
                      onClick={() => {
                        setModalTier(id as CheckoutTier)
                        setModalLabel(name)
                      }}
                      className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      {L('Comprar', 'Purchase')}
                    </button>
                  ) : (
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
                        'Conscious Pulse — Enterprise'
                      )}`}
                      className="mt-6 block w-full rounded-xl border border-slate-600 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      {L('Contactar', 'Contact us')}
                    </a>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-12 rounded-xl border border-dashed border-white/20 bg-[#1a2029]/50 p-6 text-center">
            <p className="text-slate-300">{L('¿Tienes un código de acceso?', 'Have an access code?')}</p>
            <p className="mt-2 text-sm text-slate-500">
              {L(
                'Baja a la sección de canje debajo de las consultas activas o canjea desde el checkout.',
                'Use the redeem section below active consultations, or apply at checkout.'
              )}
            </p>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-slate-500">{L('¿Preguntas?', 'Questions?')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </section>

      {modalTier && (
        <PulseCheckoutModal
          isOpen
          onClose={() => setModalTier(null)}
          tier={modalTier}
          tierLabel={modalLabel}
          locale={locale}
        />
      )}
    </>
  )
}
