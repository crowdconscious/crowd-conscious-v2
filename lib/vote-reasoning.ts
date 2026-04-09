/** Standard markets + Pulse (DB max 200). */
export const VOTE_REASONING_MAX_REGULAR = 200

/** Live micro-market cards — shorter prompt in UI only. */
export const VOTE_REASONING_MAX_MICRO = 100

export function voteReasoningMaxForMarket(isMicro: boolean | null | undefined): number {
  return isMicro === true ? VOTE_REASONING_MAX_MICRO : VOTE_REASONING_MAX_REGULAR
}

export function normalizeVoteReasoning(raw: unknown, maxLen: number): string | null {
  if (raw == null) return null
  const s = typeof raw === 'string' ? raw.trim() : ''
  if (!s) return null
  return s.length > maxLen ? s.slice(0, maxLen) : s
}
