/**
 * Invite + session token hashing for Prompt 9.
 * Pepper: CICERON_INVITE_PEPPER (default matches migration seed hashes).
 */

import { createHash, randomBytes } from 'crypto'

/** Must match hashes seeded in 317_ciceron_demo_invites.sql */
export const CICERON_INVITE_PEPPER_DEFAULT = 'ciceron-demo-pepper-v1'

export function invitePepper(): string {
  return process.env.CICERON_INVITE_PEPPER?.trim() || CICERON_INVITE_PEPPER_DEFAULT
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase()
}

export function hashInviteCode(
  code: string,
  pepper: string = invitePepper()
): string {
  const normalized = normalizeInviteCode(code)
  return createHash('sha256').update(`${pepper}:${normalized}`).digest('hex')
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
