/**
 * Canonical balance for UI: `conscious_fund.current_balance` (Stripe webhook + trade fees).
 * Do not use `a || b` — when balance is 0, that wrongly falls through to `total_collected - total_disbursed`.
 */
export function consciousFundBalanceMxn(
  fund:
    | {
        current_balance?: number | null
      }
    | null
    | undefined
): number {
  if (!fund) return 0
  const n = Number(fund.current_balance ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}
