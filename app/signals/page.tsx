import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  fetchInitialSignals,
  getSignalsLocale,
  getStage1Threshold,
} from '@/lib/signals/list'
import { getCitizenSignalsCopy } from '@/lib/i18n/citizen-signals'
import SignalsFeed from '@/components/signals/SignalsFeed'

export const dynamic = 'force-dynamic'

function flagOn(): boolean {
  return process.env.SIGNALS_ENABLED === 'true'
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSignalsLocale()
  const t = getCitizenSignalsCopy(locale)
  return {
    title: t.meta.title,
    description: t.meta.description,
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
    },
  }
}

export default async function SignalsFeedPage() {
  if (!flagOn()) notFound()

  const locale = await getSignalsLocale()
  const t = getCitizenSignalsCopy(locale)
  const { signals, lookups, nextCursor } = await fetchInitialSignals()
  const stage1Threshold = getStage1Threshold()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="mb-8 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
          {t.nav.brand} · {t.nav.beta}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          {t.feed.heroTitle}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">{t.feed.heroSubtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/signals/nueva"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            {t.feed.ctaPrimary}
          </Link>
          <Link
            href="/signals/acerca"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 font-medium text-slate-200 transition-colors hover:border-emerald-500/40"
          >
            {t.landing.ctaSecondary}
          </Link>
        </div>
      </header>

      <SignalsFeed
        locale={locale}
        initialSignals={signals}
        initialLookups={lookups}
        initialNextCursor={nextCursor}
        stage1Threshold={stage1Threshold}
      />
    </main>
  )
}
