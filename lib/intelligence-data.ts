/**
 * Intelligence Hub — server-side aggregates from Supabase.
 *
 * Schema notes (this codebase):
 * - Admin flag: profiles.user_type === 'admin' (no is_admin column in types)
 * - Fund balance: public.conscious_fund (not conscious_fund_contributions)
 * - User counts: profiles (auth.users not queryable from PostgREST)
 * - Guest votes: market_votes.is_anonymous (migration 147)
 */

import { createAdminClient } from '@/lib/supabase-admin'

export type TopMarketRow = {
  id: string
  title: string
  category: string
  total_votes: number
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
  avg_yes_probability: number
  total_votes: number
}
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
  yes_probability: number
  status: string
  resolution_date: string | null
}

export type IntelligenceDashboardData = {
  kpis: {
    registered_votes: number
    total_votes: number
    total_users: number
    active_markets: number
    orphan_markets: number
    avg_confidence: number | null
    fund_total: number | null
  }
  votesOverTime: VotesByDay[]
  votesByCategory: CategoryCount[]
  topMarkets: TopMarketRow[]
  outcomeAgg: OutcomeAgg[]
  confidenceDist: ConfidenceBin[]
  signupsOverTime: SignupsByDay[]
  leaderboard: LeaderboardRow[]
  sentimentByCategory: SentimentCategory[]
  voterSplit: VoterSplit[]
  /** Top 5 markets — probability history ~4 weeks for drift chart */
  driftSeries: { marketId: string; title: string; points: { t: string; y: number }[] }[]
  /** Larger list for Markets tab + CSV */
  allMarkets: MarketRowCsv[]
  accuracyBuckets: { label: string; count: number }[]
  loadedWithServiceRole: boolean
  errors: string[]
}

const empty = (): IntelligenceDashboardData => ({
  kpis: {
    registered_votes: 0,
    total_votes: 0,
    total_users: 0,
    active_markets: 0,
    orphan_markets: 0,
    avg_confidence: null,
    fund_total: null,
  },
  votesOverTime: [],
  votesByCategory: [],
  topMarkets: [],
  outcomeAgg: [],
  confidenceDist: [],
  signupsOverTime: [],
  leaderboard: [],
  sentimentByCategory: [],
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

function normProb(p: number): number {
  if (p == null || Number.isNaN(p)) return 0.5
  return p > 1 ? p / 100 : p
}

export async function fetchIntelligenceDashboard(): Promise<IntelligenceDashboardData> {
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
    // --- KPIs ---
    const { count: totalVotes } = await admin
      .from('market_votes')
      .select('*', { count: 'exact', head: true })
    out.kpis.total_votes = totalVotes ?? 0

    let registered = 0
    try {
      const { count: r } = await admin
        .from('market_votes')
        .select('*', { count: 'exact', head: true })
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      registered = r ?? 0
    } catch {
      registered = totalVotes ?? 0
    }
    out.kpis.registered_votes = registered

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
      const { data: fund } = await admin.from('conscious_fund').select('total_collected, current_balance').limit(1).maybeSingle()
      if (fund) {
        out.kpis.fund_total = Number(fund.total_collected ?? 0) || Number(fund.current_balance ?? 0) || null
      }
    } catch (e) {
      pushErr('conscious_fund', e)
    }

    // --- Votes last 30d ---
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: v30 } = await admin.from('market_votes').select('created_at').gte('created_at', since30)
    const byDay = new Map<string, number>()
    for (const row of v30 ?? []) {
      const k = dayKey((row as { created_at: string }).created_at)
      byDay.set(k, (byDay.get(k) ?? 0) + 1)
    }
    out.votesOverTime = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // --- Votes by category ---
    const { data: allVotes } = await admin.from('market_votes').select('market_id')
    const { data: allM } = await admin.from('prediction_markets').select('id, category')
    const catMap = new Map((allM ?? []).map((m: { id: string; category: string }) => [m.id, m.category]))
    const catCount = new Map<string, number>()
    for (const v of allVotes ?? []) {
      const mid = (v as { market_id: string }).market_id
      const c = catMap.get(mid) ?? 'unknown'
      catCount.set(c, (catCount.get(c) ?? 0) + 1)
    }
    out.votesByCategory = [...catCount.entries()]
      .map(([category, vote_count]) => ({ category, vote_count }))
      .sort((a, b) => b.vote_count - a.vote_count)

    // --- Top markets + all markets for table ---
    const { data: topPm } = await admin
      .from('prediction_markets')
      .select('id, title, category, total_votes, status, resolution_date, current_probability')
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(200)

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
      return {
        id,
        title: String(p.title ?? ''),
        category: String(p.category ?? ''),
        total_votes: Number(p.total_votes ?? 0),
        status: String(p.status ?? ''),
        resolution_date: (p.resolution_date as string | null) ?? null,
        yes_probability: yp,
      }
    })

    out.allMarkets = pmList.map((p: Record<string, unknown>) => {
      const id = p.id as string
      const cp = Number(p.current_probability ?? 50)
      const yesP = cp > 1 ? cp / 100 : cp
      return {
        id,
        title: String(p.title ?? ''),
        category: String(p.category ?? ''),
        total_votes: Number(p.total_votes ?? 0),
        yes_probability: yesP,
        status: String(p.status ?? ''),
        resolution_date: (p.resolution_date as string | null) ?? null,
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

    // --- Confidence 1–10 ---
    const { data: allConf } = await admin.from('market_votes').select('confidence').limit(250000)
    const bins = new Map<number, number>()
    for (let i = 1; i <= 10; i++) bins.set(i, 0)
    for (const r of allConf ?? []) {
      const c = Math.round(Number((r as { confidence: number }).confidence))
      if (c >= 1 && c <= 10) bins.set(c, (bins.get(c) ?? 0) + 1)
    }
    out.confidenceDist = [...bins.entries()].map(([confidence, count]) => ({ confidence, count }))

    // --- Signups profiles 30d ---
    const { data: prof30 } = await admin.from('profiles').select('created_at').gte('created_at', since30)
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

    // --- Sentiment by category ---
    const { data: pms } = await admin.from('prediction_markets').select('id, category')
    const { data: mos } = await admin.from('market_outcomes').select('market_id, label, probability')
    const { data: mvAll } = await admin.from('market_votes').select('market_id')
    const votesPerMarket = new Map<string, number>()
    for (const v of mvAll ?? []) {
      const id = (v as { market_id: string }).market_id
      votesPerMarket.set(id, (votesPerMarket.get(id) ?? 0) + 1)
    }
    const yesByMarket = new Map<string, number>()
    for (const o of mos ?? []) {
      const row = o as { market_id: string; label: string; probability: number }
      if (isYesLabel(row.label)) yesByMarket.set(row.market_id, normProb(Number(row.probability)))
    }
    const sentMap = new Map<string, { wSum: number; w: number; votes: number }>()
    for (const m of pms ?? []) {
      const row = m as { id: string; category: string }
      const cat = row.category
      const y = yesByMarket.get(row.id)
      if (y == null) continue
      const vc = votesPerMarket.get(row.id) ?? 0
      const cur = sentMap.get(cat) ?? { wSum: 0, w: 0, votes: 0 }
      cur.wSum += y * Math.max(1, vc)
      cur.w += Math.max(1, vc)
      cur.votes += vc
      sentMap.set(cat, cur)
    }
    out.sentimentByCategory = [...sentMap.entries()]
      .map(([category, v]) => ({
        category,
        avg_yes_probability: v.w > 0 ? v.wSum / v.w : 0,
        total_votes: v.votes,
      }))
      .sort((a, b) => b.avg_yes_probability - a.avg_yes_probability)

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
        { voter_type: 'registered', count: out.kpis.total_votes },
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
