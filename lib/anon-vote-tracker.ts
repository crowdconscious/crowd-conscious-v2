/**
 * Lightweight client-side counter of anonymous votes.
 *
 * The `cc_session` cookie is httpOnly (set by /api/live/join-anonymous),
 * so we can't read it from JS. Instead we track how many times the user
 * has voted anonymously in this browser so we can show the right nudge
 * at the right time:
 *
 *   1st vote  → inline "your vote moved the consensus" toast
 *   3rd vote  → soft gate overlay (this returns `shouldShowSoftGate: true`)
 *
 * The counter is cleared on successful account creation by the auth
 * callback (setting `cc_just_converted` so we can show the celebration).
 */

const STORAGE_KEY = 'cc_anon_vote_count'
const XP_KEY = 'cc_anon_xp_estimate'
const DISMISSED_KEY = 'cc_anon_gate_dismissed_at'
const GATE_AT_VOTE = 3
/** Re-show the gate after 24h if dismissed (users might still convert). */
const GATE_COOLDOWN_MS = 24 * 60 * 60 * 1000

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function getAnonVoteCount(): number {
  const store = safeStorage()
  if (!store) return 0
  const raw = store.getItem(STORAGE_KEY)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function getAnonXpEstimate(): number {
  const store = safeStorage()
  if (!store) return 0
  const raw = store.getItem(XP_KEY)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export type AnonVoteRecordResult = {
  count: number
  xpTotal: number
  /** true the first time the user hits `GATE_AT_VOTE` (or after cooldown). */
  shouldShowSoftGate: boolean
}

export function recordAnonVote(xpEarned: number = 5): AnonVoteRecordResult {
  const store = safeStorage()
  if (!store) {
    return { count: 0, xpTotal: 0, shouldShowSoftGate: false }
  }
  const count = getAnonVoteCount() + 1
  const xpTotal = getAnonXpEstimate() + Math.max(0, xpEarned)
  store.setItem(STORAGE_KEY, String(count))
  store.setItem(XP_KEY, String(xpTotal))

  const dismissedAt = Number.parseInt(store.getItem(DISMISSED_KEY) ?? '0', 10)
  const cooledDown =
    !Number.isFinite(dismissedAt) || dismissedAt <= 0 || Date.now() - dismissedAt > GATE_COOLDOWN_MS

  const shouldShowSoftGate = count >= GATE_AT_VOTE && cooledDown
  return { count, xpTotal, shouldShowSoftGate }
}

export function dismissAnonSoftGate(): void {
  const store = safeStorage()
  if (!store) return
  store.setItem(DISMISSED_KEY, String(Date.now()))
}

export function resetAnonVoteTracker(): void {
  const store = safeStorage()
  if (!store) return
  store.removeItem(STORAGE_KEY)
  store.removeItem(XP_KEY)
  store.removeItem(DISMISSED_KEY)
}

export const ANON_GATE_VOTE_THRESHOLD = GATE_AT_VOTE
