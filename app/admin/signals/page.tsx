import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import SignalsTriage, {
  type AdminLocationLookup,
  type AdminSignalRow,
  type AdminTargetRow,
} from '@/components/admin/SignalsTriage'

export const dynamic = 'force-dynamic'

function readLocale(c: {
  get: (k: string) => { value?: string } | undefined
}): CitizenSignalsLocale {
  return c.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

/**
 * /admin/signals — moderation triage console.
 *
 * Server-loads the full queue + the target registry so the admin can issue
 * magic-links without an extra round-trip. The client component handles
 * all the mutations.
 */
export default async function AdminSignalsPage() {
  const user = await getCurrentUser()
  if (!user || !isAdminUser(user)) {
    redirect('/dashboard')
  }

  const cookieStore = await cookies()
  const locale = readLocale(cookieStore)
  const t = getCitizenSignalsCopy(locale)

  const admin = createSignalsAdminClient()

  const [{ data: signals }, { data: targets }] = await Promise.all([
    admin
      .from('citizen_signals')
      .select(
        'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, conscious_location_id, partner_location_id, street_reference, title, body, language, anonymous_display_mode, anonymous_display_name, publication_status, threshold_stage, cosign_count, anonymous_support_count, canonical_duplicate_of, ai_scores, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('citizen_targets')
      .select('id, slug, display_name, target_kind, notification_email')
      .order('display_name', { ascending: true })
      .limit(500),
  ])

  // Resolve location names in a single batch so the triage card can render
  // "alcaldía · partner" without per-row joins. Migration 222 introduced the
  // optional partner_location_id refinement which lives in the same
  // conscious_locations table as the broad alcaldía.
  const locationIds = Array.from(
    new Set(
      (signals ?? []).flatMap((s) =>
        [s.conscious_location_id, s.partner_location_id].filter(
          (id): id is string => typeof id === 'string' && id.length > 0
        )
      )
    )
  )
  const { data: locations } = locationIds.length
    ? await admin
        .from('conscious_locations')
        .select('id, name, city')
        .in('id', locationIds)
    : { data: [] as Array<{ id: string; name: string; city: string | null }> }

  const locationsLookup: Record<string, AdminLocationLookup> = {}
  for (const l of locations ?? []) {
    locationsLookup[l.id] = { name: l.name, city: l.city ?? null }
  }

  // `sponsorable` (migration 235) is not yet modelled in types/database.ts, so
  // fetch it via the untyped service-role client and merge by id.
  const signalIds = (signals ?? []).map((s) => s.id)
  const sponsorableById = new Map<string, boolean>()
  if (signalIds.length > 0) {
    const moneyAdmin = createAdminClient()
    const { data: flagRows } = await moneyAdmin
      .from('citizen_signals')
      .select('id, sponsorable')
      .in('id', signalIds)
    for (const r of (flagRows ?? []) as Array<{ id: string; sponsorable: boolean | null }>) {
      sponsorableById.set(r.id, !!r.sponsorable)
    }
  }

  const enrichedSignals = (signals ?? []).map((s) => ({
    ...s,
    sponsorable: sponsorableById.get(s.id) ?? false,
  }))

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            {t.nav.brand}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {locale === 'es' ? 'Triage de moderación' : 'Moderation triage'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {locale === 'es'
              ? 'Aprueba, rechaza o pide edición. Emite enlaces mágicos para destinatarios oficiales.'
              : 'Approve, reject or request edit. Issue magic links to official targets.'}
          </p>
        </header>

        <SignalsTriage
          locale={locale}
          initialSignals={enrichedSignals as AdminSignalRow[]}
          targets={(targets ?? []) as AdminTargetRow[]}
          locations={locationsLookup}
        />
      </main>
    </div>
  )
}
