/**
 * Vote-timing analytics for Pulses.
 *
 * Evidence (no migration needed):
 * - `market_votes.created_at` — set on INSERT since mig 126 (`DEFAULT now()`).
 *   Both `execute_market_vote` and `execute_anonymous_market_vote` insert into
 *   the same table; guests use a synthetic `user_id` + `is_anonymous`.
 * - `market_votes.updated_at` / `change_count` — mig 148 trigger bumps these
 *   when a registered user changes outcome or confidence. `created_at` stays
 *   the first-vote timestamp (correct for arrival / marketing analysis).
 * - Index: `idx_market_votes_created_at` (mig 196).
 * - Already consumed by: `aggregatePulseVotes` → hourly UTC timeline,
 *   `VoteTimeline`, CSV export (`Date`), admin pulse-markets/[id], profile.
 *
 * This module adds CDMX-local hour/weekday summaries and a before/after cut
 * helper so sponsors/admins can answer “when do people vote?” and “did the
 * campaign move the needle?” without a full analytics dashboard.
 *
 * Admin SQL (Supabase SQL editor) — replace :market_id:
 *
 *   -- Votes per hour-of-day (America/Mexico_City)
 *   SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City') AS hour_cdmx,
 *          COUNT(*) AS votes
 *   FROM market_votes WHERE market_id = :market_id
 *   GROUP BY 1 ORDER BY 1;
 *
 *   -- Before / after a campaign timestamp
 *   SELECT CASE WHEN created_at < :campaign_at THEN 'before' ELSE 'after' END AS bucket,
 *          COUNT(*) AS votes,
 *          ROUND(AVG(confidence)::numeric, 2) AS avg_confidence
 *   FROM market_votes WHERE market_id = :market_id
 *   GROUP BY 1;
 */

export const PULSE_ANALYTICS_TZ = 'America/Mexico_City'

export type VoteTimingLike = {
  created_at: string
}

export type HourOfDayBucket = {
  /** 0–23 in America/Mexico_City */
  hour: number
  count: number
}

export type WeekdayBucket = {
  /** 0 = Sunday … 6 = Saturday (CDMX local) */
  weekday: number
  count: number
}

export type VoteTimingSummary = {
  total: number
  byHour: HourOfDayBucket[]
  byWeekday: WeekdayBucket[]
  peakHour: number | null
  peakWeekday: number | null
}

export type CampaignCutStats = {
  beforeCount: number
  afterCount: number
  beforePerHour: number
  afterPerHour: number
  /** afterPerHour / beforePerHour when beforePerHour > 0; otherwise null */
  rateRatio: number | null
}

function cdmxParts(iso: string): { hour: number; weekday: number } | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  // en-US numeric parts are stable; hourCycle h23 avoids AM/PM ambiguity.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PULSE_ANALYTICS_TZ,
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(d)
  const hourRaw = parts.find((p) => p.type === 'hour')?.value
  const wdRaw = parts.find((p) => p.type === 'weekday')?.value
  if (hourRaw == null || wdRaw == null) return null
  const hour = Number(hourRaw)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const weekday = weekdayMap[wdRaw]
  if (weekday == null) return null
  return { hour, weekday }
}

/** CDMX hour-of-day + weekday distribution from first-vote timestamps. */
export function summarizeVoteTiming(votes: VoteTimingLike[]): VoteTimingSummary {
  const hourCounts = Array.from({ length: 24 }, () => 0)
  const weekdayCounts = Array.from({ length: 7 }, () => 0)
  let total = 0

  for (const v of votes) {
    const parts = cdmxParts(v.created_at)
    if (!parts) continue
    hourCounts[parts.hour]++
    weekdayCounts[parts.weekday]++
    total++
  }

  const byHour: HourOfDayBucket[] = hourCounts.map((count, hour) => ({ hour, count }))
  const byWeekday: WeekdayBucket[] = weekdayCounts.map((count, weekday) => ({
    weekday,
    count,
  }))

  let peakHour: number | null = null
  let peakWeekday: number | null = null
  if (total > 0) {
    peakHour = 0
    peakWeekday = 0
    for (let h = 1; h < 24; h++) {
      if (hourCounts[h] > hourCounts[peakHour]) peakHour = h
    }
    for (let w = 1; w < 7; w++) {
      if (weekdayCounts[w] > weekdayCounts[peakWeekday]) peakWeekday = w
    }
  }

  return { total, byHour, byWeekday, peakHour, peakWeekday }
}

/**
 * Compare vote arrival rate before vs after a campaign moment.
 * Uses wall-clock hours from the earliest vote (or campaignAt) to now/latest.
 */
export function campaignCutStats(
  votes: VoteTimingLike[],
  campaignAt: Date | string,
  opts?: { now?: Date }
): CampaignCutStats {
  const cut = typeof campaignAt === 'string' ? new Date(campaignAt) : campaignAt
  const now = opts?.now ?? new Date()
  const cutMs = cut.getTime()
  if (Number.isNaN(cutMs)) {
    return {
      beforeCount: 0,
      afterCount: 0,
      beforePerHour: 0,
      afterPerHour: 0,
      rateRatio: null,
    }
  }

  let beforeCount = 0
  let afterCount = 0
  let earliestMs = Number.POSITIVE_INFINITY
  let latestMs = Number.NEGATIVE_INFINITY

  for (const v of votes) {
    const t = new Date(v.created_at).getTime()
    if (Number.isNaN(t)) continue
    earliestMs = Math.min(earliestMs, t)
    latestMs = Math.max(latestMs, t)
    if (t < cutMs) beforeCount++
    else afterCount++
  }

  if (!Number.isFinite(earliestMs)) {
    return {
      beforeCount: 0,
      afterCount: 0,
      beforePerHour: 0,
      afterPerHour: 0,
      rateRatio: null,
    }
  }

  const endMs = Math.max(latestMs, now.getTime())
  const beforeHours = Math.max((cutMs - earliestMs) / 3_600_000, 1 / 60)
  const afterHours = Math.max((endMs - cutMs) / 3_600_000, 1 / 60)
  const beforePerHour = beforeCount / beforeHours
  const afterPerHour = afterCount / afterHours
  const rateRatio = beforePerHour > 0 ? afterPerHour / beforePerHour : null

  return { beforeCount, afterCount, beforePerHour, afterPerHour, rateRatio }
}

/** Format an ISO timestamp in America/Mexico_City for CSV / admin display. */
export function formatVoteTimestampCdmx(
  iso: string,
  locale: 'es' | 'en' = 'es'
): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    timeZone: PULSE_ANALYTICS_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const WEEKDAY_LABELS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const

const WEEKDAY_LABELS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function weekdayLabel(weekday: number, locale: 'es' | 'en' = 'es'): string {
  const labels = locale === 'es' ? WEEKDAY_LABELS_ES : WEEKDAY_LABELS_EN
  return labels[weekday] ?? String(weekday)
}

export function hourLabel(hour: number, locale: 'es' | 'en' = 'es'): string {
  const padded = `${hour}`.padStart(2, '0')
  return locale === 'es' ? `${padded}:00 (CDMX)` : `${padded}:00 (CDMX)`
}
