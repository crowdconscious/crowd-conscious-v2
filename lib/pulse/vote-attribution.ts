/**
 * Landing attribution for Pulse votes (via / src query params).
 *
 * Printed QR:  /stand?via=semana-accion&src=qr
 * IG Stories:  /stand?via=semana-accion&src=social_ig
 *
 * /stand forwards these onto /pulse/<id>. We capture them in sessionStorage
 * so they survive soft remounts and login/signup redirects, then attach them
 * to the vote row after the RPC succeeds. Never required for vote validity.
 */

export const VOTE_ATTRIBUTION_SESSION_KEY = 'cc_vote_attribution'

/** Max length after sanitize (short slug; never free-text). */
export const VOTE_ATTRIBUTION_MAX_LEN = 40

/** Lowercase [a-z0-9._-] only. */
const ATTR_RE = /^[a-z0-9._-]+$/

export type VoteAttribution = {
  via: string | null
  src: string | null
}

/** Sanitize a single via/src query value. Invalid → null (never rejects the vote). */
export function sanitizeAttributionParam(
  raw: unknown,
  maxLen: number = VOTE_ATTRIBUTION_MAX_LEN
): string | null {
  if (raw == null) return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const trimmed = String(raw).trim().toLowerCase()
  if (!trimmed || trimmed.length > maxLen) return null
  if (!ATTR_RE.test(trimmed)) return null
  return trimmed
}

export function parseVoteAttribution(input: {
  via?: unknown
  src?: unknown
}): VoteAttribution {
  return {
    via: sanitizeAttributionParam(input.via),
    src: sanitizeAttributionParam(input.src),
  }
}

export function hasVoteAttribution(attr: VoteAttribution | null | undefined): boolean {
  return !!(attr?.via || attr?.src)
}

/** Persist landing attribution for this tab (survives login redirect). */
export function storeVoteAttribution(attr: VoteAttribution): void {
  if (typeof window === 'undefined') return
  if (!hasVoteAttribution(attr)) return
  try {
    const existing = readStoredVoteAttribution()
    const merged: VoteAttribution = {
      via: attr.via ?? existing?.via ?? null,
      src: attr.src ?? existing?.src ?? null,
    }
    sessionStorage.setItem(VOTE_ATTRIBUTION_SESSION_KEY, JSON.stringify(merged))
  } catch {
    // private mode / quota — vote still works without attribution
  }
}

export function readStoredVoteAttribution(): VoteAttribution | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(VOTE_ATTRIBUTION_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { via?: unknown; src?: unknown }
    const attr = parseVoteAttribution(parsed)
    return hasVoteAttribution(attr) ? attr : null
  } catch {
    return null
  }
}

/**
 * Capture via/src from the current URL into sessionStorage.
 * Call once on /pulse/[id] mount (client).
 */
export function captureVoteAttributionFromSearchParams(
  params: URLSearchParams | { get: (key: string) => string | null }
): VoteAttribution {
  const attr = parseVoteAttribution({
    via: params.get('via'),
    src: params.get('src'),
  })
  storeVoteAttribution(attr)
  return attr
}

/** Resolve attribution for a vote submit: body → stored → empty. */
export function resolveVoteAttribution(body?: {
  via?: unknown
  src?: unknown
}): VoteAttribution {
  const fromBody = parseVoteAttribution(body ?? {})
  if (hasVoteAttribution(fromBody)) return fromBody
  return readStoredVoteAttribution() ?? { via: null, src: null }
}

/**
 * Build a /pulse/<id> return path that keeps via/src for login/signup redirects.
 */
export function buildPulseRedirectPath(
  marketId: string,
  attr?: VoteAttribution | null
): string {
  const url = new URL(`/pulse/${marketId}`, 'https://example.com')
  const resolved = attr ?? readStoredVoteAttribution()
  if (resolved?.via) url.searchParams.set('via', resolved.via)
  if (resolved?.src) url.searchParams.set('src', resolved.src)
  return url.pathname + url.search
}
