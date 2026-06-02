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

type UserSettingsRow = {
  user_id: string
  push_notifications: boolean | null
  language: string | null
}

const expo = new Expo()
const SEND_CONCURRENCY = 10

function normalizeLocale(raw: string | null | undefined): PushLocale {
  const lang = (raw ?? '').trim().toLowerCase()
  if (lang === 'en' || lang.startsWith('en-')) return 'en'
  return 'es'
}

function truncateTitle(title: string, max = 72): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title
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

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  limit: number
): Promise<void> {
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++
      await fn(items[i]).catch((err) =>
        console.warn('[expo-push] sendPushToMany item failed:', err)
      )
    }
  })
  await Promise.all(workers)
}

/**
 * Sends the same payload to many users with a concurrency cap.
 * Dedupes `userIds` so each user receives at most one push per batch.
 */
export async function sendPushToMany(
  admin: SupabaseClient,
  userIds: string[],
  payload: SendPushPayload
): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))]
  await runWithConcurrency(
    unique,
    (userId) => sendPushToUser(admin, userId, payload),
    SEND_CONCURRENCY
  )
}

async function fetchPushEnabledRecipients(
  admin: SupabaseClient,
  excludeUserIds: string[] = []
): Promise<Array<{ userId: string; locale: PushLocale }>> {
  const { data: tokenRows, error: tokenErr } = await admin
    .from('push_tokens')
    .select('user_id')

  if (tokenErr) {
    console.warn('[expo-push] recipient token fetch error:', tokenErr.message)
    return []
  }

  const exclude = new Set(excludeUserIds.filter(Boolean))
  const userIds = [
    ...new Set(
      (tokenRows ?? [])
        .map((r) => r.user_id as string)
        .filter((id) => id && !exclude.has(id))
    ),
  ]

  if (userIds.length === 0) return []

  const { data: settingsRows } = await admin
    .from('user_settings')
    .select('user_id, push_notifications, language')
    .in('user_id', userIds)

  const settingsByUser = new Map<string, UserSettingsRow>()
  for (const row of (settingsRows ?? []) as UserSettingsRow[]) {
    settingsByUser.set(row.user_id, row)
  }

  return userIds
    .filter((userId) => {
      const settings = settingsByUser.get(userId)
      return settings?.push_notifications !== false
    })
    .map((userId) => ({
      userId,
      locale: normalizeLocale(settingsByUser.get(userId)?.language),
    }))
}

export function buildNewPulsePush(params: {
  marketId: string
  title: string
  locale: PushLocale
}): SendPushPayload {
  const { marketId, title, locale } = params
  const titleShort = truncateTitle(title)
  const route = `/(drawer)/(tabs)/pulses/${marketId}`

  if (locale === 'en') {
    return {
      title: `New Pulse: ${titleShort}`,
      body: 'Tell us what you think',
      data: { route, marketId, type: 'pulse_published' },
    }
  }

  return {
    title: `Nuevo Pulse: ${titleShort}`,
    body: 'Cuéntanos qué piensas',
    data: { route, marketId, type: 'pulse_published' },
  }
}

export function buildPulseVoteInvitePush(params: {
  marketId: string
  title: string
  locale: PushLocale
}): SendPushPayload {
  const { marketId, title, locale } = params
  const titleShort = truncateTitle(title)
  const route = `/(drawer)/(tabs)/pulses/${marketId}`

  if (locale === 'en') {
    return {
      title: `Your opinion matters — vote on: ${titleShort}`,
      body: 'Share your perspective',
      data: { route, marketId, type: 'pulse_vote_invite' },
    }
  }

  return {
    title: `Tu opinión cuenta — vota en: ${titleShort}`,
    body: 'Comparte tu perspectiva',
    data: { route, marketId, type: 'pulse_vote_invite' },
  }
}

export function buildNewBlogPush(params: {
  slug: string
  title: string
  locale: PushLocale
}): SendPushPayload {
  const { slug, title, locale } = params
  const titleShort = truncateTitle(title)
  const route = `/(drawer)/(tabs)/blog/${slug}`

  if (locale === 'en') {
    return {
      title: `New article: ${titleShort}`,
      body: 'Read it on Crowd Conscious',
      data: { route, slug, type: 'blog_published' },
    }
  }

  return {
    title: `Nuevo artículo: ${titleShort}`,
    body: 'Léelo en Crowd Conscious',
    data: { route, slug, type: 'blog_published' },
  }
}

export function buildSignalCosignInvitePush(params: {
  slug: string
  title: string
  locale: PushLocale
}): SendPushPayload {
  const { slug, title, locale } = params
  const titleShort = truncateTitle(title)
  const route = `/(drawer)/(tabs)/signals/${slug}`

  if (locale === 'en') {
    return {
      title: `New signal — add your co-sign: ${titleShort}`,
      body: 'Support this community signal',
      data: { route, slug, type: 'signal_cosign_invite' },
    }
  }

  return {
    title: `Nueva señal — apoya con tu co-firma: ${titleShort}`,
    body: 'Apoya esta señal ciudadana',
    data: { route, slug, type: 'signal_cosign_invite' },
  }
}

export async function notifyPulsePublished(
  admin: SupabaseClient,
  params: { marketId: string; title: string; mode: 'announce' | 'vote_invite' }
): Promise<void> {
  const { marketId, title, mode } = params

  let recipients = await fetchPushEnabledRecipients(admin)

  if (mode === 'vote_invite') {
    const { data: votes } = await admin
      .from('market_votes')
      .select('user_id')
      .eq('market_id', marketId)
      .not('user_id', 'is', null)

    const voterIds = new Set(
      (votes ?? [])
        .map((v) => v.user_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
    recipients = recipients.filter((r) => !voterIds.has(r.userId))
  }

  const build =
    mode === 'vote_invite' ? buildPulseVoteInvitePush : buildNewPulsePush

  await runWithConcurrency(
    recipients,
    ({ userId, locale }) =>
      sendPushToUser(admin, userId, build({ marketId, title, locale })),
    SEND_CONCURRENCY
  )
}

export async function notifyBlogPublished(
  admin: SupabaseClient,
  params: { slug: string; title: string }
): Promise<void> {
  const { slug, title } = params
  const recipients = await fetchPushEnabledRecipients(admin)

  await runWithConcurrency(
    recipients,
    ({ userId, locale }) =>
      sendPushToUser(
        admin,
        userId,
        buildNewBlogPush({ slug, title, locale })
      ),
    SEND_CONCURRENCY
  )
}

export async function notifySignalPublished(
  admin: SupabaseClient,
  params: { slug: string; title: string; excludeUserId?: string | null }
): Promise<void> {
  const { slug, title, excludeUserId } = params
  const exclude = excludeUserId ? [excludeUserId] : []
  const recipients = await fetchPushEnabledRecipients(admin, exclude)

  await runWithConcurrency(
    recipients,
    ({ userId, locale }) =>
      sendPushToUser(
        admin,
        userId,
        buildSignalCosignInvitePush({ slug, title, locale })
      ),
    SEND_CONCURRENCY
  )
}
