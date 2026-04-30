import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'
import PulseListingView from '@/components/pulse/PulseListingView'
import { fetchPulseMarketsForListing, getPulseListingContext } from '@/lib/pulse/pulse-listing-data'
import { getPulseListingCopy } from '@/lib/i18n/pulse-listing'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * /pulse — consumer Pulse listing (formerly the B2B landing).
 *
 * The B2B landing moved to /para-marcas. /pulse is now the public, consumer-
 * facing list of every active and recent Pulse: voters land here from the
 * nav, from a Pulse share link with the back-button, from /markets (legacy
 * alias), and from the marketing pages. Pulse share URLs (/pulse/[id]) are
 * unchanged.
 *
 * Functionally this is a public mirror of the in-shell view at
 * /predictions/pulse — same component, same data, same admin/sponsor
 * affordances — wrapped in the LandingNav layout instead of the auth shell.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getPulseListingCopy(locale)
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: 'Conscious Pulse — Resultados en vivo',
      description: t.ogDescription,
    },
  }
}

export default async function PulseListingPage() {
  const ctx = await getPulseListingContext()
  const markets = await fetchPulseMarketsForListing(ctx)

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <PulseListingView
          variant="public"
          listOnly
          locale={ctx.locale}
          markets={markets}
          isAdmin={ctx.isAdmin}
          sponsorCompanyName={ctx.sponsorAccount?.company_name ?? null}
        />
      </main>

      <Footer />
    </div>
  )
}
