import { copy } from '@/lib/ciceron/copy/es-MX'
import { buildWhatsAppClickToChatUrl } from '@/lib/ciceron/whatsapp/click-to-chat-pure'

/** Zero-setup: opens wa.me; user presses send in WhatsApp. */
export function WhatsAppShareButton(props: {
  clientName: string
  headline: string
  detail?: string
  sourceLabel?: string
  officialUrl?: string
  phoneE164Digits?: string | null
}) {
  const href = buildWhatsAppClickToChatUrl({
    clientName: props.clientName,
    headline: props.headline,
    detail: props.detail,
    sourceLabel: props.sourceLabel,
    officialUrl: props.officialUrl,
    phoneE164Digits: props.phoneE164Digits,
  })

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="cic-btn cic-btn-secondary"
      style={{ fontSize: '0.85rem', padding: '8px 12px', display: 'inline-block' }}
    >
      {copy.whatsapp.send}
    </a>
  )
}
