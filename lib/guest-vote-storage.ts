/**
 * Browser guest identity + per-market vote tracking (localStorage).
 * Guest votes are stored in Supabase market_votes with user_id = guest UUID.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const GUEST_ID_KEY = 'cc_guest_id'

/** Single JSON map: marketId → { guest_id, outcome_id, voted_at } for list badges + dedupe */
export const VOTED_MARKETS_MAP_KEY = 'cc_voted_markets'

export type GuestVoteRecord = {
  outcomeId: string
  confidence: number
  voteYesNo: 'yes' | 'no' | null
}

/** Stable per-browser guest id (not an auth user). */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id || !UUID_RE.test(id)) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

/** `cc_voted_[marketId]` stores guest_id when that guest has voted on this market. */
export function getVotedGuestIdForMarket(marketId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(`cc_voted_${marketId}`)
    return v && UUID_RE.test(v) ? v : null
  } catch {
    return null
  }
}

export function getGuestVoteDetail(marketId: string): GuestVoteRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`cc_guest_vote_${marketId}`)
    if (!raw) return null
    return JSON.parse(raw) as GuestVoteRecord
  } catch {
    return null
  }
}

export function setMarketGuestVote(marketId: string, guestId: string, record: GuestVoteRecord): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`cc_voted_${marketId}`, guestId)
    localStorage.setItem(`cc_guest_vote_${marketId}`, JSON.stringify(record))
    const raw = localStorage.getItem(VOTED_MARKETS_MAP_KEY)
    const map = (raw ? JSON.parse(raw) : {}) as Record<
      string,
      { guest_id?: string; outcome_id?: string; voted_at?: number }
    >
    map[marketId] = {
      guest_id: guestId,
      outcome_id: record.outcomeId,
      voted_at: Date.now(),
    }
    localStorage.setItem(VOTED_MARKETS_MAP_KEY, JSON.stringify(map))
  } catch {
    // ignore quota
  }
}

/** Market IDs the guest has already voted on (for list badges). */
export function getGuestVotedMarketIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(VOTED_MARKETS_MAP_KEY)
    if (!raw) return new Set()
    const map = JSON.parse(raw) as Record<string, unknown>
    return new Set(Object.keys(map).filter((k) => map[k] != null))
  } catch {
    return new Set()
  }
}

export function hasGuestVotedMarket(marketId: string): boolean {
  return getGuestVotedMarketIds().has(marketId)
}

export function clearGuestMarketKeys(marketId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`cc_voted_${marketId}`)
    localStorage.removeItem(`cc_guest_vote_${marketId}`)
  } catch {
    // ignore
  }
}

/** Pending claim after signup (survives email confirmation). */
export const PENDING_VOTE_KEY = 'cc_pending_vote'

export type PendingVotePayload = {
  marketId: string
  outcomeId: string
  confidence: number
  vote?: 'yes' | 'no'
  /** Required to claim anonymous row in market_votes */
  guestId: string
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
