/**
 * Zero-setup WhatsApp click-to-chat (wa.me).
 * Opens WhatsApp with a prefilled Spanish message; the user presses send.
 */

export type WhatsAppShareInput = {
  /** Digits only, country code included (e.g. 52155…). Optional — opens chat picker if omitted. */
  phoneE164Digits?: string | null
  clientName: string
  headline: string
  detail?: string
  sourceLabel?: string
  officialUrl?: string
}

export function buildClientFriendlyWhatsAppMessage(
  input: WhatsAppShareInput
): string {
  const lines = [
    `Estimado/a ${input.clientName.trim() || 'cliente'}:`,
    '',
    input.headline.trim(),
  ]
  if (input.detail?.trim()) {
    lines.push('', input.detail.trim())
  }
  if (input.sourceLabel?.trim()) {
    lines.push('', `Fuente: ${input.sourceLabel.trim()}`)
  }
  if (input.officialUrl?.trim()) {
    lines.push(input.officialUrl.trim())
  }
  lines.push(
    '',
    'Este mensaje es informativo y no constituye una notificación judicial.',
    '',
    'Quedo atento/a a sus comentarios.',
    'Despacho'
  )
  return lines.join('\n')
}

/** Build https://wa.me/... URL with encoded text. */
export function buildWhatsAppClickToChatUrl(input: WhatsAppShareInput): string {
  const text = buildClientFriendlyWhatsAppMessage(input)
  const phone = (input.phoneE164Digits ?? '').replace(/\D/g, '')
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(text)}`
}
