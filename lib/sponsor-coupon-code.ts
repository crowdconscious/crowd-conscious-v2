import { randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Per-sponsor login code utilities. Distinct from the global `coupon_codes`
 * promo table — see migration 213 for the naming caveat.
 *
 * Format: 8 chars, A-Z + 2-9 (no 0/O/1/I to avoid manual-entry confusion).
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8
const MAX_GENERATION_ATTEMPTS = 8

export function generateSponsorCouponCode(length: number = CODE_LENGTH): string {
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function normalizeSponsorCouponCode(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase()
}

/**
 * Generate a code that is not already in use by another sponsor account.
 * Collisions in 32^8 (~1.1 trillion) space are astronomically unlikely, but
 * the unique index would reject a duplicate INSERT anyway — this just avoids
 * the user-visible error.
 */
export async function generateUniqueSponsorCouponCode(
  admin: SupabaseClient,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateSponsorCouponCode()
    const { data, error } = await admin
      .from('sponsor_accounts')
      .select('id')
      .eq('coupon_code', candidate)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to verify coupon uniqueness: ${error.message}`)
    }
    if (!data) {
      return candidate
    }
  }
  throw new Error('Could not generate a unique coupon code after multiple attempts')
}

/**
 * Mask a coupon for the admin list view: keep last 4 chars visible.
 * "ABC123XY" -> "••••23XY"
 */
export function maskSponsorCouponCode(code: string | null | undefined): string {
  if (!code) return '—'
  if (code.length <= 4) return code
  const visible = code.slice(-4)
  return `${'•'.repeat(code.length - 4)}${visible}`
}
