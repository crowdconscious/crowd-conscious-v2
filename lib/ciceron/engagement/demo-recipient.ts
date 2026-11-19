/**
 * Configured demo recipients for live test sends (email / WhatsApp).
 * Never hardcode addresses — read from env only.
 */

export function readDemoRecipientEmail(
  env: Record<string, string | undefined> = process.env
): string | null {
  const v = env.CICERON_DEMO_RECIPIENT_EMAIL?.trim().toLowerCase()
  if (!v) return null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return null
  return v
}

/** E.164 digits only (e.g. 5215512345678). */
export function readDemoRecipientWhatsApp(
  env: Record<string, string | undefined> = process.env
): string | null {
  const raw = env.CICERON_DEMO_RECIPIENT_WHATSAPP?.trim() ?? ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  return digits
}

export function canSendDemoLiveTest(role: string): boolean {
  return role === 'admin' || role === 'socio'
}
