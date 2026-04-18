import type { LiveEventTypeKey } from '@/lib/live-event-types'

/** Default duration (minutes) when creating an event — used before YouTube / optional fields. */
export const DEFAULT_LIVE_EVENT_DURATION_MINUTES: Record<LiveEventTypeKey, number> = {
  soccer_match: 100,
  product_launch: 120,
  government_conference: 180,
  entertainment: 180,
  community_event: 120,
  live_auction: 90,
  custom: 180,
}
