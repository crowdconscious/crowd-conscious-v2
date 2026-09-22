/**
 * UX overhaul analytics — fire-and-forget with surface=web.
 *
 * Events match docs/UX-OVERHAUL-v1.md §4. Server route logs to Vercel
 * (same pattern as post-vote-analytics). Never throws; never blocks UI.
 */

export type UxSurface = 'web' | 'app'

export type UxPhase1Event =
  | 'feed_viewed'
  | 'card_impression'
  | 'card_tapped'
  | 'action_completed'
  | 'action_abandoned'
  | 'reveal_shown'
  | 'reveal_share_tapped'
  | 'reasons_block_shown'
  | 'permission_prompted'
  | 'permission_granted'

export type UxPhase2Event =
  | 'resolution_push_sent'
  | 'resolution_push_opened'
  | 'signal_stage_changed'
  | 'signal_no_response_30d'

export type UxEvent = UxPhase1Event | UxPhase2Event

export type UxEventPayload = {
  surface?: UxSurface
  anon_id?: string | null
  user_id?: string | null
  session_id?: string | null
  /** feed_viewed */
  card_types?: string[]
  card_count?: number
  header_scope?: string
  /** card_impression / card_tapped */
  card_type?: string
  position?: number
  object_id?: string
  /** action_* */
  action_type?: string
  seconds_since_open?: number
  step?: string
  /** reveal_* */
  headline_case?: string
  vote_n?: number
  /** reasons_block_shown */
  reason_count?: number
  /** permission_* */
  type?: string
  trigger_point?: string
  /** resolution_* / signal_* (Phase 2) */
  trigger?: string
  days_since_action?: number
  stage?: number | string
  days_to_stage?: number
  alcaldia?: string
  recipient?: string
}

function sessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const KEY = 'cc_ux_session_id'
    let id = sessionStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return null
  }
}

function anonId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('cc_guest_id')
  } catch {
    return null
  }
}

export function trackUxEvent(
  event: UxEvent,
  payload: UxEventPayload = {}
): void {
  if (typeof window === 'undefined') return

  try {
    void fetch('/api/analytics/ux-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event,
        surface: payload.surface ?? 'web',
        anon_id: payload.anon_id ?? anonId(),
        user_id: payload.user_id ?? null,
        session_id: payload.session_id ?? sessionId(),
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // analytics must never break the user flow
  }
}
