/**
 * Public goal for the Conscious Fund thermometer.
 *
 * The thermometer is shown on landing, footer, and /predictions/fund. The
 * value is configurable via `NEXT_PUBLIC_CONSCIOUS_FUND_GOAL_MXN` so it can be
 * raised without a code change as the fund grows.
 */
export const CONSCIOUS_FUND_GOAL_MXN: number = (() => {
  const raw = process.env.NEXT_PUBLIC_CONSCIOUS_FUND_GOAL_MXN
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 100_000
})()
