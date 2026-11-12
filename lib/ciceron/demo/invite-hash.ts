/**
 * Invite + session token hashing for Prompt 9.
 *
 * Two-pepper scheme:
 * - pepper_version=1 → CICERON_INVITE_PEPPER — only the intentionally public
 *   demo codes (DESPACHO-DEMO, DESPACHO-PASANTE). Public by design.
 * - pepper_version=2 → CICERON_INVITE_PEPPER_V2 — every invite minted at
 *   runtime (ops script / admin). Secret; never committed.
 *
 * Lookup hashes the submitted code with each configured pepper and matches
 * `invite_codes.code_hash`; the row's `pepper_version` records which pepper
 * was used at insert. Fail closed when the needed pepper env is missing.
 */

import { createHash, randomBytes } from 'crypto'

/** Intentionally public demo invite codes (only ones DB-seeded; pepper_version=1). */
export const PUBLIC_DEMO_INVITE_CODES = ['DESPACHO-DEMO', 'DESPACHO-PASANTE'] as const

export type PublicDemoInviteCode = (typeof PUBLIC_DEMO_INVITE_CODES)[number]

export type InvitePepperVersion = 1 | 2

export function isPublicDemoInviteCode(code: string): boolean {
  return (PUBLIC_DEMO_INVITE_CODES as readonly string[]).includes(
    normalizeInviteCode(code)
  )
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Resolve pepper for a version. Fail closed — no repo defaults.
 */
export function requireInvitePepper(version: InvitePepperVersion): string {
  if (version === 1) {
    const pepper = process.env.CICERON_INVITE_PEPPER?.trim()
    if (!pepper) {
      throw new Error('CICERON_INVITE_PEPPER is required')
    }
    return pepper
  }
  const pepper = process.env.CICERON_INVITE_PEPPER_V2?.trim()
  if (!pepper) {
    throw new Error('CICERON_INVITE_PEPPER_V2 is required')
  }
  return pepper
}

/** @deprecated Prefer requireInvitePepper(1 | 2). Kept as alias for v1. */
export function requireInvitePepperV1(): string {
  return requireInvitePepper(1)
}

export function hashInviteCodeWithPepper(code: string, pepper: string): string {
  const normalized = normalizeInviteCode(code)
  return createHash('sha256').update(`${pepper}:${normalized}`).digest('hex')
}

export function hashInviteCode(
  code: string,
  versionOrPepper: InvitePepperVersion | string = 1
): string {
  if (typeof versionOrPepper === 'string') {
    return hashInviteCodeWithPepper(code, versionOrPepper)
  }
  return hashInviteCodeWithPepper(code, requireInvitePepper(versionOrPepper))
}

/**
 * Candidate hashes for redeem lookup. Includes every configured pepper version.
 * Throws if neither pepper env is set (fail closed for DB redeem).
 */
export function inviteHashCandidates(
  code: string
): { version: InvitePepperVersion; hash: string }[] {
  const v1 = process.env.CICERON_INVITE_PEPPER?.trim()
  const v2 = process.env.CICERON_INVITE_PEPPER_V2?.trim()
  if (!v1 && !v2) {
    throw new Error(
      'CICERON_INVITE_PEPPER or CICERON_INVITE_PEPPER_V2 is required'
    )
  }
  const out: { version: InvitePepperVersion; hash: string }[] = []
  if (v1) out.push({ version: 1, hash: hashInviteCodeWithPepper(code, v1) })
  if (v2) out.push({ version: 2, hash: hashInviteCodeWithPepper(code, v2) })
  return out
}

/**
 * Hash for inserting a new invite. Runtime mints always use version 2.
 */
export function hashInviteCodeForInsert(
  code: string,
  version: InvitePepperVersion = 2
): { hash: string; pepperVersion: InvitePepperVersion } {
  return {
    hash: hashInviteCode(code, version),
    pepperVersion: version,
  }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Opaque cookie value (64 hex chars). */
export function mintSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/** High-entropy invite code for ops mint (printed once; never stored). */
export function mintInviteCode(): string {
  // Crockford-ish uppercase alphanumeric without ambiguous chars
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(20)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i]! % alphabet.length]
  }
  // Group for readability: XXXX-XXXX-…
  return out.match(/.{1,4}/g)?.join('-') ?? out
}

export function isSessionTokenShape(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim())
}
