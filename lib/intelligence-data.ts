/**
 * Intelligence Hub — server-side aggregates from Supabase.
 *
 * Schema notes (this codebase):
 * - Admin flag: profiles.user_type === 'admin' (no is_admin column in types)
 * - Fund balance: public.conscious_fund (not conscious_fund_contributions)
 * - User counts: profiles (auth.users not queryable from PostgREST)
 * - Guest votes: market_votes.is_anonymous (migration 147)
 * - Engagement: prediction_markets.engagement_count (migration 151); KPI "total" = all interactions
 */

import { createAdminClient } from '@/lib/supabase-admin'

export type TopMarketRow = {
  id: string
  title: string
  category: string
  total_votes: number
  engagement_count: number
  status: string
  resolution_date: string | null
  yes_probability: number
}

export type VotesByDay = { date: string; count: number }
export type CategoryCount = { category: string; vote_count: number }
export type OutcomeAgg = { label: string; total_votes: number; avg_probability: number }
export type ConfidenceBin = { confidence: number; count: number }
export type SignupsByDay = { date: string; signups: number }
export type LeaderboardRow = {
  display_name: string | null
  total_xp: number
  accuracy_pct: number | null
  votes_cast: number
}
export type SentimentCategory = {
  category: string
  /** Weighted share of YES-like picks (0–1), weight = vote confidence — **binary markets only** (see intelligence hub copy) */
  avg_yes_probability: number
  /** Vote rows used for this metric (binary markets only) */
  total_votes: number
}
export type VoteYesNoSplit = { yes_like: number; no_like: number; other: number }
export type VoterSplit = { voter_type: 'anonymous' | 'registered'; count: number }
export type MarketHistoryPoint = {
  market_id: string
  recorded_at: string
  probability: number
}
export type MarketRowCsv = {
  id: string
  title: string
  category: string
  total_votes: number
  engagement_count: number
  yes_probability: number
  status: string
  resolution_date: string | null
  archived_at: string | null
}

export type VoteChangeLeader = {
  market_id: string
  title: string
  change_events: number
}

/** Period delta — paired (current vs previous) used by KPI cards to show WoW/MoM movement. */
export type PeriodDelta = {
  current: number
  previous: number
  /** Rounded percent change. null = no prior baseline (avoid divide-by-zero). */
  pct_change: number | null
}

/** People-and-impact aggregates — the "so what" layer surfaced on the Impact tab + Snapshot hero. */
export type ImpactSnapshot = {
  /** Registered profiles + anonymous_participants (deduped across-table is best-effort: anon converted_to_user_id excluded) */
  unique_participants: number
  /** Lifetime predictions cast (= total_engagement) */
  predictions_lifetime: number
  /** Markets with status='resolved' */
  markets_resolved_total: number
  /** % of resolved registered votes where market_votes.is_correct = true. null if no resolved data yet. */
  crowd_accuracy_pct: number | null
  /** Number of resolved registered votes used to compute crowd_accuracy_pct */
  crowd_accuracy_sample: number
  /** Distinct active fund_causes — "communities of impact we're routing capital toward" */
  causes_supported: number
  /** Top causes this calendar-month cycle (YYYY-MM) */
  top_causes_this_cycle: { id: string; name: string; organization: string | null; vote_count: number }[]
  /** Conscious Fund (single row aggregate) */
  fund_collected: number
  fund_disbursed: number
  fund_balance: number
  /** Live event totals (excludes archived) */
  live_events_total: number
  live_events_completed: number
  /** Top topics by votes in the last 30 days */
  top_topics_30d: { category: string; vote_count: number }[]
}

export type IntelligenceDashboardData = {
  kpis: {
    /** Rows in market_votes with is_anonymous false/null */
    registered_votes: number
    /** All vote rows (registered + anonymous) — platform engagement */
    total_engagement: number
    /** (total_engagement - registered_votes) / total_engagement · 100 */
    anonymous_engagement_rate_pct: number | null
    total_users: number
    active_markets: number
    orphan_markets: number
    avg_confidence: number | null
    fund_total: number | null
    /** Registered votes with at least one change, updated in the last 7 days */
    vote_changes_week: number
  }
  /** Period-over-period deltas (last 30d vs prior 30d) — used by KPI cards to show momentum. */
  deltas: {
    votes_30d: PeriodDelta
    signups_30d: PeriodDelta
    votes_7d: PeriodDelta
  }
  /** Impact summary — surfaced on the new Impact tab + the Snapshot hero. */
  impact: ImpactSnapshot
  votesOverTime: VotesByDay[]
  votesByCategory: CategoryCount[]
  topMarkets: TopMarketRow[]
  outcomeAgg: OutcomeAgg[]
  confidenceDist: ConfidenceBin[]
  signupsOverTime: SignupsByDay[]
  leaderboard: LeaderboardRow[]
  sentimentByCategory: SentimentCategory[]
  /** YES / NO / other — counts of vote rows by chosen outcome (not outcome table aggregates) */
  voteYesNoSplit: VoteYesNoSplit
  voterSplit: VoterSplit[]
  /** Top 5 markets — probability history ~4 weeks for drift chart */
  driftSeries: { marketId: string; title: string; points: { t: string; y: number }[] }[]
  /** Larger list for Markets tab + CSV */
  allMarkets: MarketRowCsv[]
  accuracyBuckets: { label: string; count: number }[]
  voteChangeLeaders: VoteChangeLeader[]
  loadedWithServiceRole: boolean
  errors: string[]
}

const empty = (): IntelligenceDashboardData => ({
  kpis: {
    registered_votes: 0,
    total_engagement: 0,
    anonymous_engagement_rate_pct: null,
    total_users: 0,
    active_markets: 0,
    orphan_markets: 0,
    avg_confidence: null,
    fund_total: null,
    vote_changes_week: 0,
  },
  deltas: {
    votes_30d: { current: 0, previous: 0, pct_change: null },
    signups_30d: { current: 0, previous: 0, pct_change: null },
    votes_7d: { current: 0, previous: 0, pct_change: null },
  },
  impact: {
    unique_participants: 0,
    predictions_lifetime: 0,
    markets_resolved_total: 0,
    crowd_accuracy_pct: null,
    crowd_accuracy_sample: 0,
    causes_supported: 0,
    top_causes_this_cycle: [],
    fund_collected: 0,
    fund_disbursed: 0,
    fund_balance: 0,
    live_events_total: 0,
    live_events_completed: 0,
    top_topics_30d: [],
  },
  voteChangeLeaders: [],
  votesOverTime: [],
  votesByCategory: [],
  topMarkets: [],
  outcomeAgg: [],
  confidenceDist: [],
  signupsOverTime: [],
  leaderboard: [],
  sentimentByCategory: [],
  voteYesNoSplit: { yes_like: 0, no_like: 0, other: 0 },
  voterSplit: [],
  driftSeries: [],
  allMarkets: [],
  accuracyBuckets: [],
  loadedWithServiceRole: false,
  errors: [],
})

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function isYesLabel(label: string): boolean {
  const l = label.trim().toLowerCase()
  return l === 'yes' || l === 'sí' || l === 'si' || /^yes\b/.test(l) || /^sí\b/.test(l)
}

function isNoLabel(label: string): boolean {
  const l = label.trim().toLowerCase()
  return l === 'no' || /^no\b/.test(l)
}

/** YES-like pick for sentiment: explicit YES, or multi-outcome with implied prob &gt; 0.5 */
function isYesLikePick(label: string, probability: number): boolean {
  if (isYesLabel(label)) return true
  if (isNoLabel(label)) return false
  return normProb(probability) > 0.5
}

type OutcomePick = { label: string; probability: number }

function classifyVoteSide(o: OutcomePick | undefined): 'yes' | 'no' | 'other' {
  if (!o) return 'other'
  if (isYesLabel(o.label)) return 'yes'
  if (isNoLabel(o.label)) return 'no'
  const p = normProb(o.probability)
  if (p > 0.5) return 'yes'
  if (p < 0.5) return 'no'
  return 'other'
}

function normProb(p: number): number {
  if (p == null || Number.isNaN(p)) return 0.5
  return p > 1 ? p / 100 : p
}

export async function fetchIntelligenceDashboard(
  options: { includeArchived?: boolean } = {}
): Promise<IntelligenceDashboardData> {
  const includeArchived = options.includeArchived === true
  const out = empty()
  let admin: ReturnType<typeof createAdminClient> | null = null
  try {
    admin = createAdminClient()
    out.loadedWithServiceRole = true
  } catch (e) {
    out.errors.push('SUPABASE_SERVICE_ROLE_KEY missing — analytics unavailable in this environment.')
    return out
  }

  const pushErr = (label: string, e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    out.errors.push(`${label}: ${msg}`)
  }

  try {
    // --- KPIs: total_engagement = all rows; registered_votes = non-anonymous only ---
    const { count: totalEngagement } = await admin
      .from('market_votes')
      .select('*', { count: 'exact', head: true })
    out.kpis.total_engagement = totalEngagement ?? 0

    let registered = 0
    try {
      const { count: r } = await admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      registered = r ?? 0
    } catch {
      registered = totalEngagement ?? 0
    }
    out.kpis.registered_votes = registered
    const te = out.kpis.total_engagement
    out.kpis.anonymous_engagement_rate_pct =
      te > 0 ? Math.round(((te - registered) / te) * 1000) / 10 : null

    const { count: totalUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    out.kpis.total_users = totalUsers ?? 0

    const { count: activeM } = await admin
      .from('prediction_markets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'trading'])
    out.kpis.active_markets = activeM ?? 0

    const { count: orphan } = await admin
      .from('prediction_markets')
      .select('*', { count: 'exact', head: true })
      .or('total_votes.is.null,total_votes.eq.0')
    out.kpis.orphan_markets = orphan ?? 0

    try {
      const { data: confRows } = await admin.from('market_votes').select('confidence').limit(200000)
      const arr = (confRows ?? []).map((r: { confidence: number }) => r.confidence).filter((n) => n != null)
      if (arr.length) {
        out.kpis.avg_confidence = arr.reduce((a, b) => a + b, 0) / arr.length
      }
    } catch (e) {
      pushErr('avg_confidence', e)
    }

    try {
      const { data: fund } = await admin
        .from('conscious_fund')
        .select('total_collected, total_disbursed, current_balance')
        .limit(1)
        .maybeSingle()
      if (fund) {
        const bal = Number(fund.current_balance ?? 0)
        out.kpis.fund_total = Number.isFinite(bal) ? Math.max(0, bal) : null
        out.impact.fund_collected = Math.max(0, Number(fund.total_collected ?? 0))
        out.impact.fund_disbursed = Math.max(0, Number(fund.total_disbursed ?? 0))
        out.impact.fund_balance = Math.max(0, Number(fund.current_balance ?? 0))
      }
    } catch (e) {
      pushErr('conscious_fund', e)
    }

    // --- Impact: unique participants (registered + non-converted anonymous) ---
    try {
      const { count: anonCount } = await admin
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .is('converted_to_user_id', null)
      out.impact.unique_participants = (out.kpis.total_users ?? 0) + (anonCount ?? 0)
    } catch (e) {
      pushErr('impact_unique_participants', e)
      out.impact.unique_participants = out.kpis.total_users ?? 0
    }
    out.impact.predictions_lifetime = out.kpis.total_engagement

    // --- Impact: resolved markets total + crowd accuracy ---
    try {
      const { count: resolvedCount } = await admin
        .from('prediction_markets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
      out.impact.markets_resolved_total = resolvedCount ?? 0

      // Crowd accuracy: registered votes with is_correct not null, last 50k for cap
      const { data: accRows } = await admin
        .from('market_votes')
        .select('is_correct')
        .not('is_correct', 'is', null)
        .or('is_anonymous.is.null,is_anonymous.eq.false')
        .limit(50000)
      const sample = accRows ?? []
      if (sample.length > 0) {
        const correct = sample.filter((r) => (r as { is_correct: boolean }).is_correct === true).length
        out.impact.crowd_accuracy_sample = sample.length
        out.impact.crowd_accuracy_pct = Math.round((correct / sample.length) * 1000) / 10
      }
    } catch (e) {
      pushErr('impact_resolved_accuracy', e)
    }

    // --- Impact: causes supported + top causes this cycle ---
    try {
      const { count: causesCount } = await admin
        .from('fund_causes')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
      out.impact.causes_supported = causesCount ?? 0

      const cycle = new Date().toISOString().slice(0, 7)
      const { data: cycleVotes } = await admin
        .from('fund_votes')
        .select('cause_id')
        .eq('cycle', cycle)
      const counts = new Map<string, number>()
      for (const v of cycleVotes ?? []) {
        const id = (v as { cause_id: string }).cause_id
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
      const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
      if (topIds.length) {
        const { data: causeRows } = await admin
          .from('fund_causes')
          .select('id, name, organization')
          .in('id', topIds)
        const cmap = new Map(
          (causeRows ?? []).map((c: { id: string; name: string; organization: string | null }) => [c.id, c])
        )
        out.impact.top_causes_this_cycle = topIds
          .map((id) => {
            const c = cmap.get(id)
            if (!c) return null
            return { id, name: c.name, organization: c.organization, vote_count: counts.get(id) ?? 0 }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
      }
    } catch (e) {
      pushErr('impact_causes', e)
    }

    // --- Impact: live events totals (excludes archived) ---
    try {
      const liveBase = admin.from('live_events').select('*', { count: 'exact', head: true }).is('archived_at', null)
      const { count: leTotal } = await liveBase
      out.impact.live_events_total = leTotal ?? 0
      const { count: leDone } = await admin
        .from('live_events')
        .select('*', { count: 'exact', head: true })
        .is('archived_at', null)
        .eq('status', 'completed')
      out.impact.live_events_completed = leDone ?? 0
    } catch (e) {
      pushErr('impact_live_events', e)
    }

    // --- Period-over-period deltas (votes 30d, signups 30d, votes 7d) ---
    try {
      const now = Date.now()
      const d = (n: number) => new Date(now - n * 86400000).toISOString()

      async function periodCount(table: 'market_votes' | 'profiles', start: string, end: string): Promise<number> {
        const { count } = await admin!
          .from(table)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start)
          .lt('created_at', end)
        return count ?? 0
      }

      function pct(curr: number, prev: number): number | null {
        if (prev <= 0) return curr > 0 ? null : 0
        return Math.round(((curr - prev) / prev) * 1000) / 10
      }

      const [v30c, v30p, v7c, v7p, s30c, s30p] = await Promise.all([
        periodCount('market_votes', d(30), d(0)),
        periodCount('market_votes', d(60), d(30)),
        periodCount('market_votes', d(7), d(0)),
        periodCount('market_votes', d(14), d(7)),
        periodCount('profiles', d(30), d(0)),
        periodCount('profiles', d(60), d(30)),
      ])
      out.deltas.votes_30d = { current: v30c, previous: v30p, pct_change: pct(v30c, v30p) }
      out.deltas.votes_7d = { current: v7c, previous: v7p, pct_change: pct(v7c, v7p) }
      out.deltas.signups_30d = { current: s30c, previous: s30p, pct_change: pct(s30c, s30p) }
    } catch (e) {
      pushErr('period_deltas', e)
    }

    try {
      const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString()
      const { count: vcw } = await admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .gt('change_count', 0)
        .gte('updated_at', weekAgoIso)
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      out.kpis.vote_changes_week = vcw ?? 0

      const { data: chRows } = await admin
        .from('market_votes')
        .select('market_id, change_count')
        .gte('updated_at', weekAgoIso)
        .gt('change_count', 0)
        .or('is_anonymous.is.null,is_anonymous.eq.false')
        .limit(8000)

      const sumBy = new Map<string, number>()
      for (const r of chRows ?? []) {
        const row = r as { market_id: string; change_count: number }
        sumBy.set(row.market_id, (sumBy.get(row.market_id) ?? 0) + Number(row.change_count ?? 0))
      }
      const topPairs = [...sumBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (topPairs.length) {
        const topIds = topPairs.map(([id]) => id)
        let titleQ = admin.from('prediction_markets').select('id, title').in('id', topIds)
        if (!includeArchived) titleQ = titleQ.is('archived_at', null)
        const { data: titles } = await titleQ
        const tmap = new Map((titles ?? []).map((t: { id: string; title: string }) => [t.id, t.title]))
        const pairs = includeArchived
          ? topPairs
          : topPairs.filter(([id]) => tmap.has(id))
        out.voteChangeLeaders = pairs.map(([id, n]) => ({
          market_id: id,
          title: String(tmap.get(id) ?? id),
          change_events: n,
        }))
      }
    } catch (e) {
      pushErr('vote_change_stats', e)
    }

    // --- Votes by day (up to ~1y) — client filters 7d / 30d / all ---
    const since365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const { data: v365 } = await admin.from('market_votes').select('created_at').gte('created_at', since365)
    const byDay = new Map<string, number>()
    for (const row of v365 ?? []) {
      const k = dayKey((row as { created_at: string }).created_at)
      byDay.set(k, (byDay.get(k) ?? 0) + 1)
    }
    out.votesOverTime = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // --- Votes by category ---
    const { data: allVotes } = await admin.from('market_votes').select('market_id')
    let allMq = admin.from('prediction_markets').select('id, category')
    if (!includeArchived) allMq = allMq.is('archived_at', null)
    const { data: allM } = await allMq
    const catMap = new Map((allM ?? []).map((m: { id: string; category: string }) => [m.id, m.category]))
    const catCount = new Map<string, number>()
    for (const v of allVotes ?? []) {
      const mid = (v as { market_id: string }).market_id
      if (!includeArchived && !catMap.has(mid)) continue
      const c = catMap.get(mid) ?? 'unknown'
      catCount.set(c, (catCount.get(c) ?? 0) + 1)
    }
    out.votesByCategory = [...catCount.entries()]
      .map(([category, vote_count]) => ({ category, vote_count }))
      .sort((a, b) => b.vote_count - a.vote_count)

    // Top topics last 30d — uses the same market_id → category map, filtered to recent votes.
    try {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
      const { data: v30 } = await admin
        .from('market_votes')
        .select('market_id, created_at')
        .gte('created_at', since30)
      const topicMap = new Map<string, number>()
      for (const v of v30 ?? []) {
        const mid = (v as { market_id: string }).market_id
        const c = catMap.get(mid) ?? 'unknown'
        topicMap.set(c, (topicMap.get(c) ?? 0) + 1)
      }
      out.impact.top_topics_30d = [...topicMap.entries()]
        .map(([category, vote_count]) => ({ category, vote_count }))
        .sort((a, b) => b.vote_count - a.vote_count)
        .slice(0, 5)
    } catch (e) {
      pushErr('impact_top_topics_30d', e)
    }

    // --- Top markets + all markets for table ---
    let topPmQ = admin
      .from('prediction_markets')
      .select(
        'id, title, category, total_votes, engagement_count, status, resolution_date, current_probability, archived_at'
      )
      .order('engagement_count', { ascending: false, nullsFirst: false })
      .limit(200)
    if (!includeArchived) topPmQ = topPmQ.is('archived_at', null)
    const { data: topPm } = await topPmQ

    const pmList = topPm ?? []
    const top10 = pmList.slice(0, 10)
    const topIds = top10.map((p: { id: string }) => p.id)
    const yesProb = new Map<string, number>()
    if (topIds.length) {
      const { data: outcomesTop } = await admin
        .from('market_outcomes')
        .select('market_id, label, probability')
        .in('market_id', topIds)
      for (const o of outcomesTop ?? []) {
        const row = o as { market_id: string; label: string; probability: number }
        if (isYesLabel(row.label)) {
          yesProb.set(row.market_id, normProb(Number(row.probability)))
        }
      }
    }

    out.topMarkets = top10.map((p: Record<string, unknown>) => {
      const id = p.id as string
      const cp = Number(p.current_probability ?? 50)
      const cpFrac = cp > 1 ? cp / 100 : cp
      const yp = yesProb.get(id) ?? cpFrac
      const reg = Number(p.total_votes ?? 0)
      const eng = Number((p.engagement_count as number | undefined) ?? reg)
      return {
        id,
        title: String(p.title ?? ''),
        category: String(p.category ?? ''),
        total_votes: reg,
        engagement_count: eng,
        status: String(p.status ?? ''),
        resolution_date: (p.resolution_date as string | null) ?? null,
        yes_probability: yp,
      }
    })

    out.allMarkets = pmList.map((p: Record<string, unknown>) => {
      const id = p.id as string
      const cp = Number(p.current_probability ?? 50)
      const yesP = cp > 1 ? cp / 100 : cp
      const reg = Number(p.total_votes ?? 0)
      const eng = Number((p.engagement_count as number | undefined) ?? reg)
      return {
        id,
        title: String(p.title ?? ''),
        category: String(p.category ?? ''),
        total_votes: reg,
        engagement_count: eng,
        yes_probability: yesP,
        status: String(p.status ?? ''),
        resolution_date: (p.resolution_date as string | null) ?? null,
        archived_at: (p.archived_at as string | null) ?? null,
      }
    })

    // --- Outcome aggregates (all outcomes) ---
    const { data: allOutcomes } = await admin.from('market_outcomes').select('label, vote_count, probability')
    const aggMap = new Map<string, { votes: number; probSum: number; n: number }>()
    for (const o of allOutcomes ?? []) {
      const row = o as { label: string; vote_count: number; probability: number }
      const key = row.label.trim() || 'Unknown'
      const cur = aggMap.get(key) ?? { votes: 0, probSum: 0, n: 0 }
      cur.votes += Number(row.vote_count ?? 0)
      cur.probSum += Number(row.probability ?? 0)
      cur.n += 1
      aggMap.set(key, cur)
    }
    out.outcomeAgg = [...aggMap.entries()].map(([label, v]) => ({
      label,
      total_votes: v.votes,
      avg_probability: v.n ? v.probSum / v.n : 0,
    }))

    // --- Signups by day (up to ~1y) ---
    const { data: prof30 } = await admin.from('profiles').select('created_at').gte('created_at', since365)
    const sDay = new Map<string, number>()
    for (const row of prof30 ?? []) {
      const k = dayKey((row as { created_at: string }).created_at)
      sDay.set(k, (sDay.get(k) ?? 0) + 1)
    }
    out.signupsOverTime = [...sDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, signups]) => ({ date, signups }))

    // --- Leaderboard top 10 ---
    const { data: xpRows } = await admin
      .from('user_xp')
      .select('user_id, total_xp')
      .order('total_xp', { ascending: false })
      .limit(10)
    const uids = (xpRows ?? []).map((r: { user_id: string }) => r.user_id)
    const { data: nameRows } = await admin.from('profiles').select('id, full_name').in('id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000'])
    const names = new Map((nameRows ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))
    let voteRows: { user_id: string; is_correct: boolean | null }[] = []
    try {
      const { data: vr } = await admin
        .from('market_votes')
        .select('user_id, is_correct')
        .in('user_id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000'])
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      voteRows = (vr ?? []) as { user_id: string; is_correct: boolean | null }[]
    } catch {
      const { data: vr } = await admin
        .from('market_votes')
        .select('user_id, is_correct')
        .in('user_id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000'])
      voteRows = (vr ?? []) as { user_id: string; is_correct: boolean | null }[]
    }
    const stats = new Map<string, { resolved: number; correct: number; votes: number }>()
    for (const uid of uids) stats.set(uid, { resolved: 0, correct: 0, votes: 0 })
    for (const v of voteRows) {
      const s = stats.get(v.user_id)
      if (!s) continue
      s.votes += 1
      if (v.is_correct !== null) {
        s.resolved += 1
        if (v.is_correct === true) s.correct += 1
      }
    }
    out.leaderboard = (xpRows ?? []).map((r: { user_id: string; total_xp: number }) => {
      const s = stats.get(r.user_id) ?? { resolved: 0, correct: 0, votes: 0 }
      const accuracy_pct = s.resolved > 0 ? Math.round((s.correct / s.resolved) * 1000) / 10 : null
      return {
        display_name: names.get(r.user_id) ?? null,
        total_xp: Number(r.total_xp ?? 0),
        accuracy_pct,
        votes_cast: s.votes,
      }
    })

    // Accuracy distribution (top 50 by XP)
    const { data: xp50 } = await admin
      .from('user_xp')
      .select('user_id')
      .order('total_xp', { ascending: false })
      .limit(50)
    const u50 = (xp50 ?? []).map((r: { user_id: string }) => r.user_id)
    let vr50: { user_id: string; is_correct: boolean | null }[] = []
    try {
      const { data } = await admin
        .from('market_votes')
        .select('user_id, is_correct')
        .in('user_id', u50.length ? u50 : ['00000000-0000-0000-0000-000000000000'])
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      vr50 = (data ?? []) as { user_id: string; is_correct: boolean | null }[]
    } catch {
      const { data } = await admin
        .from('market_votes')
        .select('user_id, is_correct')
        .in('user_id', u50.length ? u50 : ['00000000-0000-0000-0000-000000000000'])
      vr50 = (data ?? []) as { user_id: string; is_correct: boolean | null }[]
    }
    const accByUser = new Map<string, { res: number; cor: number }>()
    for (const uid of u50) accByUser.set(uid, { res: 0, cor: 0 })
    for (const v of vr50) {
      const a = accByUser.get(v.user_id)
      if (!a || v.is_correct === null) continue
      a.res += 1
      if (v.is_correct) a.cor += 1
    }
    const buckets = [
      { label: '0–20%', count: 0 },
      { label: '21–40%', count: 0 },
      { label: '41–60%', count: 0 },
      { label: '61–80%', count: 0 },
      { label: '81–100%', count: 0 },
    ]
    for (const uid of u50) {
      const a = accByUser.get(uid)
      if (!a || a.res === 0) continue
      const pct = (a.cor / a.res) * 100
      if (pct <= 20) buckets[0].count++
      else if (pct <= 40) buckets[1].count++
      else if (pct <= 60) buckets[2].count++
      else if (pct <= 80) buckets[3].count++
      else buckets[4].count++
    }
    out.accuracyBuckets = buckets

    // --- Confidence 1–10, sentiment by category (confidence-weighted), YES/NO donut — all from market_votes + chosen outcome ---
    try {
      let mkQ = admin.from('prediction_markets').select('id, category, archived_at')
      if (!includeArchived) mkQ = mkQ.is('archived_at', null)
      const { data: mkRows } = await mkQ
      const marketMeta = new Map<string, { category: string }>()
      for (const m of mkRows ?? []) {
        const row = m as { id: string; category: string }
        marketMeta.set(row.id, { category: row.category ?? 'unknown' })
      }

      /** Outcome count per market — YES% radar uses binary (2-outcome) markets only so Pulse/multi-outcome isn't misread as optimism. */
      const marketIdsList = [...marketMeta.keys()]
      const outcomeCountByMarket = new Map<string, number>()
      const ocChunk = 400
      for (let i = 0; i < marketIdsList.length; i += ocChunk) {
        const chunk = marketIdsList.slice(i, i + ocChunk)
        if (!chunk.length) continue
        const { data: ocRows } = await admin.from('market_outcomes').select('market_id').in('market_id', chunk)
        for (const r of ocRows ?? []) {
          const mid = (r as { market_id: string }).market_id
          outcomeCountByMarket.set(mid, (outcomeCountByMarket.get(mid) ?? 0) + 1)
        }
      }
      const isBinaryMarket = (marketId: string) => outcomeCountByMarket.get(marketId) === 2

      // Most recent votes first — unbounded .limit() without ORDER was an arbitrary slice of the table.
      const { data: voteRowsRaw } = await admin
        .from('market_votes')
        .select('confidence, outcome_id, market_id, created_at')
        .order('created_at', { ascending: false })
        .limit(250000)

      const voteRows = (voteRowsRaw ?? []) as {
        confidence: number | null
        outcome_id: string
        market_id: string
        created_at?: string
      }[]

      const filteredVotes = voteRows.filter((v) => marketMeta.has(v.market_id))

      const outcomeIds = [...new Set(filteredVotes.map((v) => v.outcome_id).filter(Boolean))]
      const outcomeById = new Map<string, OutcomePick>()
      const chunkSize = 500
      for (let i = 0; i < outcomeIds.length; i += chunkSize) {
        const chunk = outcomeIds.slice(i, i + chunkSize)
        if (!chunk.length) continue
        const { data: oc } = await admin
          .from('market_outcomes')
          .select('id, label, probability')
          .in('id', chunk)
        for (const r of oc ?? []) {
          const o = r as { id: string; label: string; probability: number }
          outcomeById.set(o.id, { label: o.label ?? '', probability: Number(o.probability ?? 0) })
        }
      }

      const bins = new Map<number, number>()
      for (let j = 1; j <= 10; j++) bins.set(j, 0)
      const sentMap = new Map<string, { yesW: number; totalW: number; n: number }>()
      let yesLike = 0
      let noLike = 0
      let otherSide = 0

      for (const v of filteredVotes) {
        const meta = marketMeta.get(v.market_id)
        if (!meta) continue
        const cat = meta.category
        const w = Math.min(10, Math.max(1, Math.round(Number(v.confidence ?? 5))))
        const oc = outcomeById.get(v.outcome_id)
        bins.set(w, (bins.get(w) ?? 0) + 1)

        // Radar YES%: binary markets only. Multi-outcome "YES-like" via outcome.probability > 0.5 tracked the *leading* option, not user optimism — it skewed categories (e.g. sustainability vs World Cup Pulse).
        if (isBinaryMarket(v.market_id)) {
          const yesPick = oc ? isYesLikePick(oc.label, oc.probability) : false
          const cur = sentMap.get(cat) ?? { yesW: 0, totalW: 0, n: 0 }
          cur.totalW += w
          cur.n += 1
          if (yesPick) cur.yesW += w
          sentMap.set(cat, cur)
        }

        const side = classifyVoteSide(oc)
        if (side === 'yes') yesLike++
        else if (side === 'no') noLike++
        else otherSide++
      }

      out.confidenceDist = [...bins.entries()].map(([confidence, count]) => ({ confidence, count }))

      const categoriesSeen = new Set<string>()
      for (const m of marketMeta.values()) categoriesSeen.add(m.category)

      out.sentimentByCategory = [...categoriesSeen]
        .sort((a, b) => a.localeCompare(b))
        .map((category) => {
          const v = sentMap.get(category)
          return {
            category,
            avg_yes_probability: v && v.totalW > 0 ? v.yesW / v.totalW : 0,
            total_votes: v?.n ?? 0,
          }
        })
      out.voteYesNoSplit = { yes_like: yesLike, no_like: noLike, other: otherSide }
    } catch (e) {
      pushErr('sentiment_vote_aggregates', e)
      try {
        const { data: allConf } = await admin.from('market_votes').select('confidence').limit(250000)
        const bins = new Map<number, number>()
        for (let j = 1; j <= 10; j++) bins.set(j, 0)
        for (const r of allConf ?? []) {
          const c = Math.round(Number((r as { confidence: number }).confidence))
          if (c >= 1 && c <= 10) bins.set(c, (bins.get(c) ?? 0) + 1)
        }
        out.confidenceDist = [...bins.entries()].map(([confidence, count]) => ({ confidence, count }))
      } catch {
        const bins = new Map<number, number>()
        for (let j = 1; j <= 10; j++) bins.set(j, 0)
        out.confidenceDist = [...bins.entries()].map(([confidence, count]) => ({ confidence, count }))
      }
      out.voteYesNoSplit = { yes_like: 0, no_like: 0, other: 0 }
    }

    // --- Anonymous split ---
    try {
      const { count: anonC } = await admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .eq('is_anonymous', true)
      const { count: regC } = await admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      out.voterSplit = [
        { voter_type: 'anonymous', count: anonC ?? 0 },
        { voter_type: 'registered', count: regC ?? 0 },
      ]
    } catch {
      out.voterSplit = [
        { voter_type: 'anonymous', count: 0 },
        { voter_type: 'registered', count: out.kpis.registered_votes },
      ]
    }

    // --- Drift: top 5 markets, history 28d ---
    const top5 = pmList.slice(0, 5).map((p: { id: string; title?: string }) => ({ id: p.id, title: String(p.title ?? '') }))
    const since28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    const ids5 = top5.map((x) => x.id)
    if (ids5.length) {
      const { data: hist } = await admin
        .from('prediction_market_history')
        .select('market_id, probability, recorded_at')
        .in('market_id', ids5)
        .gte('recorded_at', since28)
        .order('recorded_at', { ascending: true })
        .limit(5000)
      const byM = new Map<string, { t: string; y: number }[]>()
      for (const h of hist ?? []) {
        const row = h as { market_id: string; probability: number; recorded_at: string }
        const y = normProb(Number(row.probability))
        const arr = byM.get(row.market_id) ?? []
        arr.push({ t: row.recorded_at, y })
        byM.set(row.market_id, arr)
      }
      out.driftSeries = top5.map((m) => ({
        marketId: m.id,
        title: m.title,
        points: byM.get(m.id) ?? [],
      }))
    }
  } catch (e) {
    pushErr('fetchIntelligenceDashboard', e)
  }

  return out
}
