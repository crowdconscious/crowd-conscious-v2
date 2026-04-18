import type { Metadata } from 'next'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/seo/site'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import type { Database } from '@/types/database'
import LandingNav from '@/app/components/landing/LandingNav'
import Footer from '@/components/Footer'
import { CreateLiveEventPanel } from '@/components/live/CreateLiveEventPanel'
import { LiveEventsBrowser } from '@/components/live/LiveEventsBrowser'
import { LiveProductSections } from '@/components/live/LiveProductSections'
import { daysUntilWorldCup } from '@/lib/world-cup-kickoff'
import { loadLiveEventStats } from '@/lib/live/event-stats'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    absolute: 'Conscious Live — Predicciones en Vivo | Mundial 2026',
  },
  description:
    'Predice en vivo durante partidos del Mundial 2026. Votación en tiempo real, leaderboard y transmisión en vivo.',
  openGraph: {
    title: 'Conscious Live — Predicciones en Vivo | Mundial 2026',
    description:
      'Predice en vivo, sube en el leaderboard y genera impacto. Transmisión + votación en tiempo real.',
    url: `${SITE_URL}/live`,
  },
  alternates: {
    canonical: `${SITE_URL}/live`,
    languages: {
      'es-MX': `${SITE_URL}/live`,
      'en-US': `${SITE_URL}/live`,
    },
  },
}

type LiveEventRow = Database['public']['Tables']['live_events']['Row']

function partitionEvents(rows: LiveEventRow[]) {
  const now = Date.now()
  const liveNow: LiveEventRow[] = []
  const upcoming: LiveEventRow[] = []
  const past: LiveEventRow[] = []

  for (const e of rows) {
    if (e.status === 'cancelled') continue
    const t = new Date(e.match_date).getTime()
    if (e.status === 'live') {
      liveNow.push(e)
    } else if (e.status === 'scheduled') {
      if (t >= now) upcoming.push(e)
      else past.push(e)
    } else {
      past.push(e)
    }
  }

  /**
   * Dedupe near-duplicates that slipped through the admin UI (e.g. two
   * "México vs Portugal" rows on the same day). Key by normalized
   * team names + YYYY-MM-DD — keep the most recently updated.
   */
  function keyOf(e: LiveEventRow) {
    const a = (e.team_a_name ?? '').trim().toLowerCase()
    const b = (e.team_b_name ?? '').trim().toLowerCase()
    const day = new Date(e.match_date).toISOString().slice(0, 10)
    return a && b ? `${a}__${b}__${day}` : `id:${e.id}`
  }

  function dedupe(list: LiveEventRow[]): LiveEventRow[] {
    const byKey = new Map<string, LiveEventRow>()
    for (const e of list) {
      const k = keyOf(e)
      const prev = byKey.get(k)
      if (!prev) {
        byKey.set(k, e)
        continue
      }
      const a = new Date(e.updated_at ?? e.created_at ?? 0).getTime()
      const b = new Date(prev.updated_at ?? prev.created_at ?? 0).getTime()
      if (a > b) byKey.set(k, e)
    }
    return [...byKey.values()]
  }

  const liveDedup = dedupe(liveNow)
  const upcomingDedup = dedupe(upcoming)
  const pastDedup = dedupe(past)

  liveDedup.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  upcomingDedup.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  pastDedup.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())

  return { liveNow: liveDedup, upcoming: upcomingDedup, past: pastDedup }
}

export default async function LiveEventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const sessionProfile = await getCurrentUser()

  let isAdmin = false
  if (sessionProfile) {
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const profileEmail = sessionProfile.email?.toLowerCase().trim()
    isAdmin =
      sessionProfile.user_type === 'admin' ||
      (!!adminEmail && !!profileEmail && profileEmail === adminEmail)
  }

  /** Admins can opt into archived events with `?showArchived=1`. */
  const sp = (await searchParams) ?? {}
  const showArchivedParam = Array.isArray(sp.showArchived)
    ? sp.showArchived[0]
    : sp.showArchived
  const showArchived = isAdmin && showArchivedParam === '1'

  let q = supabase.from('live_events').select('*').order('match_date', { ascending: false })
  if (!showArchived) q = q.is('archived_at', null)
  const { data, error } = await q

  const h = await headers()
  const accept = h.get('accept-language') || ''
  const locale = accept.toLowerCase().includes('en') ? 'en' : 'es'
  const localeShort: 'es' | 'en' = locale === 'es' ? 'es' : 'en'

  const rows = (data ?? []) as LiveEventRow[]
  const { liveNow, upcoming, past } = partitionEvents(rows)
  const dWc = daysUntilWorldCup()

  const visibleIds = [...liveNow, ...upcoming, ...past].map((e) => e.id)
  const stats = await loadLiveEventStats(visibleIds)

  const t = {
    empty: locale === 'es' ? 'No hay eventos por ahora.' : 'No events yet.',
    emptyAdminHint:
      locale === 'es'
        ? 'Como administrador, usa el formulario de arriba para crear el primer evento.'
        : 'As an admin, use the form above to create your first event.',
    emptyCta: locale === 'es' ? 'Ver mercados' : 'Browse markets',
    error: locale === 'es' ? 'No se pudieron cargar los eventos.' : 'Could not load events.',
  }

  return (
    <div className="min-h-screen bg-cc-bg text-cc-text-primary">
      <LandingNav />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20">
        <LiveProductSections locale={localeShort} daysUntilWc={dWc} />

        {isAdmin && <CreateLiveEventPanel locale={locale === 'es' ? 'es' : 'en'} />}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {t.error}
          </p>
        )}

        {!error && rows.length === 0 ? (
          <div className="mb-10 rounded-xl border border-cc-border bg-cc-card px-6 py-10 text-center">
            <div className="mb-4 flex justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Trophy className="h-8 w-8 text-emerald-400" aria-hidden />
              </span>
            </div>
            <p className="text-cc-text-secondary">{t.empty}</p>
            <Link
              href="/markets"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-cc-border bg-cc-bg px-6 py-2.5 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
            >
              ← {t.emptyCta}
            </Link>
            {isAdmin && <p className="mt-6 text-sm text-cc-text-muted">{t.emptyAdminHint}</p>}
          </div>
        ) : !error ? (
          <LiveEventsBrowser
            locale={localeShort}
            liveNow={liveNow}
            upcoming={upcoming}
            past={past}
            stats={stats}
            isAdmin={isAdmin}
            showArchived={showArchived}
          />
        ) : null}
      </div>
      <Footer />
    </div>
  )
}
