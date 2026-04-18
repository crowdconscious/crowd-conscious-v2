import type { LiveEventTypeKey } from '@/lib/live-event-types'

export type LiveEventCopyLocale = 'en' | 'es'

const LABELS: Record<
  LiveEventTypeKey,
  { noun: { es: string; en: string }; action: { es: string; en: string }; header: { es: string; en: string } }
> = {
  soccer_match: {
    noun: { es: 'el partido', en: 'the match' },
    action: { es: 'el partido esté en vivo', en: 'the match goes live' },
    header: { es: 'Partido', en: 'Match' },
  },
  product_launch: {
    noun: { es: 'el evento', en: 'the event' },
    action: { es: 'el evento comience', en: 'the event starts' },
    header: { es: 'Lanzamiento', en: 'Launch' },
  },
  government_conference: {
    noun: { es: 'la conferencia', en: 'the conference' },
    action: { es: 'la conferencia comience', en: 'the conference starts' },
    header: { es: 'Conferencia', en: 'Conference' },
  },
  entertainment: {
    noun: { es: 'la transmisión', en: 'the stream' },
    action: { es: 'la transmisión comience', en: 'the stream starts' },
    header: { es: 'En vivo', en: 'Live' },
  },
  community_event: {
    noun: { es: 'el evento', en: 'the event' },
    action: { es: 'el evento comience', en: 'the event starts' },
    header: { es: 'Evento', en: 'Event' },
  },
  live_auction: {
    noun: { es: 'la subasta', en: 'the auction' },
    action: { es: 'la subasta comience', en: 'the auction starts' },
    header: { es: 'Subasta', en: 'Auction' },
  },
  custom: {
    noun: { es: 'el evento', en: 'the event' },
    action: { es: 'el evento comience', en: 'the event starts' },
    header: { es: 'En vivo', en: 'Live' },
  },
}

function normalizeType(t: string | null | undefined): LiveEventTypeKey {
  if (t && t in LABELS) return t as LiveEventTypeKey
  return 'custom'
}

/**
 * Event-type-aware copy for Conscious Live (scheduled banners, headers, empty states).
 */
export function getEventTypeLabel(
  eventType: string | null | undefined,
  locale: LiveEventCopyLocale
): { noun: string; action: string; header: string } {
  const type = LABELS[normalizeType(eventType)]
  return {
    noun: type.noun[locale] ?? type.noun.en,
    action: type.action[locale] ?? type.action.en,
    header: type.header[locale] ?? type.header.en,
  }
}
