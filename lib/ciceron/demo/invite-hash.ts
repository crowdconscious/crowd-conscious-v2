/**
 * Invite + session token hashing for Prompt 9.
 * CICERON_INVITE_PEPPER is required for any DB-backed hash (fail closed).
 * Pepper value is never committed to the repository.
 */

import { createHash, randomBytes } from 'crypto'

/** Intentionally public demo invite codes (only ones offline/DB-seeded). */
export const PUBLIC_DEMO_INVITE_CODES = ['DESPACHO-DEMO', 'DESPACHO-PASANTE'] as const

export type PublicDemoInviteCode = (typeof PUBLIC_DEMO_INVITE_CODES)[number]

export function isPublicDemoInviteCode(code: string): boolean {
  return (PUBLIC_DEMO_INVITE_CODES as readonly string[]).includes(
    normalizeInviteCode(code)
  )
}

/**
 * Fail closed: production and any hash path require the env pepper.
 * Do not fall back to a repo default.
 */
export function requireInvitePepper(): string {
  const pepper = process.env.CICERON_INVITE_PEPPER?.trim()
  if (!pepper) {
    throw new Error('CICERON_INVITE_PEPPER is required')
  }
  return pepper
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase()
}

export function hashInviteCode(code: string, pepper?: string): string {
  const normalized = normalizeInviteCode(code)
  const usePepper = pepper ?? requireInvitePepper()
  return createHash('sha256').update(`${usePepper}:${normalized}`).digest('hex')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Opaque cookie value (64 hex chars). */
export function mintSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function isSessionTokenShape(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.trim())
}
