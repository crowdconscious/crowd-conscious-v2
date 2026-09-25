import { randomBytes } from 'crypto'

/** Short URL-safe share slug (8 chars). */
export function generateShareSlug(): string {
  return randomBytes(6).toString('base64url').replace(/=+$/, '').slice(0, 8)
}

export function clampText(value: string, max: number): string {
  return value.trim().slice(0, max)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
