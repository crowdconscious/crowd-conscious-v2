import type { Metadata } from 'next'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cookies } from 'next/headers'
import { HeartHandshake } from 'lucide-react'
import PulseListingView from '@/components/pulse/PulseListingView'
import { PulseLandingExplainer } from '@/components/pulse/PulseLandingExplainer'
import { PulsePricingSection } from '@/components/pulse/PulsePricingSection'
import { MundialPulseHero } from '@/components/pulse/MundialPulseHero'
import { MundialPulsePackCard } from '@/components/pulse/MundialPulsePackCard'
import { ClubResetCaseStudyCard } from '@/components/pulse/ClubResetCaseStudyCard'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
import { fetchPulseHeroHighlight } from '@/lib/pulse/pulse-hero-data'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * /patrocinio — Patrocinio comunitario (B2C). Hosts the community Pulse and
 * sponsor offers that used to live on /para-marcas, reframed as direct
 * support for the Fondo Consciente. Companies measuring their own users go
 * to /organizaciones instead. Checkouts (api/pulse/checkout,
 * /para-marcas/pilot, sponsor webhooks) are unchanged.
 *
 * TODO(patrocinio): consider a GoFundMe-style campaign feature here
 * (public goal, progress bar, many small backers per cause) on top of the
 * Fondo Consciente, instead of fixed sponsor tiers.
 */

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies()
  const es = store.get('preferred-language')?.value !== 'en'
  const title = es ? 'Patrocinio comunitario | Crowd Conscious' : 'Community sponsorship | Crowd Conscious'
  const description = es
    ? 'Patrocina consultas comunitarias y apoya directamente al Fondo Consciente, que financia causas que vota la comunidad.'
    : 'Sponsor community consultations and directly support the Conscious Fund, which finances causes the community votes on.'
  return {
    title,
    description,
    alternates: { canonical: '/patrocinio' },
    openGraph: { title, description, url: '/patrocinio', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PatrocinioPage() {
  const ctx = await getPulseListingContext()
  const locale: 'es' | 'en' = ctx.locale === 'en' ? 'en' : 'es'
  const es = locale === 'es'
  const [markets, heroData] = await Promise.all([fetchPulseMarketsForListing(ctx), fetchPulseHeroHighlight()])
  const { market: heroMarket, avgConfidence, strongOpinions } = heroData

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <section className="px-4 pt-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[#1a2029] to-[#1a2029] p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-emerald-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {es ? 'Patrocinio comunitario' : 'Community sponsorship'}
            </p>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-4xl">
            {es ? 'Apoya a la comunidad y al Fondo Consciente.' : 'Support the community and the Conscious Fund.'}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            {es
              ? 'Patrocina una consulta pública de la comunidad. Tu marca aparece junto a la pregunta y una parte de cada patrocinio va directo al Fondo Consciente, que financia causas que la comunidad vota.'
              : 'Sponsor a public community consultation. Your brand appears next to the question and part of every sponsorship goes straight to the Conscious Fund, which finances causes the community votes on.'}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            {es ? '¿Quieres medir la satisfacción de tus propios usuarios? ' : 'Want to measure your own users’ satisfaction? '}
            <Link href="/organizaciones" className="font-semibold text-emerald-400 hover:underline">
              {es ? 'Crowd Conscious para organizaciones →' : 'Crowd Conscious for organizations →'}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/predictions/fund" className="text-emerald-400 hover:underline">
              {es ? 'Ver el Fondo Consciente' : 'See the Conscious Fund'}
            </Link>
            <Link href="/para-marcas/pilot?source=patrocinio" className="text-slate-400 hover:text-emerald-400 hover:underline">
              {es ? 'Pulse de prueba para negocios locales' : 'Trial Pulse for local businesses'}
            </Link>
          </div>
        </div>
      </section>

      <MundialPulseHero locale={locale} />

      <section id="pulse-consultations" className="scroll-mt-24 px-4 pb-8 pt-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-xl font-bold text-white sm:text-2xl">
            {es ? 'Consultas de la comunidad' : 'Community consultations'}
          </h2>
          <PulseListingView
            variant="public"
            listOnly
            locale={ctx.locale}
            markets={markets}
            isAdmin={ctx.isAdmin}
            sponsorCompanyName={ctx.sponsorAccount?.company_name ?? null}
          />
        </div>
      </section>

      <MundialPulsePackCard locale={locale} />
      <ClubResetCaseStudyCard locale={locale} />
      <PulseLandingExplainer locale={locale} heroMarket={heroMarket} avgConfidence={avgConfidence} strongOpinions={strongOpinions} />
      <PulsePricingSection locale={locale} />
      <Footer />
    </div>
  )
}
