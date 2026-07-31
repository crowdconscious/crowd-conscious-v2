import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import nextDynamic from 'next/dynamic'
import PulseListingView from '@/components/pulse/PulseListingView'
import {
  fetchResolvedPulseMarketsForListing,
  getPulseListingContext,
} from '@/lib/pulse/pulse-listing-data'
import { getPulseListingCopy } from '@/lib/i18n/pulse-listing'

export const dynamic = 'force-dynamic'

const Footer = nextDynamic(() => import('@/components/Footer'))

/**
 * /pulse/results — public archive of resolved Pulses (no auth gate).
 *
 * Mirrors /pulse (LandingNav layout, public data) but lists Pulses that have
 * closed and been resolved, so anyone can browse historical community outcomes.
 * Marketing ground per CLAUDE.md — SEO/OG metadata matters.
 */

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getPulseListingCopy(locale)
  return {
    title: t.resultsMetaTitle,
    description: t.resultsMetaDescription,
    alternates: { canonical: '/pulse/results' },
    openGraph: {
      title: t.resultsMetaTitle,
      description: t.resultsMetaDescription,
      url: '/pulse/results',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.resultsMetaTitle,
      description: t.resultsMetaDescription,
    },
  }
}

export default async function PulseResultsPage() {
  const ctx = await getPulseListingContext()
  const markets = await fetchResolvedPulseMarketsForListing()
  const t = getPulseListingCopy(ctx.locale)

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {t.resultsBadge}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t.resultsTitle}</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">{t.resultsSubtitle}</p>
        </header>

        <PulseListingView
          variant="public"
          listOnly
          locale={ctx.locale}
          markets={markets}
          isAdmin={ctx.isAdmin}
          sponsorCompanyName={null}
        />
      </main>

      <Footer />
    </div>
  )
}
