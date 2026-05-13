import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import SignalsFeed from '@/components/signals/SignalsFeed'

const Footer = dynamic(() => import('@/components/Footer'))

/**
 * /signals — public Citizen Signals feed.
 *
 * Server-renders the first page from the citizen_signals_public view so
 * SEO and first paint don't depend on the client API call. The client
 * component takes over for filters + pagination.
 *
 * Feature-flagged on SIGNALS_ENABLED: when off, this route 404s so the
 * surface doesn't leak before launch.
 */

const PAGE_SIZE = 20

function readLocale(c: { get: (k: string) => { value?: string } | undefined }): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

export async function generateMetadata(): Promise<Metadata> {
  if (process.env.SIGNALS_ENABLED !== 'true') return {}
  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
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
  if (process.env.SIGNALS_ENABLED !== 'true') {
    notFound()
  }

  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createSignalsAdminClient()
  const { data: initialRows } = await admin
    .from('citizen_signals_public')
    .select(
      'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, display_name, anonymous_display_mode, threshold_stage, cosign_count, stage1_met_at, stage2_met_at, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  // Hydrate target + location names in a single round-trip each so the
  // feed cards can render rich labels without N round-trips per row.
  const targetIds = Array.from(new Set((initialRows ?? []).map((r) => r.citizen_target_id)))
  const locationIds = Array.from(new Set((initialRows ?? []).map((r) => r.conscious_location_id)))

  const [{ data: targets }, { data: locations }] = await Promise.all([
    targetIds.length > 0
      ? admin
          .from('citizen_targets')
          .select('id, slug, display_name, target_kind')
          .in('id', targetIds)
      : Promise.resolve({ data: [] }),
    locationIds.length > 0
      ? admin
          .from('conscious_locations')
          .select('id, slug, name, neighborhood, city')
          .in('id', locationIds)
      : Promise.resolve({ data: [] }),
  ])

  const targetMap = new Map((targets ?? []).map((t) => [t.id, t]))
  const locationMap = new Map((locations ?? []).map((l) => [l.id, l]))

  const enriched = (initialRows ?? []).map((row) => ({
    ...row,
    target: targetMap.get(row.citizen_target_id) ?? null,
    location: locationMap.get(row.conscious_location_id) ?? null,
  }))

  const initialNextCursor =
    enriched.length === PAGE_SIZE ? enriched[enriched.length - 1].created_at : null

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {t.nav.brand}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {t.feed.heroTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            {t.feed.heroSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signals/nueva"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              {t.feed.ctaPrimary}
            </Link>
            <Link
              href="#feed"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-[#2d3748] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-emerald-400 hover:text-white"
            >
              {t.feed.ctaSecondary}
            </Link>
          </div>
        </header>

        <section id="feed">
          <SignalsFeed
            locale={locale}
            initialSignals={enriched}
            initialNextCursor={initialNextCursor}
          />
        </section>
      </main>

      <Footer />
    </div>
  )
}
