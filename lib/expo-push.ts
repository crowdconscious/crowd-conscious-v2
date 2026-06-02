import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PushLocale = 'es' | 'en'

export type ExpoPushData = Record<string, string>

export type SendPushPayload = {
  title: string
  body: string
  data?: ExpoPushData
}

type PushTokenRow = {
  id: string
  expo_push_token: string
}

const expo = new Expo()

function normalizeLocale(raw: string | null | undefined): PushLocale {
  const lang = (raw ?? '').trim().toLowerCase()
  if (lang === 'en' || lang.startsWith('en-')) return 'en'
  return 'es'
}

/** Locale from `user_settings.language`, default `es`. */
export async function resolvePushLocale(
  admin: SupabaseClient,
  userId: string
): Promise<PushLocale> {
  const { data: settings } = await admin
    .from('user_settings')
    .select('language')
    .eq('user_id', userId)
    .maybeSingle()

  return normalizeLocale(settings?.language)
}

async function isPushEnabledForUser(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from('user_settings')
    .select('push_notifications')
    .eq('user_id', userId)
    .maybeSingle()

  return data?.push_notifications !== false
}

async function deleteStalePushTokens(
  admin: SupabaseClient,
  tokenIds: string[]
): Promise<void> {
  if (tokenIds.length === 0) return
  const { error } = await admin.from('push_tokens').delete().in('id', tokenIds)
  if (error) {
    console.warn('[expo-push] failed to delete stale tokens:', error.message)
  }
}

function collectDeviceNotRegisteredIds(
  tickets: ExpoPushTicket[],
  tokenRows: PushTokenRow[]
): string[] {
  const stale: string[] = []
  tickets.forEach((ticket, index) => {
    if (ticket.status !== 'error') return
    if (ticket.details?.error !== 'DeviceNotRegistered') return
    const row = tokenRows[index]
    if (row?.id) stale.push(row.id)
  })
  return stale
}

/**
 * Sends an Expo push notification to every device token registered for
 * `userId`. Respects `user_settings.push_notifications !== false`.
 * Removes tokens Expo reports as DeviceNotRegistered.
 */
export async function sendPushToUser(
  admin: SupabaseClient,
  userId: string,
  payload: SendPushPayload
): Promise<void> {
  if (!process.env.EXPO_ACCESS_TOKEN) {
    console.warn('[expo-push] EXPO_ACCESS_TOKEN not set — skipping push')
    return
  }

  if (!(await isPushEnabledForUser(admin, userId))) return

  const { data: rows, error } = await admin
    .from('push_tokens')
    .select('id, expo_push_token')
    .eq('user_id', userId)

  if (error) {
    console.warn('[expo-push] token fetch error:', error.message)
    return
  }

  const tokenRows = (rows ?? []) as PushTokenRow[]
  if (tokenRows.length === 0) return

  const messages: ExpoPushMessage[] = []
  const messageTokenRows: PushTokenRow[] = []

  for (const row of tokenRows) {
    if (!Expo.isExpoPushToken(row.expo_push_token)) continue
    messages.push({
      to: row.expo_push_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    })
    messageTokenRows.push(row)
  }

  if (messages.length === 0) return

  const chunks = expo.chunkPushNotifications(messages)
  const staleIds: string[] = []
  let offset = 0

  for (const chunk of chunks) {
    const chunkRows = messageTokenRows.slice(offset, offset + chunk.length)
    offset += chunk.length
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk)
      staleIds.push(...collectDeviceNotRegisteredIds(tickets, chunkRows))
    } catch (err) {
      console.warn('[expo-push] send chunk failed:', err)
    }
  }

  await deleteStalePushTokens(admin, [...new Set(staleIds)])
}

export type PulseResolutionPushParams = {
  marketId: string
  marketTitle: string
  winningLabel: string
  won: boolean
  bonusXp: number
  locale: PushLocale
}

export function buildPulseResolutionPush(
  params: PulseResolutionPushParams
): SendPushPayload {
  const { marketId, marketTitle, winningLabel, won, bonusXp, locale } = params
  const route = `/(drawer)/(tabs)/pulses/${marketId}`
  const titleShort =
    marketTitle.length > 72 ? `${marketTitle.slice(0, 69)}…` : marketTitle

  if (locale === 'en') {
    const title = `Pulse resolved: ${titleShort}`
    const body = won
      ? `Correct! You earned ${bonusXp} bonus XP.`
      : `Resolved as ${winningLabel}.`
    return {
      title,
      body,
      data: { route, marketId, type: 'pulse_resolved' },
    }
  }

  const title = `Pulse resuelto: ${titleShort}`
  const body = won
    ? `¡Correcto! Ganaste ${bonusXp} XP bonus.`
    : `Se resolvió como ${winningLabel}.`
  return {
    title,
    body,
    data: { route, marketId, type: 'pulse_resolved' },
  }
}
