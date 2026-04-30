import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'
import PulseListingView from '@/components/pulse/PulseListingView'
import { PulseLandingExplainer } from '@/components/pulse/PulseLandingExplainer'
import { PulsePricingSection } from '@/components/pulse/PulsePricingSection'
import { MundialPulseHero } from '@/components/pulse/MundialPulseHero'
import { MundialPulsePackCard } from '@/components/pulse/MundialPulsePackCard'
import { ClubResetCaseStudyCard } from '@/components/pulse/ClubResetCaseStudyCard'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
import { fetchPulseHeroHighlight } from '@/lib/pulse/pulse-hero-data'
import { getPulseListingCopy } from '@/lib/i18n/pulse-listing'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * /para-marcas — B2B landing for the Conscious Pulse product.
 *
 * Functionally identical to the previous /pulse page (which is now a
 * consumer-only Pulse listing). Hosts the hero, pricing, case studies,
 * and the in-page Pulse list as social proof. The pricing section retains
 * its #pulse-pricing anchor so existing CTAs continue to deep-link.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getPulseListingCopy(locale)
  const pageTitle =
    locale === 'es' ? 'Para marcas | Crowd Conscious' : 'For brands | Crowd Conscious'
  const description =
    locale === 'es'
      ? 'Conscious Pulse: lanza consultas con confianza ponderada y mide el sentimiento de tu comunidad en tiempo real. Pack Mundial 2026 disponible.'
      : 'Conscious Pulse: launch confidence-weighted consultations and measure your community’s sentiment in real time. World Cup 2026 pack available.'
  return {
    title: pageTitle,
    description,
    openGraph: {
      title: pageTitle,
      description: t.ogDescription,
    },
  }
}

export default async function ParaMarcasLandingPage() {
  const ctx = await getPulseListingContext()
  const localeShort: 'es' | 'en' = ctx.locale === 'en' ? 'en' : 'es'
  const [markets, heroData] = await Promise.all([
    fetchPulseMarketsForListing(ctx),
    fetchPulseHeroHighlight(),
  ])
  const { market: heroMarket, avgConfidence, strongOpinions } = heroData
  const allConsult = localeShort === 'es' ? 'Todas las consultas' : 'All consultations'

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <MundialPulseHero locale={localeShort} />

      <section id="pulse-consultations" className="scroll-mt-24 px-4 pb-8 pt-10">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-xl font-bold text-white sm:text-2xl">{allConsult}</h2>
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

      <MundialPulsePackCard locale={localeShort} />

      <ClubResetCaseStudyCard locale={localeShort} />

      <PulseLandingExplainer
        locale={localeShort}
        heroMarket={heroMarket}
        avgConfidence={avgConfidence}
        strongOpinions={strongOpinions}
      />

      <PulsePricingSection locale={localeShort} />

      <Footer />
    </div>
  )
}
