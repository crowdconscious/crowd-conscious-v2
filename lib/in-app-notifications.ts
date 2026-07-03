import type { SupabaseClient } from '@supabase/supabase-js'
import type { SendPushPayload } from '@/lib/expo-push'

/**
 * In-app notification rows (public.notifications) that mirror Expo pushes so
 * the mobile notification center shows the same events a push announces.
 *
 * Contract (migration 247):
 *  - `title` / `message` are pre-localized at insert time (same locale
 *    resolution as the push builders).
 *  - `link` is the WEB path for the web notification center.
 *  - `data` is the push-style payload ({ route, type, ... }); the mobile app
 *    deep-links via data.route.
 *
 * Inserts are best-effort: a failure is logged and swallowed so it can never
 * break the publish/resolve flow that triggered it.
 */

export type InAppNotificationInsert = {
  user_id: string
  type: string
  title: string
  message: string
  link: string | null
  data: Record<string, string> | null
}

const INSERT_CHUNK = 500

export async function insertInAppNotifications(
  admin: SupabaseClient,
  rows: InAppNotificationInsert[]
): Promise<void> {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK)
    try {
      const { error } = await admin.from('notifications').insert(chunk)
      if (error) {
        console.warn('[in-app-notifications] insert failed:', error.message)
      }
    } catch (err) {
      console.warn('[in-app-notifications] insert threw:', err)
    }
  }
}

/**
 * Builds one notifications row from the exact payload an Expo push used, so
 * push and in-app center never drift. `webLink` is the web-side destination
 * (the mobile route travels inside payload.data.route).
 */
export function inAppRowFromPush(params: {
  userId: string
  type: string
  payload: SendPushPayload
  webLink: string | null
}): InAppNotificationInsert {
  const { userId, type, payload, webLink } = params
  return {
    user_id: userId,
    type,
    title: payload.title,
    message: payload.body,
    link: webLink,
    data: payload.data ?? null,
  }
}
