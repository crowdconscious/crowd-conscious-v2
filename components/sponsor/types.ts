export type SponsorOutcomeRow = {
  id: string
  label: string
  /** For Pulses: people-share (vote_count / total people). Else certainty share. */
  probability: number
  vote_count?: number | null
  total_confidence?: number | null
  confident_pick_count?: number | null
}

export type SponsorDashboardMarketRow = {
  id: string
  title: string
  status: string
  isDraft: boolean
  totalVotes: number
  resolutionDate: string
  isPulse: boolean
  currentProbability: number
  outcomes: SponsorOutcomeRow[]
  avgConfidence: number | null
  strongOpinionCount: number
  topOutcomeLabel: string
  topOutcomePct: number
  confidenceBuckets: number[]
  votesByDay: { date: string; count: number }[]
  avgConfidenceByOutcome: { outcomeId: string; label: string; avg: number; count: number }[]
}

export type FundImpactRow = {
  amount: number
  description: string | null
  created_at: string
}
