/**
 * Per-cause dollar amounts from **actual disbursements** only (`total_disbursed`).
 * `totalFundBalance` is kept for call-site compatibility but not used for splits — allocating
 * `current_balance` by votes looked like real per-cause payouts when it was only illustrative.
 */
export function buildCauseDistributionBreakdown(
  causes: Array<{ id: string; name: string; vote_count: number }>,
  totalDisbursed: number,
  _totalFundBalance: number
): { name: string; amount: number; votes: number }[] {
  const pool = Math.max(0, totalDisbursed)
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
