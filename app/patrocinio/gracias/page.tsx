import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cookies } from 'next/headers'
import { CheckCircle2 } from 'lucide-react'

const Footer = dynamic(() => import('@/components/Footer'))

export const metadata: Metadata = {
  title: 'Gracias · Patrocinio comunitario | Crowd Conscious',
  robots: { index: false, follow: false },
}

/** Success page after a Patrocinio comunitario card donation (Stripe Checkout). */
export default async function DonationThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  // Locale chosen on the donation form travels in success_url (?lang=); cookie is the fallback.
  const { lang } = await searchParams
  const store = await cookies()
  const es = lang === 'en' ? false : lang === 'es' ? true : store.get('preferred-language')?.value !== 'en'
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e2e8f0]">
      <section className="px-4 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#047857]/50 bg-[#111821] p-6 text-center shadow-2xl shadow-emerald-900/30 sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#6ee7b7]" />
          <h1 className="mt-4 text-3xl font-bold text-[#ffffff] sm:text-4xl">
            {es ? '¡Gracias por tu aportación!' : 'Thank you for your contribution!'}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[#cbd5e1]">
            {es
              ? 'Tu pago se procesó con Stripe. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente, y la comunidad vota qué causas lo reciben.'
              : 'Your payment was processed by Stripe. Card fees are deducted; the rest goes to the Conscious Fund, and the community votes on which causes receive it.'}
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#a3b1c2]">
            {es
              ? 'Si dejaste tu correo, te enviamos un comprobante de aportación. No es factura ni comprobante fiscal, y no es deducible de impuestos.'
              : 'If you left your email, we sent you a contribution confirmation. It is not a tax invoice and not tax-deductible.'}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/predictions/fund"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#047857] px-6 py-3 text-base font-semibold text-[#ffffff] hover:bg-[#065f46]"
            >
              {es ? 'Ver el Fondo y votar causas' : 'See the Fund and vote on causes'}
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#3b4757] bg-[#1a2029] px-6 py-3 text-base font-medium text-[#e2e8f0] hover:border-emerald-400/60"
            >
              {es ? 'Volver al inicio' : 'Back to home'}
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
