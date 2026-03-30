import type { SponsorDashboardMarketRow } from '@/components/sponsor/SponsorDashboardClient'

type OutcomeRow = {
  id: string
  label: string
  probability: number
  vote_count?: number | null
}

type MarketRaw = {
  id: string
  title: string
  status: string
  total_votes: number | null
  resolution_date: string
  is_pulse: boolean
  current_probability: number
  market_outcomes: OutcomeRow[] | null
}

type VoteRow = {
  market_id: string
  confidence: number
  created_at: string
  outcome_id: string
}

export function buildSponsorDashboardMarkets(
  marketsRaw: MarketRaw[],
  votes: VoteRow[]
): SponsorDashboardMarketRow[] {
  return marketsRaw.map((m) => {
    const mv = votes.filter((v) => v.market_id === m.id)
    const avgConfidence = mv.length
      ? mv.reduce((s, v) => s + v.confidence, 0) / mv.length
      : null
    const strongOpinionCount = mv.filter((v) => v.confidence >= 8).length

    const confidenceBuckets = Array.from({ length: 10 }, () => 0)
    for (const v of mv) {
      const b = Math.min(10, Math.max(1, Math.round(Number(v.confidence))))
      confidenceBuckets[b - 1] += 1
    }

    const byDay = new Map<string, number>()
    for (const v of mv) {
      const d = v.created_at.slice(0, 10)
      byDay.set(d, (byDay.get(d) ?? 0) + 1)
    }
    const votesByDay = [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }))

    const outcomes = (m.market_outcomes ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      probability: Number(o.probability),
      vote_count: o.vote_count,
    }))

    let top = outcomes[0] ?? { label: '—', probability: 0 }
    for (const o of outcomes) {
      if (o.probability > top.probability) top = o
    }

    const avgConfidenceByOutcome = outcomes.map((o) => {
      const vs = mv.filter((x) => x.outcome_id === o.id)
      const avg = vs.length ? vs.reduce((s, x) => s + x.confidence, 0) / vs.length : 0
      return {
        outcomeId: o.id,
        label: o.label,
        avg,
        count: vs.length,
      }
    })

    return {
      id: m.id,
      title: m.title,
      status: m.status,
      totalVotes: m.total_votes ?? mv.length,
      resolutionDate: m.resolution_date,
      isPulse: m.is_pulse,
      currentProbability: m.current_probability,
      outcomes,
      avgConfidence,
      strongOpinionCount,
      topOutcomeLabel: top.label,
      topOutcomePct: top.probability,
      confidenceBuckets,
      votesByDay,
      avgConfidenceByOutcome,
    }
  })
}

export function aggregateAvgConfidence(
  markets: SponsorDashboardMarketRow[]
): number | null {
  const withVotes = markets.filter(
    (m) => m.avgConfidence != null && m.totalVotes > 0
  )
  if (withVotes.length === 0) return null
  const total = withVotes.reduce((s, m) => s + (m.avgConfidence ?? 0) * m.totalVotes, 0)
  const n = withVotes.reduce((s, m) => s + m.totalVotes, 0)
  return n > 0 ? total / n : null
}
