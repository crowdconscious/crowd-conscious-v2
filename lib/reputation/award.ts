/**
 * Phase 3 civic reputation awards — server-only helpers.
 *
 * Call from service-role / admin paths after allowed civic actions.
 * Never call from opinion-vote cast/resolve paths.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CIVIC_REPUTATION_POINTS,
  isCivicReputationEnabled,
  locationEvaluationDomain,
  signalCategoryToReputationDomain,
  type CivicReputationDomain,
  type CivicReputationReason,
} from '@/lib/reputation/domains'
import {
  CDMX_ALCALDIA_DISPLAY_NAMES,
  isCdmxAlcaldiaSlug,
} from '@/lib/signals/cdmx-alcaldias'

export type AwardCivicReputationResult = {
  success: boolean
  error?: string
  event_id?: string
  points?: number
  domain?: string
  alcaldia?: string
  reason?: string
}

type AwardArgs = {
  userId: string
  domain: CivicReputationDomain
  alcaldia: string
  reason: CivicReputationReason
  points?: number
  objectType?: 'signal' | 'location' | 'referral' | 'presence' | null
  objectId?: string | null
  meta?: Record<string, unknown>
}

export async function awardCivicReputation(
  admin: SupabaseClient,
  args: AwardArgs
): Promise<AwardCivicReputationResult> {
  if (!isCivicReputationEnabled()) {
    return { success: false, error: 'feature_disabled' }
  }

  const points = args.points ?? CIVIC_REPUTATION_POINTS[args.reason]
  const alcaldia = args.alcaldia.trim() || 'Ciudad de México'

  const { data, error } = await admin.rpc('award_civic_reputation', {
    p_user_id: args.userId,
    p_domain: args.domain,
    p_alcaldia: alcaldia,
    p_reason: args.reason,
    p_points: points,
    p_object_type: args.objectType ?? null,
    p_object_id: args.objectId ?? null,
    p_meta: args.meta ?? {},
  })

  if (error) {
    console.warn('[civic-reputation] award rpc failed', {
      reason: args.reason,
      userId: args.userId,
      error: error.message,
    })
    return { success: false, error: error.message }
  }

  const result = (data ?? {}) as AwardCivicReputationResult
  return result
}

/** Resolve display alcaldía from a conscious_locations row (slug or name). */
export function alcaldiaFromLocationRow(row: {
  slug?: string | null
  name?: string | null
  neighborhood?: string | null
} | null): string {
  if (!row) return 'Ciudad de México'
  const slug = row.slug ?? ''
  if (isCdmxAlcaldiaSlug(slug)) {
    return CDMX_ALCALDIA_DISPLAY_NAMES[slug]
  }
  // Alcaldía bucket rows use names like "Cuauhtémoc"
  if (row.name && row.name.trim()) return row.name.trim()
  if (row.neighborhood && row.neighborhood.trim()) {
    return row.neighborhood.trim()
  }
  return 'Ciudad de México'
}

type SignalContext = {
  id: string
  category: string | null
  author_user_id: string
  conscious_location_id: string | null
}

/**
 * When a señal crosses stage 1 or 2: award every co-signer + the author.
 * Idempotent per (user, reason, signal_id). Fail-soft.
 */
export async function awardReputationForSignalStage(
  admin: SupabaseClient,
  params: {
    signalId: string
    stage: 1 | 2
  }
): Promise<{ awarded: number; skipped: number }> {
  if (!isCivicReputationEnabled()) return { awarded: 0, skipped: 0 }

  const { data: signal, error: signalErr } = await admin
    .from('citizen_signals')
    .select('id, category, author_user_id, conscious_location_id')
    .eq('id', params.signalId)
    .maybeSingle()

  if (signalErr || !signal) {
    console.warn(
      '[civic-reputation] signal lookup failed',
      params.signalId,
      signalErr?.message
    )
    return { awarded: 0, skipped: 0 }
  }

  const ctx = signal as SignalContext
  const domain = signalCategoryToReputationDomain(ctx.category)
  const alcaldia = await resolveAlcaldiaForSignal(admin, ctx)

  const cosignReason: CivicReputationReason =
    params.stage === 1 ? 'signal_cosign_stage_50' : 'signal_cosign_stage_200'
  const authorReason: CivicReputationReason =
    params.stage === 1 ? 'signal_author_stage_50' : 'signal_author_stage_200'

  const { data: cosigners } = await admin
    .from('citizen_signal_cosigns')
    .select('user_id')
    .eq('signal_id', params.signalId)

  let awarded = 0
  let skipped = 0

  for (const row of cosigners ?? []) {
    const uid = (row as { user_id: string }).user_id
    if (!uid || uid === ctx.author_user_id) continue
    const res = await awardCivicReputation(admin, {
      userId: uid,
      domain,
      alcaldia,
      reason: cosignReason,
      objectType: 'signal',
      objectId: params.signalId,
      meta: { stage: params.stage },
    })
    if (res.success) awarded++
    else skipped++
  }

  if (ctx.author_user_id) {
    const res = await awardCivicReputation(admin, {
      userId: ctx.author_user_id,
      domain,
      alcaldia,
      reason: authorReason,
      objectType: 'signal',
      objectId: params.signalId,
      meta: { stage: params.stage },
    })
    if (res.success) awarded++
    else skipped++
  }

  return { awarded, skipped }
}

/**
 * Author award when someone else co-signs their published señal (once).
 */
export async function awardReputationForAuthorCosigned(
  admin: SupabaseClient,
  params: {
    signalId: string
    cosignerUserId: string
  }
): Promise<AwardCivicReputationResult> {
  if (!isCivicReputationEnabled()) {
    return { success: false, error: 'feature_disabled' }
  }

  const { data: signal } = await admin
    .from('citizen_signals')
    .select('id, category, author_user_id, conscious_location_id, publication_status')
    .eq('id', params.signalId)
    .maybeSingle()

  if (!signal || signal.publication_status !== 'published') {
    return { success: false, error: 'not_found' }
  }
  if (!signal.author_user_id || signal.author_user_id === params.cosignerUserId) {
    return { success: false, error: 'skip_self' }
  }

  const ctx = signal as SignalContext
  const domain = signalCategoryToReputationDomain(ctx.category)
  const alcaldia = await resolveAlcaldiaForSignal(admin, ctx)

  return awardCivicReputation(admin, {
    userId: ctx.author_user_id,
    domain,
    alcaldia,
    reason: 'signal_author_cosigned',
    objectType: 'signal',
    objectId: params.signalId,
    meta: { cosigner_user_id: params.cosignerUserId },
  })
}

/**
 * Award once per location market evaluation (authenticated voters only).
 * Does NOT look at option or confidence.
 */
export async function awardReputationForLocationEvaluation(
  admin: SupabaseClient,
  params: {
    userId: string
    marketId: string
  }
): Promise<AwardCivicReputationResult> {
  if (!isCivicReputationEnabled()) {
    return { success: false, error: 'feature_disabled' }
  }

  const { data: loc } = await admin
    .from('conscious_locations')
    .select('id, slug, name, neighborhood, current_market_id')
    .eq('current_market_id', params.marketId)
    .maybeSingle()

  if (!loc?.id) {
    return { success: false, error: 'not_a_location_market' }
  }

  return awardCivicReputation(admin, {
    userId: params.userId,
    domain: locationEvaluationDomain(),
    alcaldia: alcaldiaFromLocationRow(loc),
    reason: 'location_evaluated',
    objectType: 'location',
    objectId: loc.id,
    meta: { market_id: params.marketId },
  })
}

/**
 * Sustained presence: if the user has civic events in ≥2 distinct ISO weeks
 * in the trailing 35 days (excluding prior sustained_presence awards), grant
 * one monthly presence award under desarrollo_urbano / Ciudad de México.
 */
export async function maybeAwardSustainedPresence(
  admin: SupabaseClient,
  userId: string
): Promise<AwardCivicReputationResult> {
  if (!isCivicReputationEnabled()) {
    return { success: false, error: 'feature_disabled' }
  }

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 35)

  const { data: events } = await admin
    .from('civic_reputation_events')
    .select('created_at, reason')
    .eq('user_id', userId)
    .neq('reason', 'sustained_presence')
    .gte('created_at', since.toISOString())

  const weeks = new Set<string>()
  for (const ev of events ?? []) {
    const d = new Date((ev as { created_at: string }).created_at)
    // ISO week key: YYYY-Www
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const dayNum = tmp.getUTCDay() || 7
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(
      ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    )
    weeks.add(`${tmp.getUTCFullYear()}-W${weekNo}`)
  }

  if (weeks.size < 2) {
    return { success: false, error: 'insufficient_presence' }
  }

  return awardCivicReputation(admin, {
    userId,
    domain: 'desarrollo_urbano',
    alcaldia: 'Ciudad de México',
    reason: 'sustained_presence',
    objectType: 'presence',
    objectId: null,
    meta: { weeks: weeks.size },
  })
}

async function resolveAlcaldiaForSignal(
  admin: SupabaseClient,
  signal: SignalContext
): Promise<string> {
  if (!signal.conscious_location_id) return 'Ciudad de México'
  const { data: loc } = await admin
    .from('conscious_locations')
    .select('slug, name, neighborhood')
    .eq('id', signal.conscious_location_id)
    .maybeSingle()
  return alcaldiaFromLocationRow(loc)
}

export type CivicReputationBreakdownRow = {
  alcaldia: string
  domain: CivicReputationDomain
  points: number
  updated_at: string
}

export type CivicReputationSnapshot = {
  totalPoints: number
  breakdown: CivicReputationBreakdownRow[]
  recent: Array<{
    id: string
    domain: CivicReputationDomain
    alcaldia: string
    reason: CivicReputationReason
    points: number
    created_at: string
  }>
}

/** Load private reputation for the authenticated user (user-context client). */
export async function fetchOwnCivicReputation(
  supabase: SupabaseClient,
  userId: string
): Promise<CivicReputationSnapshot> {
  const [{ data: totals }, { data: recent }] = await Promise.all([
    supabase
      .from('civic_reputation_totals')
      .select('alcaldia, domain, points, updated_at')
      .eq('user_id', userId)
      .order('points', { ascending: false }),
    supabase
      .from('civic_reputation_events')
      .select('id, domain, alcaldia, reason, points, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const breakdown = (totals ?? []).map((row) => ({
    alcaldia: row.alcaldia as string,
    domain: row.domain as CivicReputationDomain,
    points: Number(row.points) || 0,
    updated_at: row.updated_at as string,
  }))

  const totalPoints = breakdown.reduce((sum, r) => sum + r.points, 0)

  return {
    totalPoints,
    breakdown,
    recent: (recent ?? []).map((ev) => ({
      id: ev.id as string,
      domain: ev.domain as CivicReputationDomain,
      alcaldia: ev.alcaldia as string,
      reason: ev.reason as CivicReputationReason,
      points: Number(ev.points) || 0,
      created_at: ev.created_at as string,
    })),
  }
}
