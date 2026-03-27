/**
 * Compute `resolution_date` for a micro-market from kickoff + duration options.
 * Ensures end is always slightly after `now` when the computed time is in the past.
 */
export function computeMicroMarketEndDate(
  matchDateIso: string,
  opts: {
    expiresInMinutes?: number | null
    preset?: 'halftime' | 'fulltime' | null
  }
): string {
  const now = Date.now()
  const kickoff = new Date(matchDateIso).getTime()
  const minAhead = 60 * 1000

  if (opts.expiresInMinutes != null && opts.expiresInMinutes > 0) {
    return new Date(now + opts.expiresInMinutes * 60 * 1000).toISOString()
  }

  if (opts.preset === 'halftime') {
    const t = kickoff + 45 * 60 * 1000
    return new Date(Math.max(t, now + minAhead)).toISOString()
  }

  if (opts.preset === 'fulltime') {
    const t = kickoff + 90 * 60 * 1000
    return new Date(Math.max(t, now + minAhead)).toISOString()
  }

  return new Date(now + 10 * 60 * 1000).toISOString()
}
