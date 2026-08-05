/**
 * Client-side analytics helper for the Señal Express (/queja) flow.
 *
 * Fires the exact specced events (§7.1) to `/api/analytics/queja-event` with a
 * `keepalive` fetch so the ping survives page navigation. NEVER throws — a
 * tracking failure must never break the user's flow.
 */

export const QUEJA_EVENTS = [
  'queja_landing_view',
  'queja_flow_start',
  'queja_draft_ready',
  'queja_pdf_download',
  'queja_senal_created',
] as const

export type QuejaEvent = (typeof QUEJA_EVENTS)[number]

/** Fire a Señal Express analytics event. Safe to call anywhere client-side. */
export function trackQuejaEvent(
  event: QuejaEvent,
  payload: Record<string, string | number | boolean | null> = {}
): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/analytics/queja-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — analytics must never break the flow
  }
}
