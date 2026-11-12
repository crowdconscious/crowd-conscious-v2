import 'server-only'

import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'
import type { DemoPersona } from '@/lib/ciceron/demo/personas'
import {
  asSavedViewRoom,
  type SavedView,
  type SavedViewRoom,
} from '@/lib/ciceron/case-files/saved-view-href'

export type { SavedView, SavedViewRoom } from '@/lib/ciceron/case-files/saved-view-href'
export { savedViewHref } from '@/lib/ciceron/case-files/saved-view-href'

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    err.code === '42703'
  )
}

function mapRow(row: {
  id: string
  name: string
  room: string
  filters: unknown
  is_sample?: boolean | null
}): SavedView | null {
  const room = asSavedViewRoom(row.room)
  if (!room) return null
  const filters =
    row.filters && typeof row.filters === 'object' && !Array.isArray(row.filters)
      ? (row.filters as Record<string, unknown>)
      : {}
  return {
    id: row.id,
    name: row.name,
    room,
    filters,
    isSample: Boolean(row.is_sample),
  }
}

/**
 * Load saved views for one room. Tolerates pre-310 schemas (no is_sample)
 * and rows from any of the known rooms without crashing the page.
 */
export async function loadSavedViews(
  persona: DemoPersona,
  room: SavedViewRoom
): Promise<{ views: SavedView[]; schemaReady: boolean }> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return { views: [], schemaReady: false }

  const withSample = await db
    .from('saved_views')
    .select('id, name, room, filters, is_sample')
    .eq('firm_id', persona.firmId)
    .eq('user_id', persona.id)
    .eq('room', room)
    .order('name')

  if (!withSample.error && Array.isArray(withSample.data)) {
    return {
      views: withSample.data
        .map((r) =>
          mapRow(
            r as {
              id: string
              name: string
              room: string
              filters: unknown
              is_sample?: boolean | null
            }
          )
        )
        .filter((v): v is SavedView => v !== null),
      schemaReady: true,
    }
  }

  // Pre-310: is_sample column missing — retry without it
  if (isMissingRelation(withSample.error)) {
    const legacy = await db
      .from('saved_views')
      .select('id, name, room, filters')
      .eq('firm_id', persona.firmId)
      .eq('user_id', persona.id)
      .eq('room', room)
      .order('name')

    if (!legacy.error && Array.isArray(legacy.data)) {
      return {
        views: legacy.data
          .map((r) =>
            mapRow({
              ...(r as {
                id: string
                name: string
                room: string
                filters: unknown
              }),
              is_sample: false,
            })
          )
          .filter((v): v is SavedView => v !== null),
        schemaReady: true,
      }
    }

    if (isMissingRelation(legacy.error)) {
      return { views: [], schemaReady: false }
    }
  }

  return { views: [], schemaReady: false }
}
