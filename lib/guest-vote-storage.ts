/**
 * One anonymous vote per market per browser session (sessionStorage).
 * Cleared when the vote is submitted to Supabase after signup/login.
 */

const KEY = (marketId: string) => `cc_guest_vote_${marketId}`

export type GuestVoteRecord = {
  outcomeId: string
  confidence: number
  /** For signup URL / UX */
  voteYesNo: 'yes' | 'no' | null
}

export function getGuestVote(marketId: string): GuestVoteRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY(marketId))
    if (!raw) return null
    return JSON.parse(raw) as GuestVoteRecord
  } catch {
    return null
  }
}

export function setGuestVote(marketId: string, record: GuestVoteRecord): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY(marketId), JSON.stringify(record))
}

export function clearGuestVote(marketId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY(marketId))
}

/** Pending vote to submit after registration (survives email confirmation flow) */
export const PENDING_VOTE_KEY = 'cc_pending_vote'

export type PendingVotePayload = {
  marketId: string
  outcomeId: string
  confidence: number
  vote?: 'yes' | 'no'
}

export function setPendingVote(payload: PendingVotePayload): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_VOTE_KEY, JSON.stringify(payload))
}

export function getPendingVote(): PendingVotePayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PENDING_VOTE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingVotePayload
  } catch {
    return null
  }
}

export function clearPendingVote(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_VOTE_KEY)
}
