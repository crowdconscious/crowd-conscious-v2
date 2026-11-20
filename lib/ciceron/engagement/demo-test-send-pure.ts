import { copy } from '@/lib/ciceron/copy/es-MX'

/**
 * Map internal error codes to safe Spanish copy.
 * Never echo tokens, env values, or full recipient addresses.
 */
export function humanizeDemoTestError(
  error: string,
  channel: 'email' | 'whatsapp',
  maskedRecipient?: string | null
): string {
  switch (error) {
    case 'email_disabled':
    case 'whatsapp_disabled':
    case 'CICERON_WHATSAPP_ENABLED off':
    case 'CICERON_MORNING_EMAIL_ENABLED off':
    case 'missing WhatsApp Cloud API env placeholders':
      return copy.morningEmail.testSendErrorDisabled
    case 'recipient_missing':
      return channel === 'whatsapp'
        ? copy.whatsapp.testSendErrorRecipient
        : copy.morningEmail.testSendErrorRecipient
    case 'forbidden':
    case 'demo_firm_only':
      return copy.morningEmail.sendDemoTestForbidden
    case 'invalid_recipient':
      return channel === 'whatsapp'
        ? copy.whatsapp.testSendErrorRecipient
        : copy.morningEmail.testSendErrorRecipient
    default:
      break
  }
  // Graph / Resend failures — keep message short; never pass through secrets.
  if (/token|bearer|secret|key=|Authorization/i.test(error)) {
    return copy.morningEmail.testSendErrorGeneric
  }
  if (channel === 'whatsapp' && maskedRecipient) {
    return copy.whatsapp.testSendErrorWithRecipient(maskedRecipient)
  }
  return copy.morningEmail.testSendErrorGeneric
}
