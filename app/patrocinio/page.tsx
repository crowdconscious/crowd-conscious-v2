import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cookies } from 'next/headers'
import { ArrowRight, Building2, Eye, HandHeart, HeartHandshake, Vote } from 'lucide-react'
import { DonationForm } from './DonationForm'
import { fetchConsciousFundBalanceMxn } from '@/lib/conscious-fund-balance'
import { createAdminClient } from '@/lib/supabase-admin'

const Footer = dynamic(() => import('@/components/Footer'))

export const revalidate = 300

/**
 * /patrocinio — Patrocinio comunitario (B2C): direct support for the Fondo
 * Consciente by individuals and the community. No brand Pulse sponsorship,
 * Pulse packs or Mundial pricing here (retired Oct 2026); companies go to
 * /organizaciones. Legacy sponsor checkout endpoints and webhooks are kept
 * server-side for existing records but are no longer linked from marketing.
 *
 * Donations: card checkout via /api/patrocinio/checkout (Stripe Checkout);
 * the webhook records them and credits the Fondo net of card fees. Numbers shown are live (fund balance, verified causes);
 * nothing is invented — sections hide when data is empty.
 */

type CauseRow = {
  id: string
  slug: string | null
  name: string
  organization: string | null
  category: string | null
  short_description: string | null
  city: string | null
}

async function fetchVerifiedCauses(): Promise<CauseRow[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('fund_causes')
      .select('id, slug, name, organization, category, short_description, city')
      .eq('active', true)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(3)
    return (data as CauseRow[] | null) ?? []
  } catch {
    return []
  }
}

async function getLocale(): Promise<'es' | 'en'> {
  const store = await cookies()
  return store.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

export async function generateMetadata(): Promise<Metadata> {
  const es = (await getLocale()) === 'es'
  const title = es ? 'Patrocinio comunitario | Crowd Conscious' : 'Community sponsorship | Crowd Conscious'
  const description = es
    ? 'Apoya directamente al Fondo Consciente. La comunidad vota qué causas reciben los recursos.'
    : 'Directly support the Conscious Fund. The community votes on which causes receive the funds.'
  return {
    title,
    description,
    alternates: { canonical: '/patrocinio' },
    openGraph: { title, description, url: '/patrocinio', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PatrocinioPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelado?: string; lang?: string }>
}) {
  const sp = await searchParams
  const locale = sp?.lang === 'en' || sp?.lang === 'es' ? sp.lang : await getLocale()
  const es = locale === 'es'
  const [balance, causes] = await Promise.all([fetchConsciousFundBalanceMxn(), fetchVerifiedCauses()])

  const fmt = new Intl.NumberFormat(es ? 'es-MX' : 'en-US', { maximumFractionDigits: 0 })

  const steps = es
    ? [
        { icon: HandHeart, title: 'Tú apoyas', body: 'Aportas con tarjeta. Se descuentan las comisiones de la tarjeta; el resto va al Fondo Consciente. No compras publicidad ni consultas.' },
        { icon: Vote, title: 'La comunidad vota', body: 'Quienes participan en Crowd Conscious eligen qué causas verificadas reciben los recursos.' },
        { icon: Eye, title: 'Todo a la vista', body: 'El saldo del fondo y su distribución se publican en la página del Fondo Consciente.' },
      ]
    : [
        { icon: HandHeart, title: 'You give', body: 'You give by card. Card fees are deducted; the rest goes to the Conscious Fund. You are not buying ads or consultations.' },
        { icon: Vote, title: 'The community votes', body: 'People who take part in Crowd Conscious choose which verified causes receive the funds.' },
        { icon: Eye, title: 'Everything in the open', body: 'The fund balance and its distribution are published on the Conscious Fund page.' },
      ]

  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e2e8f0]">
      {/* Hero */}
      <section className="px-4 pb-10 pt-10 md:px-8 md:pt-14">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#047857]/50 bg-[#111821] shadow-2xl shadow-emerald-900/30">
          <div className="grid grid-cols-1 gap-10 p-5 sm:p-8 md:p-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#6ee7b7]">
                <HeartHandshake className="h-3.5 w-3.5" />
                {es ? 'Patrocinio comunitario' : 'Community sponsorship'}
              </p>
              <h1 className="mt-5 text-3xl font-bold leading-tight text-[#ffffff] sm:text-4xl md:text-5xl">
                {es ? 'Apoya causas reales. La comunidad decide a cuáles.' : 'Back real causes. The community decides which.'}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#cbd5e1] sm:text-lg">
                {es
                  ? 'El Patrocinio comunitario es un apoyo directo al Fondo Consciente: un fondo común que financia causas verificadas elegidas por votación de la comunidad.'
                  : 'Community sponsorship is direct support for the Conscious Fund: a shared fund that finances verified causes chosen by community vote.'}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#apoyar"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#047857] px-6 py-3 text-base font-semibold text-[#ffffff] shadow-lg shadow-emerald-900/40 transition-colors hover:bg-[#065f46] lg:hidden"
                >
                  <HandHeart className="h-4 w-4" />
                  {es ? 'Aportar ahora' : 'Give now'}
                </a>
                <Link
                  href="/predictions/fund"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#3b4757] bg-[#1a2029] px-6 py-3 text-base font-medium text-[#e2e8f0] transition-colors hover:border-emerald-400/60"
                >
                  {es ? 'Ver el Fondo Consciente' : 'See the Conscious Fund'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              <DonationForm locale={locale} cancelled={sp?.cancelado === '1'} />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-[#ffffff] sm:text-3xl">
            {es ? 'Cómo funciona' : 'How it works'}
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl border border-[#2d3748] bg-[#151b23] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#047857]/25 text-[#6ee7b7]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-[#a3b1c2]">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#ffffff]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#cbd5e1]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Live fund card — real balance only. */}
      <section className="px-4 py-6 md:px-8">
        <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-[#2d3748] bg-[#0b1016] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#a3b1c2]">
                  {es ? 'Fondo Consciente · saldo actual' : 'Conscious Fund · current balance'}
                </p>
                {balance > 0 ? (
                  <p className="mt-2 text-4xl font-bold text-[#ffffff] sm:text-5xl">
                    ${fmt.format(balance)} <span className="text-lg font-semibold text-[#a3b1c2]">MXN</span>
                  </p>
                ) : (
                  <p className="mt-2 text-2xl font-bold leading-snug text-[#ffffff]">
                    {es ? 'Tu apoyo puede ser de los primeros.' : 'Your support can be among the first.'}
                  </p>
                )}
                <div className="mt-5 space-y-3 border-t border-[#2d3748] pt-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#34d399]" />
                    <p className="text-sm text-[#cbd5e1]">
                      {es ? 'Patrocinio comunitario: tu aportación, menos comisiones de tarjeta, entra al fondo.' : 'Community sponsorship: your contribution, minus card fees, goes into the fund.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6ee7b7]" />
                    <p className="text-sm text-[#cbd5e1]">
                      {es
                        ? 'Organizaciones: el 20% de cada contrato, antes de IVA, también entra al fondo.'
                        : 'Organizations: 20% of every contract, before VAT, also goes into the fund.'}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#fcd34d]" />
                    <p className="text-sm text-[#cbd5e1]">
                      {es ? 'La comunidad vota qué causas lo reciben.' : 'The community votes on which causes receive it.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
      </section>

      {/* Verified causes — live, hidden when empty */}
      {causes.length > 0 ? (
        <section className="px-4 py-10 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-bold text-[#ffffff] sm:text-3xl">
                {es ? 'Causas verificadas' : 'Verified causes'}
              </h2>
              <Link href="/predictions/fund" className="text-sm font-semibold text-[#6ee7b7] hover:underline">
                {es ? 'Ver todas y votar →' : 'See all and vote →'}
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {causes.map((c) => (
                <li key={c.id} className="min-w-0 rounded-2xl border border-[#2d3748] bg-[#151b23] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6ee7b7]">
                    {[c.category, c.city].filter(Boolean).join(' · ') || (es ? 'Causa' : 'Cause')}
                  </p>
                  <h3 className="mt-2 break-words text-base font-semibold text-[#ffffff]">{c.name}</h3>
                  {c.organization ? <p className="mt-0.5 text-sm text-[#a3b1c2]">{c.organization}</p> : null}
                  {c.short_description ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#cbd5e1]">{c.short_description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Final CTA */}
      <section className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#047857]/50 bg-gradient-to-br from-[#047857]/20 via-[#111821] to-[#111821] p-6 text-center sm:p-10">
          <h2 className="text-2xl font-bold text-[#ffffff] sm:text-3xl">
            {es ? '¿Te sumas?' : 'Will you join?'}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#cbd5e1]">
            {es
              ? 'Cualquier aportación cuenta. Paga con tarjeta en un minuto; se descuentan las comisiones de la tarjeta y el resto va al Fondo Consciente.'
              : 'Every contribution counts. Pay by card in a minute; card fees are deducted and the rest goes to the Conscious Fund.'}
          </p>
          <a
            href="#apoyar"
            className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#047857] px-6 py-3 text-base font-semibold text-[#ffffff] transition-colors hover:bg-[#065f46]"
          >
            <HandHeart className="h-4 w-4" />
            {es ? 'Aportar ahora' : 'Give now'}
          </a>
        </div>
      </section>

      {/* One clear line for companies */}
      <section className="px-4 pb-16 pt-4 md:px-8">
        <p className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-2 text-center text-sm text-[#cbd5e1] sm:flex-row">
          <Building2 className="h-4 w-4 shrink-0 text-[#6ee7b7]" />
          <span>
            {es ? '¿Eres una empresa o institución? ' : 'Are you a company or institution? '}
            <Link href="/organizaciones" className="font-semibold text-[#6ee7b7] underline-offset-2 hover:underline">
              {es ? 'Conoce Organizaciones →' : 'See Organizations →'}
            </Link>
          </span>
        </p>
      </section>

      <Footer />
    </div>
  )
}
