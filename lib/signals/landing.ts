/**
 * Server-side fetch for the "Active Signals" homepage showcase.
 *
 * Returns up to 3 published signals from the last 30 days, ordered by
 * combined engagement (verified cosigns + friction-light anonymous
 * supports). The view already filters to publication_status = 'published'
 * so an empty array is a legitimate signal for the caller to hide the
 * whole section.
 *
 * The caller (`app/page.tsx`) is rendered with `revalidate = 60` so this
 * function does not need its own cache primitive — Next's segment cache
 * is the source of truth.
 */

import { createSignalsAdminClient } from '@/lib/signals/supabase'
import type {
  CitizenSignalsLocale,
  SignalCategory,
  SignalSeverity,
  SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type LandingSignal = {
  id: string
  slug: string
  title: string
  category: SignalCategory
  severity: SignalSeverity
  targetKind: SignalTargetKind
  targetName: string | null
  locationName: string | null
  cosignCount: number
  anonymousSupportCount: number
  createdAt: string
}

const RECENT_WINDOW_DAYS = 30
const LIMIT = 3

export async function fetchLandingSignals(
  _locale: CitizenSignalsLocale
): Promise<LandingSignal[]> {
  // Flag-gated at the call site, but we belt-and-brace here too so any
  // future caller respects the same kill switch.
  if (process.env.NEXT_PUBLIC_SIGNALS_ENABLED !== 'true') return []

  const admin = createSignalsAdminClient()
  const sinceIso = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // We pull a slightly larger sample (LIMIT * 4) ordered by cosigns and
  // sort by the combined score in JS, because the view doesn't expose a
  // composite cosign_count + anonymous_support_count column and we want
  // to avoid a database function for an MVP showcase. The sample size
  // makes the ordering stable in practice (small tail breaks ties by
  // recency only).
  const { data: rows, error } = await admin
    .from('citizen_signals_public')
    .select(
      'id, public_slug, category, severity, target_kind, citizen_target_id, title, conscious_location_id, cosign_count, anonymous_support_count, created_at'
    )
    .gte('created_at', sinceIso)
    .order('cosign_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIMIT * 4)

  if (error) {
    console.error('[signals/landing] fetch view', error)
    return []
  }

  const sample = rows ?? []
  if (sample.length === 0) return []

  const ranked = [...sample].sort((a, b) => {
    const aScore =
      (a.cosign_count ?? 0) + (a.anonymous_support_count ?? 0)
    const bScore =
      (b.cosign_count ?? 0) + (b.anonymous_support_count ?? 0)
    if (aScore !== bScore) return bScore - aScore
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  })

  const top = ranked.slice(0, LIMIT)

  const targetIds = Array.from(
    new Set(
      top
        .map((r) => r.citizen_target_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )
  const locationIds = Array.from(
    new Set(
      top
        .map((r) => r.conscious_location_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const [targetsRes, locationsRes] = await Promise.all([
    targetIds.length
      ? admin
          .from('citizen_targets')
          .select('id, display_name')
          .in('id', targetIds)
      : Promise.resolve({ data: [], error: null } as const),
    locationIds.length
      ? admin
          .from('conscious_locations')
          .select('id, name')
          .in('id', locationIds)
      : Promise.resolve({ data: [], error: null } as const),
  ])

  const targetMap = new Map<string, string>()
  for (const t of targetsRes.data ?? []) {
    targetMap.set(t.id, t.display_name)
  }
  const locationMap = new Map<string, string>()
  for (const l of locationsRes.data ?? []) {
    locationMap.set(l.id, l.name)
  }

  return top.map((r) => ({
    id: r.id,
    slug: r.public_slug,
    title: r.title,
    category: r.category as SignalCategory,
    severity: r.severity as SignalSeverity,
    targetKind: r.target_kind as SignalTargetKind,
    targetName:
      r.citizen_target_id != null
        ? (targetMap.get(r.citizen_target_id) ?? null)
        : null,
    locationName:
      r.conscious_location_id != null
        ? (locationMap.get(r.conscious_location_id) ?? null)
        : null,
    cosignCount: r.cosign_count ?? 0,
    anonymousSupportCount: r.anonymous_support_count ?? 0,
    createdAt: r.created_at,
  }))
}
