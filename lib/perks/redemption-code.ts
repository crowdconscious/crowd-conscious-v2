/** Characters used in DB generate_perk_redemption_code — keep in sync with migration 244. */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Client-side display normalizer (codes are always uppercase in DB). */
export function normalizeRedemptionCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidRedemptionCodeFormat(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code)
}

/** Fallback generator for tests/scripts — production uses Postgres RPC. */
export function generateRedemptionCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}
