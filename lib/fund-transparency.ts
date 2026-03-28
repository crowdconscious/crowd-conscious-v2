/**
 * Vote-weighted illustrative breakdown of fund dollars by cause (no per-cause ledger yet).
 */
export function buildCauseDistributionBreakdown(
  causes: Array<{ id: string; name: string; vote_count: number }>,
  totalDisbursed: number,
  totalFundBalance: number
): { name: string; amount: number; votes: number }[] {
  const pool = totalDisbursed > 0 ? totalDisbursed : totalFundBalance
  if (causes.length === 0) return []
  const totalVotes = causes.reduce((s, c) => s + c.vote_count, 0)
  if (pool <= 0) {
    return causes.map((c) => ({ name: c.name, amount: 0, votes: c.vote_count }))
  }
  if (totalVotes === 0) {
    const per = Math.round(pool / causes.length)
    return causes.map((c) => ({ name: c.name, amount: per, votes: 0 }))
  }
  return causes.map((c) => ({
    name: c.name,
    votes: c.vote_count,
    amount: Math.round((c.vote_count / totalVotes) * pool),
  }))
}
