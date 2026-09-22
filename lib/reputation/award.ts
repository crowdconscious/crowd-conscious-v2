/**
 * Phase 3 civic reputation — server helpers aligned to mobile-canonical schema.
 *
 * Shared Supabase: apply ONLY
 *   crowd-conscious-mobile/supabase/migrations/20260922_civic_reputation.sql
 * Never apply web 261 (retired). See docs/PHASE-3-CIVIC-REPUTATION.md.
 *
 * Cosign / signal-stage / location-evaluation awards are DB triggers.
 * App-layer awards are only for reserved paths (neighbor, sustained presence).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CIVIC_REPUTATION_POINTS,
  isCivicReputationEnabled,
  type CivicReputationActionType,
  type CivicReputationDomain,
} from '@/lib/reputation/domains'

export type AwardCivicReputationResult = {
  success: boolean
  error?: string
  /** Mobile RPC returns boolean; true means a new event was inserted. */
  awarded?: boolean
}

type AwardArgs = {
  userId: string
  actionType: CivicReputationActionType
  /** Idempotency key — unique with (user_id, action_type) in mobile schema. */
  actionId: string
  domain: CivicReputationDomain
  alcaldiaSlug: string
  alcaldiaLabel?: string | null
  points?: number
  objectId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Service-role write via mobile `award_civic_reputation`.
 * Prefer DB triggers for cosign / stage / location — do not double-award those.
 */
export async function awardCivicReputation(
  admin: SupabaseClient,
  args: AwardArgs
): Promise<AwardCivicReputationResult> {
  if (!isCivicReputationEnabled()) {
    return { success: false, error: 'feature_disabled' }
  }

  const points =
    args.points ?? CIVIC_REPUTATION_POINTS[args.actionType] ?? 0
  if (points <= 0 || points > 100) {
    return { success: false, error: 'invalid_points' }
  }

  const alcaldiaSlug = args.alcaldiaSlug.trim() || 'cdmx'

  const { data, error } = await admin.rpc('award_civic_reputation', {
    p_user_id: args.userId,
    p_action_type: args.actionType,
    p_action_id: args.actionId,
    p_points: points,
    p_domain: args.domain,
    p_alcaldia_slug: alcaldiaSlug,
    p_alcaldia_label: args.alcaldiaLabel ?? null,
    p_object_id: args.objectId ?? null,
    p_metadata: args.metadata ?? {},
  })

  if (error) {
    console.warn('[civic-reputation] award rpc failed', {
      actionType: args.actionType,
      userId: args.userId,
      error: error.message,
    })
    return { success: false, error: error.message }
  }

  const awarded = data === true
  return {
    success: awarded,
    awarded,
    error: awarded ? undefined : 'already_awarded_or_skipped',
  }
}

/**
 * Sustained presence: if the user has civic events in ≥2 distinct ISO weeks
 * in the trailing 35 days (excluding prior sustained_presence awards), grant
 * one monthly presence award under desarrollo_urbano / cdmx.
 * Idempotent via action_id = YYYY-MM (UTC).
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
    .select('created_at, action_type')
    .eq('user_id', userId)
    .neq('action_type', 'sustained_presence')
    .gte('created_at', since.toISOString())

  const weeks = new Set<string>()
  for (const ev of events ?? []) {
    const d = new Date((ev as { created_at: string }).created_at)
    const tmp = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    )
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

  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

  return awardCivicReputation(admin, {
    userId,
    actionType: 'sustained_presence',
    actionId: `month:${monthKey}`,
    domain: 'desarrollo_urbano',
    alcaldiaSlug: 'cdmx',
    alcaldiaLabel: 'Ciudad de México',
    metadata: { weeks: weeks.size },
  })
}

export type CivicReputationBreakdownRow = {
  alcaldia: string
  alcaldiaSlug: string
  domain: CivicReputationDomain
  points: number
  eventCount: number
  updated_at: string
}

export type CivicReputationSnapshot = {
  totalPoints: number
  breakdown: CivicReputationBreakdownRow[]
  recent: Array<{
    id: string
    domain: CivicReputationDomain
    alcaldia: string
    actionType: CivicReputationActionType
    points: number
    created_at: string
  }>
}

/**
 * Load private reputation for the authenticated user.
 * Prefers mobile read RPCs; falls back to RLS selects on scores/events.
 */
export async function fetchOwnCivicReputation(
  supabase: SupabaseClient,
  userId: string
): Promise<CivicReputationSnapshot> {
  const [{ data: scoreRows, error: scoresErr }, { data: recent, error: recentErr }] =
    await Promise.all([
      supabase.rpc('get_my_civic_reputation'),
      supabase
        .from('civic_reputation_events')
        .select(
          'id, domain, alcaldia_slug, alcaldia_label, action_type, points, created_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  let breakdown: CivicReputationBreakdownRow[] = []

  if (!scoresErr && Array.isArray(scoreRows) && scoreRows.length > 0) {
    breakdown = scoreRows.map((row) => {
      const r = row as {
        alcaldia_slug: string
        alcaldia_label: string | null
        domain: string
        points: number
        event_count: number
        updated_at: string
      }
      return {
        alcaldiaSlug: r.alcaldia_slug,
        alcaldia: r.alcaldia_label?.trim() || r.alcaldia_slug,
        domain: r.domain as CivicReputationDomain,
        points: Number(r.points) || 0,
        eventCount: Number(r.event_count) || 0,
        updated_at: r.updated_at,
      }
    })
  } else {
    // RLS fallback if RPC unavailable
    const { data: scores } = await supabase
      .from('civic_reputation_scores')
      .select(
        'alcaldia_slug, alcaldia_label, domain, points, event_count, updated_at'
      )
      .eq('user_id', userId)
      .order('points', { ascending: false })

    breakdown = (scores ?? []).map((row) => ({
      alcaldiaSlug: row.alcaldia_slug as string,
      alcaldia:
        ((row.alcaldia_label as string | null)?.trim() ||
          (row.alcaldia_slug as string)) ??
        'cdmx',
      domain: row.domain as CivicReputationDomain,
      points: Number(row.points) || 0,
      eventCount: Number(row.event_count) || 0,
      updated_at: row.updated_at as string,
    }))
  }

  let totalPoints = breakdown.reduce((sum, r) => sum + r.points, 0)

  const { data: totalsRpc } = await supabase.rpc(
    'get_my_civic_reputation_totals'
  )
  if (Array.isArray(totalsRpc) && totalsRpc[0]) {
    const t = totalsRpc[0] as { total_points?: number }
    if (typeof t.total_points === 'number') {
      totalPoints = t.total_points
    }
  }

  if (recentErr) {
    console.warn('[civic-reputation] recent events read failed', recentErr.message)
  }

  return {
    totalPoints,
    breakdown,
    recent: (recent ?? []).map((ev) => {
      const e = ev as {
        id: string
        domain: string
        alcaldia_slug: string
        alcaldia_label: string | null
        action_type: string
        points: number
        created_at: string
      }
      return {
        id: e.id,
        domain: e.domain as CivicReputationDomain,
        alcaldia: e.alcaldia_label?.trim() || e.alcaldia_slug,
        actionType: e.action_type as CivicReputationActionType,
        points: Number(e.points) || 0,
        created_at: e.created_at,
      }
    }),
  }
}
