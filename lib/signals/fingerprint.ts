/**
 * Client-side device fingerprint helper for the anonymous support flow.
 *
 * Generates a stable-ish SHA-256 hash of low-entropy browser signals so
 * the support endpoint can dedupe "same device, second tap" without an
 * account. This is best-effort spam prevention only — anyone running
 * multiple browsers, devices, or a private window will get a new
 * fingerprint, and that's fine for an MVP where the rate limit is the
 * real safety net.
 *
 * Cached in localStorage under `cc_anon_fp` so the value is stable
 * across visits within the same browser profile.
 *
 * SSR-safe: every entry point short-circuits to a deterministic
 * placeholder before touching `window` / `navigator`. Callers must only
 * invoke `getDeviceFingerprint` from a client component or effect.
 */

const STORAGE_KEY = 'cc_anon_fp'
const SSR_PLACEHOLDER = 'ssr-placeholder'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

async function sha256Hex(input: string): Promise<string> {
  // Browser SubtleCrypto requires a secure context (https or localhost),
  // which Vercel and dev both satisfy. We fall back to a non-crypto
  // string hash if SubtleCrypto is unavailable so behaviour stays
  // deterministic in odd environments instead of throwing.
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 0
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return `fallback_${(h >>> 0).toString(16)}`
}

function rawFingerprintInputs(): string {
  if (!isBrowser()) return SSR_PLACEHOLDER
  const ua = navigator.userAgent ?? ''
  const lang = navigator.language ?? ''
  let tz = ''
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  } catch {
    tz = ''
  }
  const screenSize =
    typeof screen !== 'undefined'
      ? `${screen.width ?? 0}x${screen.height ?? 0}`
      : '0x0'
  return [ua, tz, screenSize, lang].join('|')
}

export async function getDeviceFingerprint(): Promise<string> {
  if (!isBrowser()) return SSR_PLACEHOLDER
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY)
    if (cached && cached.length >= 16) return cached
  } catch {
    // localStorage can throw in private mode / blocked storage; fall
    // through to fresh computation.
  }

  const hash = await sha256Hex(rawFingerprintInputs())
  try {
    window.localStorage.setItem(STORAGE_KEY, hash)
  } catch {
    // Non-fatal — we will recompute next time.
  }
  return hash
}

/**
 * Server-side SHA-256 of `${ip}:${salt}`. Returns null when the salt env
 * is missing so callers can decide whether to skip the IP-hash column.
 *
 * Runs on the Node runtime exclusively (the only place we read req IP).
 */
export async function hashIpForStorage(
  ip: string | null,
  salt: string | undefined
): Promise<string | null> {
  if (!ip || !salt) return null
  // Web Crypto is available on Node 20+, which Next.js requires for the
  // Node runtime. We avoid importing `node:crypto` so this file can be
  // referenced from edge contexts later without changes.
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  const enc = new TextEncoder().encode(`${ip}:${salt}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
