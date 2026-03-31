import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import PulseListingView from '@/components/pulse/PulseListingView'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
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

export default async function PredictionsPulsePage() {
  const ctx = await getPulseListingContext()
  const markets = await fetchPulseMarketsForListing(ctx)
  return (
    <PulseListingView
      variant="shell"
      locale={ctx.locale}
      markets={markets}
      isAdmin={ctx.isAdmin}
      sponsorCompanyName={ctx.sponsorAccount?.company_name ?? null}
    />
  )
}
