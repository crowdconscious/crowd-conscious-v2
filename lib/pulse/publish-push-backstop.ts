import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyPulsePublished } from '@/lib/expo-push'
import { isStandOnly } from '@/lib/pulse/discovery-filters'

/**
 * Backstop for Pulses published outside the app routes (e.g. direct SQL):
 * finds published, non-stand-only Pulses from the last 48h whose announce
 * push was never sent and sends it once. notifyPulsePublished claims
 * publish_notified_at atomically, so this never double-sends with the
 * publish routes.
 */
const LOOKBACK_MS = 48 * 60 * 60 * 1000
const MAX_PER_RUN = 5

export async function runPulsePublishPushBackstop(
  admin: SupabaseClient
): Promise<{ notified: string[]; skipped: string[]; error?: string }> {
  const sinceIso = new Date(Date.now() - LOOKBACK_MS).toISOString()
  const { data, error } = await admin
    .from('prediction_markets')
    .select('id, title, tags')
    .eq('is_pulse', true)
    .eq('is_draft', false)
    .is('publish_notified_at', null)
    .gte('published_at', sinceIso)
    .order('published_at', { ascending: true })
    .limit(MAX_PER_RUN)

  if (error) return { notified: [], skipped: [], error: error.message }

  const notified: string[] = []
  const skipped: string[] = []
  for (const m of (data ?? []) as Array<{ id: string; title: string | null; tags: string[] | null }>) {
    if (isStandOnly(m.tags)) {
      // Stand-only Pulses never get the mass push; mark so we stop re-checking.
      await admin
        .from('prediction_markets')
        .update({ publish_notified_at: new Date().toISOString() })
        .eq('id', m.id)
        .is('publish_notified_at', null)
      skipped.push(m.id)
      continue
    }

    // Guard for Pulses announced by pre-288 code (no claim recorded): if the
    // in-app mirror rows exist, the push already went out — just mark it.
    const { count } = await admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'pulse_published')
      .eq('data->>marketId', m.id)
    if ((count ?? 0) > 0) {
      await admin
        .from('prediction_markets')
        .update({ publish_notified_at: new Date().toISOString() })
        .eq('id', m.id)
        .is('publish_notified_at', null)
      skipped.push(m.id)
      continue
    }

    try {
      await notifyPulsePublished(admin, {
        marketId: m.id,
        title: m.title ?? 'Pulse',
        mode: 'announce',
      })
      notified.push(m.id)
    } catch (err) {
      console.warn('[publish-push-backstop] notify error', m.id, err)
    }
  }
  return { notified, skipped }
}
