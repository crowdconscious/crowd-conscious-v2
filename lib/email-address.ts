/**
 * Pragmatic "will Resend accept this To address?" check (pure; unit-tested).
 * Resend rejects the whole request with 422 validation_error for a bad `to`,
 * e.g. a domain without a TLD ("name@duck"). Bulk senders skip + log instead.
 */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/

export function isSendableEmail(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  const e = raw.trim()
  if (e.length < 6 || e.length > 254) return false
  if (!EMAIL_RE.test(e)) return false
  const [local] = e.split('@')
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  return true
}

/** Log-safe form: keeps the first 2 chars of the local part and the domain. */
export function maskEmail(raw: unknown): string {
  const e = String(raw ?? '').trim()
  const at = e.lastIndexOf('@')
  if (at < 0) return `${e.slice(0, 2)}***(no @)`
  return `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`
}
