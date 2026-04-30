import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'
import { PilotCheckoutForm } from './PilotCheckoutForm'

const Footer = dynamic(() => import('@/components/Footer'))

export const metadata: Metadata = {
  title: 'Pilot Pulse — $1,500 MXN · Crowd Conscious',
  description:
    'Una pregunta. Siete días. Resultados reales. Prueba Conscious Pulse antes de comprometerte con un plan completo.',
  openGraph: {
    title: 'Pilot Pulse — $1,500 MXN',
    description: 'Una pregunta · 7 días · resultados reales con confianza ponderada.',
  },
}

export default async function PilotPulsePage() {
  const cookieStore = await cookies()
  const locale: 'es' | 'en' =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const es = locale === 'es'

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
        <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
          {es ? 'Trial · Pilot Pulse' : 'Trial · Pilot Pulse'}
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {es
            ? '¿Quieres saber qué piensa tu comunidad?'
            : 'Want to know what your community thinks?'}
        </h1>
        <p className="mt-3 text-lg text-slate-300">
          {es
            ? 'Una pregunta. 7 días. Resultados reales — con confianza ponderada, no encuestas planas.'
            : 'One question. 7 days. Real results — confidence-weighted, not flat surveys.'}
        </p>

        <ul className="mt-6 space-y-2 text-sm text-slate-300">
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            {es ? '1 pregunta, 2–4 opciones' : '1 question, 2–4 options'}
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            {es
              ? 'Dashboard de resultados en vivo + link compartible'
              : 'Live results dashboard + shareable link'}
          </li>
          <li className="flex gap-2">
            <span className="text-emerald-400">✓</span>
            {es
              ? 'Pago único — sin suscripción, sin renovación automática'
              : 'One-time payment — no subscription, no auto-renewal'}
          </li>
        </ul>

        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-[#1a2029] p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-white">
              {es ? 'Activar mi Pulse piloto' : 'Activate my Pilot Pulse'}
            </h2>
            <p className="text-3xl font-bold text-emerald-400">$1,500 MXN</p>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {es ? '~$75 USD · pago único' : '~$75 USD · one-time'}
          </p>

          <PilotCheckoutForm locale={locale} />
        </div>

        <div className="mt-10 text-center text-sm text-slate-400">
          {es ? '¿Necesitas más?' : 'Need more?'}{' '}
          <a href="/pulse#pulse-pricing" className="text-emerald-400 hover:underline">
            {es ? 'Ver planes completos →' : 'See full plans →'}
          </a>
        </div>
      </main>
      <Footer />
    </div>
  )
}
