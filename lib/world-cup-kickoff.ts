/** Opening match: June 11, 2026, 5:00 PM Mexico City (CDT, UTC-5) — Estadio Azteca */
export const WORLD_CUP_KICKOFF = new Date('2026-06-11T17:00:00-05:00')

export function daysUntilWorldCup(now = Date.now()): number {
  const ms = WORLD_CUP_KICKOFF.getTime() - now
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
