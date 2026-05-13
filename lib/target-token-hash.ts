/**
 * Server-side helpers for citizen_target_access_tokens.
 *
 * Tokens are delivered to a target rep exactly once (in the magic-link URL
 * an admin emails them); only the SHA-256 hex of the raw token is stored.
 * Subsequent dashboard requests hash the URL param and compare against the
 * stored hash with a timing-safe compare.
 *
 * MVP token lifetime: 90 days. Admin can revoke earlier from the triage UI.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const TARGET_TOKEN_RAW_BYTES = 24 // 24 bytes → 32 base64url chars

export const TARGET_TOKEN_DEFAULT_TTL_DAYS = 90

export function mintRawTargetToken(): string {
  return randomBytes(TARGET_TOKEN_RAW_BYTES).toString('base64url')
}

export function hashTargetToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

/**
 * Timing-safe compare between an expected token hash (hex from the DB) and
 * the freshly-computed hash of a candidate raw token. Returns false on any
 * length mismatch instead of throwing.
 */
export function safeHashEquals(expectedHex: string, candidateHex: string): boolean {
  if (
    typeof expectedHex !== 'string' ||
    typeof candidateHex !== 'string' ||
    expectedHex.length !== candidateHex.length
  ) {
    return false
  }
  try {
    const a = Buffer.from(expectedHex, 'hex')
    const b = Buffer.from(candidateHex, 'hex')
    if (a.length !== b.length || a.length === 0) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function defaultExpiryDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + TARGET_TOKEN_DEFAULT_TTL_DAYS)
  return d
}
