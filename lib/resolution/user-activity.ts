/**
 * Thin "Tu actividad" loader for logged-in web (Phase 2 nice-to-have).
 * Lists things the user touched that moved — from resolution_notify_log
 * plus a short lookback of stakeholder objects. Not a full Impact Home.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type ActivityItem = {
  id: string
  trigger: string
  objectType: 'signal' | 'pulse' | 'location'
  objectId: string
  title: string
  href: string
  channel: string
  sentAt: string
}

const TRIGGER_LABELS: Record<
  string,
  { es: string; en: string }
> = {
  signal_stage_50: {
    es: 'Llegó a 50 respaldos — solicitud formal enviada',
    en: 'Reached 50 backings — formal request sent',
  },
  signal_stage_200: {
    es: 'Prioridad pública (200 respaldos)',
    en: 'Public priority (200 backings)',
  },
  signal_official_response: {
    es: 'Hubo respuesta oficial',
    en: 'Official reply received',
  },
  signal_silence_30d: {
    es: 'Silencio publicado (30 días)',
    en: 'Silence published (30 days)',
  },
  pulse_close: {
    es: 'Pulse cerrado — mira el resultado',
    en: 'Pulse closed — see the result',
  },
  location_certified: {
    es: 'Lugar que evaluaste certificado',
    en: 'A place you scored was certified',
  },
}

export function activityTriggerLabel(
  trigger: string,
  locale: 'es' | 'en'
): string {
  return TRIGGER_LABELS[trigger]?.[locale] ?? trigger
}

export async function fetchUserResolutionActivity(
  admin: SupabaseClient,
  userId: string,
  limit = 30
): Promise<ActivityItem[]> {
  const { data: rows, error } = await admin
    .from('resolution_notify_log')
    .select('id, trigger, object_type, object_id, channel, sent_at')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[user-activity] resolution_notify_log', error.message)
    return []
  }

  if (!rows?.length) return []

  const signalIds = rows
    .filter((r) => r.object_type === 'signal')
    .map((r) => r.object_id as string)
  const pulseIds = rows
    .filter((r) => r.object_type === 'pulse')
    .map((r) => r.object_id as string)
  const locationIds = rows
    .filter((r) => r.object_type === 'location')
    .map((r) => r.object_id as string)

  const [signalsRes, pulsesRes, locationsRes] = await Promise.all([
    signalIds.length
      ? admin
          .from('citizen_signals')
          .select('id, title, public_slug')
          .in('id', signalIds)
      : Promise.resolve({ data: [] as { id: string; title: string; public_slug: string }[] }),
    pulseIds.length
      ? admin
          .from('prediction_markets')
          .select('id, title')
          .in('id', pulseIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    locationIds.length
      ? admin
          .from('conscious_locations')
          .select('id, name, slug')
          .in('id', locationIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; slug: string }[],
        }),
  ])

  const signalMap = new Map(
    (signalsRes.data ?? []).map((s) => [s.id, s] as const)
  )
  const pulseMap = new Map((pulsesRes.data ?? []).map((p) => [p.id, p] as const))
  const locationMap = new Map(
    (locationsRes.data ?? []).map((l) => [l.id, l] as const)
  )

  const items: ActivityItem[] = []
  for (const row of rows) {
    const objectType = row.object_type as ActivityItem['objectType']
    const objectId = row.object_id as string
    let title = objectId
    let href = '/'

    if (objectType === 'signal') {
      const s = signalMap.get(objectId)
      title = s?.title ?? title
      href = s ? `/signals/${s.public_slug}` : '/signals'
    } else if (objectType === 'pulse') {
      const p = pulseMap.get(objectId)
      title = p?.title ?? title
      href = `/pulse/${objectId}`
    } else if (objectType === 'location') {
      const l = locationMap.get(objectId)
      title = l?.name ?? title
      href = l ? `/locations/${l.slug}` : '/locations'
    }

    items.push({
      id: row.id as string,
      trigger: row.trigger as string,
      objectType,
      objectId,
      title,
      href,
      channel: row.channel as string,
      sentAt: row.sent_at as string,
    })
  }

  return items
}
