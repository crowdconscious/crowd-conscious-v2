import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import LandingNav from '@/app/components/landing/LandingNav'
import Footer from '@/components/Footer'
import PulseListingView from '@/components/pulse/PulseListingView'
import { PulseProductSections } from '@/components/pulse/PulseProductSections'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
import { fetchPulseHeroHighlight } from '@/lib/pulse/pulse-hero-data'
import { getPulseListingCopy } from '@/lib/i18n/pulse-listing'

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getPulseListingCopy(locale)
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: 'Conscious Pulse',
      description: t.ogDescription,
    },
  }
}

export default async function PulseListingPage() {
  const ctx = await getPulseListingContext()
  const [markets, hero] = await Promise.all([
    fetchPulseMarketsForListing(ctx),
    fetchPulseHeroHighlight(),
  ])
  const localeShort: 'es' | 'en' = ctx.locale === 'en' ? 'en' : 'es'
  const allConsult = localeShort === 'es' ? 'Todas las consultas' : 'All consultations'

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <LandingNav />
      <PulseProductSections
        locale={localeShort}
        activePulseMarket={hero.market}
        avgConfidence={hero.avgConfidence}
      />

      <section id="pulse-consultations" className="scroll-mt-24 px-4 pb-8">
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

      <Footer />
    </div>
  )
}
