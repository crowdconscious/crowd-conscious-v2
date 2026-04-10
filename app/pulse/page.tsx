import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'
import PulseListingView from '@/components/pulse/PulseListingView'
import { PulseLandingExplainer } from '@/components/pulse/PulseLandingExplainer'
import { PulsePricingSection } from '@/components/pulse/PulsePricingSection'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
import { fetchPulseHeroHighlight } from '@/lib/pulse/pulse-hero-data'
import { getPulseListingCopy } from '@/lib/i18n/pulse-listing'

const Footer = dynamic(() => import('@/components/Footer'))

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getPulseListingCopy(locale)
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: 'Conscious Pulse — Medición de sentimiento en tiempo real',
      description: t.ogDescription,
    },
  }
}

export default async function PulseListingPage() {
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
      <section id="pulse-consultations" className="scroll-mt-24 px-4 pb-8 pt-4">
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
