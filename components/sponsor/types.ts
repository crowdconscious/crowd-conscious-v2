export type SponsorOutcomeRow = {
  id: string
  label: string
  probability: number
  vote_count?: number | null
}

export type SponsorDashboardMarketRow = {
  id: string
  title: string
  status: string
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
