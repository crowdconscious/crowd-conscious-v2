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
 * Pilot scope: targets restricted to MVP kinds (municipality, institution),
 * locations restricted to CDMX. Operators can narrow the location list to
 * a specific pilot polygon by setting SIGNALS_ALLOWED_LOCATION_IDS to a
 * comma-separated list of conscious_locations.id values; the API enforces
 * the same allow-list on POST so the two stay aligned.
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

  const locationsBase = admin
    .from('conscious_locations')
    .select('id, slug, name, neighborhood, city, status')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(500)

  const locationsQuery = allowedLocationIds
    ? locationsBase.in('id', allowedLocationIds)
    : locationsBase.ilike('city', 'ciudad de m%xico')

  const [{ data: targets }, { data: locations }] = await Promise.all([
    targetsQuery,
    locationsQuery,
  ])

  const targetOptions: ComposeTarget[] = (targets ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    display_name: row.display_name,
    target_kind: row.target_kind,
  }))

  const locationOptions: ComposeLocation[] = (locations ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    neighborhood: row.neighborhood,
    city: row.city,
  }))

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
          locations={locationOptions}
          userDefaultLanguage={locale}
          userId={user.id}
        />
      </main>

      <Footer />
    </div>
  )
}
