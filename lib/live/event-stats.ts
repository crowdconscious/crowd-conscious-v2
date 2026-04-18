import 'server-only'
import { createClient } from '@/lib/supabase-server'

export type LiveEventStats = {
  /** Total prediction markets created for the event (any status). */
  markets: number
  /** Resolved markets (used to label "predictions resueltas"). */
  resolved: number
}

const EMPTY: LiveEventStats = { markets: 0, resolved: 0 }

/**
 * Returns per-event stats keyed by `live_event_id`. One round-trip for the
 * whole listing — used by /live to show vote/market counts on each card
 * without ballooning into N+1 queries.
 */
export async function loadLiveEventStats(
  eventIds: string[]
): Promise<Record<string, LiveEventStats>> {
  if (eventIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prediction_markets')
    .select('live_event_id, status')
    .in('live_event_id', eventIds)

  if (error || !data) return {}

  const out: Record<string, LiveEventStats> = {}
  for (const row of data as { live_event_id: string | null; status: string }[]) {
    const id = row.live_event_id
    if (!id) continue
    const cur = out[id] ?? { ...EMPTY }
    cur.markets += 1
    if (row.status === 'resolved') cur.resolved += 1
    out[id] = cur
  }
  return out
}
