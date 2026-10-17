/**
 * Contraste IA visibility rule (Francisco, 2026-10-17). Enforced server-side:
 *  - Admins: always.
 *  - Closed/resolved Pulse: everyone.
 *  - Open Pulse: only a viewer who has voted (account or guest id).
 *  - Sponsor/org clients see it in their report (separate token-gated route).
 * Anyone else gets NO prediction data, only a content-free teaser flag.
 */
export function canSeeContraste(v: { isAdmin: boolean; isClosed: boolean; hasVoted: boolean }): boolean {
  return v.isAdmin || v.isClosed || v.hasVoted
}

export const CONTRASTE_TEASER_ES = 'La IA ya respondió. Vota para ver si coincides.'
export const CONTRASTE_TEASER_EN = 'The AI has already answered. Vote to see if you match.'
