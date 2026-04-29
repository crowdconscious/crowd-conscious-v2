/**
 * Post-vote screen analytics — fire-and-forget event tracker.
 *
 * Lightweight by design. Events go to a server route that, today, just
 * logs to Vercel logs. When we add a durable analytics surface (or wire
 * a real provider) the server route becomes the single integration point —
 * client call sites do not change.
 *
 * Never throws; never blocks UI. Uses `keepalive` so the request survives
 * page navigation (e.g. user closes the screen and walks off the page).
 */

export type PostVoteEvent =
  | 'newsletter_signup_post_vote'
  | 'share_click_post_vote'
  | 'close_post_vote_screen'

export interface PostVoteEventPayload {
  marketId?: string
  /** For share_click_post_vote — channel like 'whatsapp', 'twitter', etc. */
  channel?: string
  /** For newsletter_signup_post_vote — true if email was already subscribed. */
  alreadySubscribed?: boolean
  /** 'guest' | 'registered' */
  userType?: 'guest' | 'registered'
  locale?: 'es' | 'en'
}

export function trackPostVoteEvent(
  event: PostVoteEvent,
  payload: PostVoteEventPayload = {}
): void {
  if (typeof window === 'undefined') return

  try {
    void fetch('/api/analytics/post-vote-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // analytics must never break the user flow
  }
}
