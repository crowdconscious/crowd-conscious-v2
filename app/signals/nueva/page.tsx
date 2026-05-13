import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import {
  getCitizenSignalsCopy,
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
 * Loads the target + location options server-side so the user gets
 * instant render. The wizard then drives POST /api/signals from the
 * client side via fetch.
 */
export default async function SignalsComposePage() {
  if (process.env.SIGNALS_ENABLED !== 'true') notFound()

  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/signals/nueva')
  }

  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createSignalsAdminClient()

  const [{ data: targets }, { data: locations }] = await Promise.all([
    admin
      .from('citizen_targets')
      .select('id, slug, display_name, target_kind, conscious_location_id')
      .order('display_name', { ascending: true })
      .limit(500),
    admin
      .from('conscious_locations')
      .select('id, slug, name, neighborhood, city, status')
      .eq('status', 'active')
      .ilike('city', 'ciudad de m%xico')
      .order('name', { ascending: true })
      .limit(500),
  ])

  // Project to the lightest possible shape so we don't ship internal
  // fields to the client bundle. The wizard re-validates these via the
  // API anyway (target_kind/location coherence checks on POST).
  const targetOptions: ComposeTarget[] = (targets ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    display_name: t.display_name,
    target_kind: t.target_kind,
  }))

  const locationOptions: ComposeLocation[] = (locations ?? []).map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    neighborhood: l.neighborhood,
    city: l.city,
  }))

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
        </header>

        <ComposeWizard
          locale={locale}
          targets={targetOptions}
          locations={locationOptions}
          userDefaultLanguage={locale}
        />
      </main>

      <Footer />
    </div>
  )
}
