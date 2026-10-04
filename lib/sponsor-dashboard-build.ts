import type { SponsorDashboardMarketRow } from '@/components/sponsor/types'
import { resolveOutcomeAvgConfidence } from '@/lib/pulse-vote-aggregates'

type OutcomeRow = {
  id: string
  label: string
  probability: number
  vote_count?: number | null
  total_confidence?: number | null
  confident_pick_count?: number | null
}

type MarketRaw = {
  id: string
  title: string
  status: string
  total_votes: number | null
  resolution_date: string
  is_pulse: boolean
  is_draft?: boolean | null
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
    const people = m.total_votes ?? mv.length

    // Prefer maintained pick-level totals (multi-correct). Fall back to
    // primary market_votes.confidence when outcome columns are missing.
    let confSumAll = 0
    let confNAll = 0
    for (const o of m.market_outcomes ?? []) {
      const n = Number(o.confident_pick_count ?? 0)
      if (n > 0) {
        confSumAll += Number(o.total_confidence ?? 0)
        confNAll += n
      }
    }
    const avgConfidence =
      confNAll > 0
        ? confSumAll / confNAll
        : (() => {
            const stated = mv.filter((v) => v.confidence >= 1 && v.confidence <= 10)
            if (!stated.length) return null
            return stated.reduce((s, v) => s + v.confidence, 0) / stated.length
          })()

    const strongOpinionCount = mv.filter((v) => v.confidence >= 8).length

    const confidenceBuckets = Array.from({ length: 10 }, () => 0)
    for (const v of mv) {
      if (v.confidence < 1 || v.confidence > 10) continue
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

    // Pulses are multi: card bars show people-share (vote_count / people).
    // Non-Pulse keeps certainty-weighted probability.
    const outcomes = (m.market_outcomes ?? []).map((o) => {
      const voteCount = Number(o.vote_count ?? 0)
      const peopleShare = people > 0 ? voteCount / people : 0
      return {
        id: o.id,
        label: o.label,
        probability: m.is_pulse ? peopleShare : Number(o.probability),
        vote_count: voteCount,
        total_confidence: o.total_confidence,
        confident_pick_count: o.confident_pick_count,
      }
    })

    let top = outcomes[0] ?? { label: '—', probability: 0 }
    for (const o of outcomes) {
      if (o.probability > top.probability) top = o
    }

    const avgConfidenceByOutcome = outcomes.map((o) => {
      const avg =
        resolveOutcomeAvgConfidence({
          totalConfidence: o.total_confidence,
          confidentPickCount: o.confident_pick_count,
        }) ?? 0
      return {
        outcomeId: o.id,
        label: o.label,
        avg,
        count: o.vote_count ?? 0,
      }
    })

    return {
      id: m.id,
      title: m.title,
      status: m.status,
      isDraft: Boolean(m.is_draft),
      totalVotes: people,
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
