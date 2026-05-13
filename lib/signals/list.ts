/**
 * Server-side data layer for the public Citizen Signals feed.
 *
 * Reads from `citizen_signals_public` (anon-safe view) plus the small
 * registries `citizen_targets` and `conscious_locations` so feed cards can
 * show a target name and location label without a client-side join.
 *
 * The view is granted SELECT to `anon` (see migration 219), so we can use
 * the standard SSR client. We still wrap it through the typed
 * `SignalsAdminClient` shape on the calling side because Database['Views']
 * does not yet declare relationships to the underlying tables.
 */

import { cookies } from 'next/headers'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import type {
  CitizenSignalsLocale,
  SignalCategory,
  SignalSeverity,
  SignalTargetKind,
} from '@/lib/i18n/citizen-signals'

export type SignalListItem = {
  id: string
  publicSlug: string
  postType: string
  category: SignalCategory
  severity: SignalSeverity
  targetKind: SignalTargetKind
  citizenTargetId: string
  title: string
  body: string
  language: string
  consciousLocationId: string
  displayName: string | null
  anonymousDisplayMode: boolean
  thresholdStage: number
  cosignCount: number
  stage1MetAt: string | null
  stage2MetAt: string | null
  createdAt: string
  updatedAt: string
  targetName: string | null
  locationName: string | null
}

export type SignalLookups = {
  targets: Record<string, { displayName: string; targetKind: string }>
  locations: Record<string, { name: string }>
}

export async function getSignalsLocale(): Promise<CitizenSignalsLocale> {
  const cookieStore = await cookies()
  return cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
}

const FEED_PAGE_SIZE = 30

export async function fetchInitialSignals(): Promise<{
  signals: SignalListItem[]
  lookups: SignalLookups
  nextCursor: string | null
}> {
  const admin = createSignalsAdminClient()

  const { data: rows, error } = await admin
    .from('citizen_signals_public')
    .select(
      'id, public_slug, post_type, category, severity, target_kind, citizen_target_id, title, body, language, conscious_location_id, anonymous_display_mode, display_name, threshold_stage, cosign_count, stage1_met_at, stage2_met_at, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE)

  if (error) {
    console.error('[signals/list] fetch view', error)
    return { signals: [], lookups: { targets: {}, locations: {} }, nextCursor: null }
  }

  const signalsRaw = rows ?? []
  const targetIds = Array.from(new Set(signalsRaw.map((r) => r.citizen_target_id)))
  const locationIds = Array.from(
    new Set(signalsRaw.map((r) => r.conscious_location_id))
  )

  const [targetsRes, locationsRes] = await Promise.all([
    targetIds.length
      ? admin
          .from('citizen_targets')
          .select('id, display_name, target_kind')
          .in('id', targetIds)
      : Promise.resolve({ data: [], error: null } as const),
    locationIds.length
      ? admin
          .from('conscious_locations')
          .select('id, name')
          .in('id', locationIds)
      : Promise.resolve({ data: [], error: null } as const),
  ])

  const targets: SignalLookups['targets'] = {}
  for (const t of targetsRes.data ?? []) {
    targets[t.id] = { displayName: t.display_name, targetKind: t.target_kind }
  }
  const locations: SignalLookups['locations'] = {}
  for (const l of locationsRes.data ?? []) {
    locations[l.id] = { name: l.name }
  }

  const signals: SignalListItem[] = signalsRaw.map((r) =>
    mapRowToItem(r, { targets, locations })
  )

  const nextCursor =
    signalsRaw.length === FEED_PAGE_SIZE
      ? signalsRaw[signalsRaw.length - 1].created_at
      : null

  return { signals, lookups: { targets, locations }, nextCursor }
}

type PublicViewRow = {
  id: string
  public_slug: string
  post_type: string
  category: string
  severity: string
  target_kind: string
  citizen_target_id: string
  title: string
  body: string
  language: string
  conscious_location_id: string
  anonymous_display_mode: boolean
  display_name: string | null
  threshold_stage: number
  cosign_count: number
  stage1_met_at: string | null
  stage2_met_at: string | null
  created_at: string
  updated_at: string
}

export function mapRowToItem(
  row: PublicViewRow,
  lookups: SignalLookups
): SignalListItem {
  return {
    id: row.id,
    publicSlug: row.public_slug,
    postType: row.post_type,
    category: row.category as SignalCategory,
    severity: row.severity as SignalSeverity,
    targetKind: row.target_kind as SignalTargetKind,
    citizenTargetId: row.citizen_target_id,
    title: row.title,
    body: row.body,
    language: row.language,
    consciousLocationId: row.conscious_location_id,
    displayName: row.display_name,
    anonymousDisplayMode: row.anonymous_display_mode,
    thresholdStage: row.threshold_stage,
    cosignCount: row.cosign_count,
    stage1MetAt: row.stage1_met_at,
    stage2MetAt: row.stage2_met_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    targetName: lookups.targets[row.citizen_target_id]?.displayName ?? null,
    locationName: lookups.locations[row.conscious_location_id]?.name ?? null,
  }
}

export function getStage1Threshold(): number {
  const raw = process.env.NEXT_PUBLIC_SIGNALS_STAGE1
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : 50
}
