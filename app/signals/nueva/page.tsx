import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  getCitizenSignalsCopy,
  SIGNAL_TARGET_KINDS,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import { CDMX_ALCALDIA_SLUGS } from '@/lib/signals/cdmx-alcaldias'
import ComposeWizard, {
  type ComposeTarget,
  type ComposeLocation,
} from '@/components/signals/ComposeWizard'

const Footer = dynamic(() => import('@/components/Footer'))

export const dynamicParams = false
export const revalidate = 0

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

/**
 * /signals/nueva — authenticated compose wizard.
 *
 * Loads the target + location options server-side so the user gets an
 * instant first paint. The wizard then drives POST /api/signals from the
 * client side via fetch.
 *
 * Step 3 of the wizard is a TWO-STAGE location picker:
 *   1. Pick an alcaldía (the broad bucket). We always hydrate the picker
 *      from the 16 CDMX alcaldías seeded by
 *      scripts/seed-conscious-locations-cdmx.ts. SIGNALS_ALLOWED_LOCATION_IDS
 *      does NOT narrow this list — the alcaldía is the citizen's anchor
 *      and must always be available, even in a pilot polygon.
 *   2. Optionally refine: pick a "partner" location inside that alcaldía,
 *      type a street/landmark, or skip. Partner locations are every
 *      other active `conscious_locations` row (i.e. not the 16 alcaldías).
 *
 * Known limitation: the schema does not yet have a parent-child link
 * from a partner location to its alcaldía, so we pass ALL active
 * non-alcaldía CDMX rows to the wizard and let the client filter by
 * neighborhood/city text match against the selected alcaldía. The API
 * intentionally does NOT enforce parent-alcaldía match either; see the
 * TODO(signals-precision) comment in app/api/signals/route.ts.
 */
export default async function SignalsComposePage() {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const user = await getCurrentUser()
  if (!user) {
    // Login page reads `?redirect=` (see app/(public)/login/page.tsx) — keep
    // this in sync if the param ever changes.
    redirect('/login?redirect=/signals/nueva')
  }

  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createSignalsAdminClient()

  // Optional pilot allow-list: comma-separated conscious_locations.id values.
  // TODO(signals-pilot): replace this env-driven gate with a Supabase view
  // (`signals_pilot_locations`) once the polygon is locked in.
  const allowedRaw = process.env.SIGNALS_ALLOWED_LOCATION_IDS?.trim()
  const allowedLocationIds = allowedRaw
    ? allowedRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null

  const targetsQuery = admin
    .from('citizen_targets')
    .select('id, slug, display_name, target_kind, conscious_location_id')
    .in('target_kind', SIGNAL_TARGET_KINDS as unknown as string[])
    .order('display_name', { ascending: true })
    .limit(500)

  // Stage A: always pull the 16 CDMX alcaldías by slug. This list is the
  // source of truth for the "broad bucket" picker and must NOT be
  // narrowed by SIGNALS_ALLOWED_LOCATION_IDS.
  const alcaldiasQuery = admin
    .from('conscious_locations')
    .select('id, slug, name, neighborhood, city, status')
    .in('slug', CDMX_ALCALDIA_SLUGS as unknown as string[])
    .order('name', { ascending: true })

  // Stage B: every OTHER active CDMX `conscious_locations` row. The
  // wizard surfaces these as "partner locations" inside the chosen
  // alcaldía. We exclude the alcaldía rows by slug so we don't double-list
  // them, and apply the same CDMX city heuristic as before so installs
  // that have "Mexico City" / "CDMX" still light up.
  const partnerLocationsBase = admin
    .from('conscious_locations')
    .select('id, slug, name, neighborhood, city, status')
    .eq('status', 'active')
    .not('slug', 'in', `(${CDMX_ALCALDIA_SLUGS.map((s) => `"${s}"`).join(',')})`)
    .order('name', { ascending: true })
    .limit(500)

  const partnerLocationsQuery = allowedLocationIds
    ? partnerLocationsBase.in('id', allowedLocationIds)
    : partnerLocationsBase.or(
        [
          'city.ilike.%méxico%',
          'city.ilike.%mexico%',
          'city.ilike.%cdmx%',
        ].join(',')
      )

  const [
    { data: targets },
    { data: alcaldias },
    { data: partnerLocations },
  ] = await Promise.all([
    targetsQuery,
    alcaldiasQuery,
    partnerLocationsQuery,
  ])

  const targetOptions: ComposeTarget[] = (targets ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    display_name: row.display_name,
    target_kind: row.target_kind,
  }))

  const alcaldiaOptions: ComposeLocation[] = (alcaldias ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    neighborhood: row.neighborhood,
    city: row.city,
  }))

  const partnerOptions: ComposeLocation[] = (partnerLocations ?? []).map(
    (row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      neighborhood: row.neighborhood,
      city: row.city,
    })
  )

  // Force a dark wrapper on the route — `src/app/globals.css` ships
  // body-light overrides that would otherwise flash white on first paint.
  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {t.nav.brand}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {t.compose.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            {t.compose.requireAuth}
          </p>
        </header>

        <ComposeWizard
          locale={locale}
          targets={targetOptions}
          alcaldias={alcaldiaOptions}
          partnerLocations={partnerOptions}
          userDefaultLanguage={locale}
          userId={user.id}
        />
      </main>

      <Footer />
    </div>
  )
}
