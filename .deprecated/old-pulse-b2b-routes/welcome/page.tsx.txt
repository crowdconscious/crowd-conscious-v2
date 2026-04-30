import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { calculatePulseFundAllocationRounded, normalizePulseTierId } from '@/lib/pulse-tiers'
import { createAdminClient } from '@/lib/supabase-admin'

const Footer = dynamic(() => import('@/components/Footer'))

async function getWelcomeData(sessionId: string | undefined) {
  if (!sessionId) return null
  try {
    const { getStripe } = await import('@/app/api/webhooks/stripe/lib/stripe-webhook-utils')
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return { sessionId, paid: false as const }

    const metadata = session.metadata || {}
    const productType = String(metadata.product_type || '')
    const isPulseProduct = productType === 'pulse' || productType === 'pulse_addon'

    const tier =
      metadata.tier && productType === 'pulse'
        ? normalizePulseTierId(metadata.tier as string)
        : null
    const amountMXN = session.amount_total ? session.amount_total / 100 : undefined
    const alloc =
      tier && amountMXN != null ? calculatePulseFundAllocationRounded(amountMXN, tier) : null

    const email = (
      session.customer_details?.email ||
      session.customer_email ||
      (metadata.contact_email as string) ||
      ''
    )
      .trim()
      .toLowerCase()

    let dashboardUrl: string | null = null
    if (email) {
      const admin = createAdminClient()
      const { data: acc } = await admin
        .from('sponsor_accounts')
        .select('access_token')
        .eq('contact_email', email)
        .maybeSingle()
      if (acc?.access_token) {
        dashboardUrl = `/dashboard/sponsor/${acc.access_token}`
      }
    }

    return {
      sessionId,
      paid: true as const,
      companyName: metadata.company_name as string | undefined,
      tier,
      amountMXN,
      fundPct: alloc ? Math.round(alloc.fundPercent * 100) : undefined,
      isPulseProduct,
      productType,
      dashboardUrl,
    }
  } catch {
    return { sessionId, paid: false as const }
  }
}

export default async function PulseWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const cookieStore = await cookies()
  const en = cookieStore.get('preferred-language')?.value === 'en'
  const sessionId = params.session_id
  const data = sessionId ? await getWelcomeData(sessionId) : null

  const t = {
    title: en
      ? 'Welcome! Your Conscious Pulse account is active.'
      : '¡Bienvenido! Tu cuenta de Conscious Pulse está activa.',
    sub: en
      ? 'Save your private dashboard link — bookmark it for quick access.'
      : 'Guarda este enlace — es tu acceso privado al panel.',
    ctaDash: en ? 'Open your dashboard →' : 'Accede a tu panel →',
    ctaPulse: en ? 'Back to Conscious Pulse' : 'Volver a Conscious Pulse',
    ctaMarkets: en ? 'Browse markets' : 'Ver mercados',
    next: en ? 'What happens next' : 'Qué sigue',
    emailLine: en
      ? 'You will receive a confirmation email with next steps.'
      : 'Recibirás un correo de confirmación con los siguientes pasos.',
    fundLine:
      data && 'fundPct' in data && data.fundPct != null
        ? en
          ? `${data.fundPct}% of estimated net from your payment supports the Conscious Fund.`
          : `El ${data.fundPct}% estimado del neto de tu pago apoya al Fondo Consciente.`
        : en
          ? 'A portion of your payment supports the Conscious Fund (by tier).'
          : 'Una parte de tu pago apoya al Fondo Consciente (según plan).',
    private: en ? 'Private access URL' : 'URL de acceso privado',
  }

  const showDash = data && 'paid' in data && data.paid && data.dashboardUrl

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="px-4 pb-16 pt-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white md:text-4xl">{t.title}</h1>
          <p className="mb-2 text-lg text-slate-400">
            {data && 'companyName' in data && data.companyName ? (
              <>
                {en ? 'Registered for ' : 'Registrado para '}
                <strong className="text-white">{data.companyName}</strong>.
              </>
            ) : (
              <>{t.emailLine}</>
            )}
          </p>
          <p className="text-sm text-amber-400/90">{t.sub}</p>

          {showDash && data.dashboardUrl ? (
            <div className="mt-8 rounded-xl border border-emerald-500/30 bg-[#1a2029] p-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.private}</p>
              <Link
                href={data.dashboardUrl}
                className="mt-2 break-all text-emerald-400 hover:underline"
              >
                {typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
                  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${data.dashboardUrl}`
                  : data.dashboardUrl}
              </Link>
              <Link
                href={data.dashboardUrl}
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                {t.ctaDash}
              </Link>
            </div>
          ) : null}

          <div className="mt-8 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 text-left text-sm text-slate-400">
            <h2 className="mb-2 font-semibold text-white">{t.next}</h2>
            <ul className="space-y-2">
              <li>• {t.emailLine}</li>
              <li>• {t.fundLine}</li>
              {data && 'tier' in data && data.tier ? (
                <li>
                  • {en ? 'Plan: ' : 'Plan: '}
                  <span className="text-slate-200">{data.tier}</span>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/pulse"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-500"
            >
              {t.ctaPulse}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/markets"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-6 py-3 font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              {t.ctaMarkets}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
