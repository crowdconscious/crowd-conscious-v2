import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const EXPO_SEND_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'
const PUSH_CHUNK_LIMIT = 100
const RECEIPT_CHUNK_LIMIT = 300

type ExpoPushMessage = {
  to: string
  sound?: 'default' | null
  title?: string
  body?: string
  data?: Record<string, unknown>
  badge?: number
  priority?: 'default' | 'normal' | 'high'
}

type ExpoPushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } }

export type ExpoPushReceipt =
  | { status: 'ok' }
  | { status: 'error'; message: string; details?: { error?: string } }

function isExpoPushToken(token: string): boolean {
  return (
    typeof token === 'string' &&
    (((token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')) &&
      token.endsWith(']')) ||
      /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i.test(token))
  )
}

function chunkItems<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

function chunkPushNotifications(messages: ExpoPushMessage[]): ExpoPushMessage[][] {
  return chunkItems(messages, PUSH_CHUNK_LIMIT)
}

export function chunkPushNotificationReceiptIds(ids: string[]): string[][] {
  return chunkItems(ids, RECEIPT_CHUNK_LIMIT)
}

function expoAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'crowd-conscious-expo-push/1.0',
  }
  const token = process.env.EXPO_ACCESS_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function expoRequest<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: expoAuthHeaders(),
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let result: { data?: T; errors?: Array<{ message: string }> }
  try {
    result = JSON.parse(text) as typeof result
  } catch {
    throw new Error(`Expo responded with status ${response.status}: ${text}`)
  }
  if (!response.ok || result.errors?.length) {
    const msg = result.errors?.[0]?.message ?? text
    throw new Error(`Expo API error (${response.status}): ${msg}`)
  }
  if (result.data === undefined) {
    throw new Error(`Expo API returned no data (${response.status})`)
  }
  return result.data
}

async function sendPushNotificationsAsync(
  messages: ExpoPushMessage[]
): Promise<ExpoPushTicket[]> {
  const data = await expoRequest<ExpoPushTicket[]>(EXPO_SEND_URL, messages)
  if (!Array.isArray(data) || data.length !== messages.length) {
    throw new Error(
      `Expected ${messages.length} push tickets but got ${data?.length ?? 0}`
    )
  }
  return data
}

export async function getPushNotificationReceiptsAsync(
  receiptIds: string[]
): Promise<Record<string, ExpoPushReceipt>> {
  const data = await expoRequest<Record<string, ExpoPushReceipt>>(
    EXPO_RECEIPTS_URL,
    { ids: receiptIds }
  )
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Expected Expo to respond with a map from receipt IDs to receipts')
  }
  return data
}

export type PushLocale = 'es' | 'en'

export type ExpoPushData = Record<string, string>

export type SendPushPayload = {
  title: string
  body: string
  data?: ExpoPushData
  /**
   * iOS/Android app-icon badge count. We set `1` for new-content pushes so the
   * app shows the red dot; the mobile app clears it (setBadgeCountAsync(0)) on
   * foreground/open. Precise unread counts are out of scope.
   */
  badge?: number
}

type PushTokenRow = {
  id: string
  expo_push_token: string
  device_id?: string | null
  /** Mobile upserts `last_seen_at` on every token refresh (no `updated_at` column). */
  last_seen_at?: string | null
}

/** Prefer the row with the latest `last_seen_at`; fall back to array order. */
function preferNewerPushTokenRow(a: PushTokenRow, b: PushTokenRow): PushTokenRow {
  if (a.last_seen_at && b.last_seen_at) {
    return a.last_seen_at >= b.last_seen_at ? a : b
  }
  if (a.last_seen_at) return a
  if (b.last_seen_at) return b
  return a
}

/**
 * Collapses duplicate registrations before send: same `expo_push_token` string
 * must only produce one Expo message, and the same physical device should not
 * receive multiple pushes when stale rows linger after re-registration.
 */
function dedupePushTokenRows(rows: PushTokenRow[]): {
  toSend: PushTokenRow[]
  duplicateIds: string[]
} {
  const duplicateIds: string[] = []

  const byToken = new Map<string, PushTokenRow>()
  for (const row of rows) {
    if (!isExpoPushToken(row.expo_push_token)) continue
    const existing = byToken.get(row.expo_push_token)
    if (!existing) {
      byToken.set(row.expo_push_token, row)
      continue
    }
    const kept = preferNewerPushTokenRow(existing, row)
    duplicateIds.push(kept.id === existing.id ? row.id : existing.id)
    byToken.set(row.expo_push_token, kept)
  }

  const byDevice = new Map<string, PushTokenRow>()
  const withoutDevice: PushTokenRow[] = []
  for (const row of byToken.values()) {
    const deviceId = row.device_id?.trim()
    if (!deviceId) {
      withoutDevice.push(row)
      continue
    }
    const existing = byDevice.get(deviceId)
    if (!existing) {
      byDevice.set(deviceId, row)
      continue
    }
    const kept = preferNewerPushTokenRow(existing, row)
    duplicateIds.push(kept.id === existing.id ? row.id : existing.id)
    byDevice.set(deviceId, kept)
  }

  const candidates = [...withoutDevice, ...byDevice.values()]
  if (candidates.length <= 1) {
    return { toSend: candidates, duplicateIds: [...new Set(duplicateIds)] }
  }

  // One physical user should receive at most one push per event. Stale rows
  // with different device_id values (token refresh, unstable Expo device ids)
  // must not fan out multiple notifications to the same phone.
  let newest = candidates[0]
  for (let i = 1; i < candidates.length; i++) {
    const row = candidates[i]
    const kept = preferNewerPushTokenRow(newest, row)
    duplicateIds.push(kept.id === newest.id ? row.id : newest.id)
    newest = kept
  }

  return {
    toSend: [newest],
    duplicateIds: [...new Set(duplicateIds)],
  }
}

type PushLogInsert = {
  user_id: string
  push_token_id: string | null
  expo_ticket_id: string | null
  title: string
  body: string
  data_type: string | null
  status: 'pending' | 'ok' | 'error'
  error_detail: string | null
}

type UserSettingsRow = {
  user_id: string
  push_notifications: boolean | null
  language: string | null
}

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

/**
 * Records one push_log row per device message so the push-receipts cron can
 * verify delivery later (migration 242). Logging must never break a send —
 * failures are warned and swallowed.
 */
async function insertPushLogRows(
  admin: SupabaseClient,
  rows: PushLogInsert[]
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await admin.from('push_log').insert(rows)
  if (error) {
    console.warn('[expo-push] push_log insert failed:', error.message)
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
  // Expo push delivery does NOT require an access token unless "Enhanced Push
  // Security" is enabled on the Expo project. We intentionally do NOT
  // short-circuit when EXPO_ACCESS_TOKEN is missing — doing so silently
  // disabled every push when the env var was not configured in deploy.
  if (!(await isPushEnabledForUser(admin, userId))) return

  const { data: rows, error } = await admin
    .from('push_tokens')
    .select('id, expo_push_token, device_id, last_seen_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.warn('[expo-push] token fetch error:', error.message)
    return
  }

  const rawRows = (rows ?? []) as PushTokenRow[]
  if (rawRows.length === 0) {
    console.warn('[expo-push] sendPushToUser: no tokens for user', userId)
    return
  }

  const { toSend: tokenRows, duplicateIds } = dedupePushTokenRows(rawRows)
  if (tokenRows.length === 0) return

  const messages: ExpoPushMessage[] = tokenRows.map((row) => ({
    to: row.expo_push_token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data,
    badge: payload.badge,
  }))
  const messageTokenRows = tokenRows

  const chunks = chunkPushNotifications(messages)
  const staleIds: string[] = []
  const logRows: PushLogInsert[] = []
  const dataType = payload.data?.type ?? null
  let offset = 0

  for (const chunk of chunks) {
    const chunkRows = messageTokenRows.slice(offset, offset + chunk.length)
    offset += chunk.length
    try {
      const tickets = await sendPushNotificationsAsync(chunk)
      staleIds.push(...collectDeviceNotRegisteredIds(tickets, chunkRows))
      tickets.forEach((ticket, i) => {
        const row = chunkRows[i]
        logRows.push({
          user_id: userId,
          push_token_id: row?.id ?? null,
          expo_ticket_id: ticket.status === 'ok' ? ticket.id : null,
          title: payload.title,
          body: payload.body,
          data_type: dataType,
          status: ticket.status === 'ok' ? 'pending' : 'error',
          error_detail:
            ticket.status === 'error'
              ? ticket.details?.error
                ? `${ticket.details.error}: ${ticket.message}`
                : ticket.message
              : null,
        })
      })
    } catch (err) {
      console.warn('[expo-push] send chunk failed:', err)
      const detail = err instanceof Error ? err.message : String(err)
      for (const row of chunkRows) {
        logRows.push({
          user_id: userId,
          push_token_id: row.id,
          expo_ticket_id: null,
          title: payload.title,
          body: payload.body,
          data_type: dataType,
          status: 'error',
          error_detail: `send failed: ${detail}`,
        })
      }
    }
  }

  await insertPushLogRows(admin, logRows)
  await deleteStalePushTokens(admin, [...new Set([...staleIds, ...duplicateIds])])
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
      badge: 1,
    }
  }

  return {
    title: `Nuevo Pulse: ${titleShort}`,
    body: 'Cuéntanos qué piensas',
    data: { route, marketId, type: 'pulse_published' },
    badge: 1,
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
      badge: 1,
    }
  }

  return {
    title: `Tu opinión cuenta — vota en: ${titleShort}`,
    body: 'Comparte tu perspectiva',
    data: { route, marketId, type: 'pulse_vote_invite' },
    badge: 1,
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
      badge: 1,
    }
  }

  return {
    title: `Nuevo artículo: ${titleShort}`,
    body: 'Léelo en Crowd Conscious',
    data: { route, slug, type: 'blog_published' },
    badge: 1,
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
      badge: 1,
    }
  }

  return {
    title: `Nueva señal — apoya con tu co-firma: ${titleShort}`,
    body: 'Apoya esta señal ciudadana',
    data: { route, slug, type: 'signal_cosign_invite' },
    badge: 1,
  }
}

/**
 * Results push for users who voted on a Pulse that just resolved (audit
 * item P5; originally shipped in dfdff0d, removed in 1f7d99b). This is the
 * retention hook: close the loop on every vote.
 */
export function buildPulseResolutionPush(params: {
  marketId: string
  marketTitle: string
  winningLabel: string
  won: boolean
  bonusXp: number
  locale: PushLocale
}): SendPushPayload {
  const { marketId, marketTitle, winningLabel, won, bonusXp, locale } = params
  const titleShort = truncateTitle(marketTitle)
  const route = `/(drawer)/(tabs)/pulses/${marketId}`

  if (locale === 'en') {
    const body = won
      ? bonusXp > 0
        ? `"${titleShort}" — you matched the community and earned ${bonusXp} bonus XP.`
        : `"${titleShort}" — you matched the community outcome.`
      : `"${titleShort}" resolved as ${winningLabel}.`
    return {
      title: 'Your Pulse closed — see the results',
      body,
      data: { route, marketId, type: 'pulse_resolved' },
      badge: 1,
    }
  }

  const body = won
    ? bonusXp > 0
      ? `"${titleShort}" — coincidiste con la comunidad y ganaste ${bonusXp} XP bonus.`
      : `"${titleShort}" — coincidiste con el resultado de la comunidad.`
    : `"${titleShort}" se resolvió como ${winningLabel}.`
  return {
    title: 'Tu Pulse cerró — mira los resultados',
    body,
    data: { route, marketId, type: 'pulse_resolved' },
    badge: 1,
  }
}

/**
 * Milestone push for a signal author when their signal crosses a cosign
 * threshold stage (audit item P5). Stages reuse the signal-threshold-check
 * cron's escalation ladder.
 */
export function buildSignalMilestonePush(params: {
  slug: string
  title: string
  cosignCount: number
  locale: PushLocale
}): SendPushPayload {
  const { slug, title, cosignCount, locale } = params
  const titleShort = truncateTitle(title)
  const route = `/(drawer)/(tabs)/signals/${slug}`

  if (locale === 'en') {
    return {
      title: `Your signal reached ${cosignCount} co-signs`,
      body: `"${titleShort}" keeps growing. Share it to reach further.`,
      data: { route, slug, type: 'signal_milestone' },
      badge: 1,
    }
  }

  return {
    title: `Tu señal alcanzó ${cosignCount} co-firmas`,
    body: `"${titleShort}" sigue creciendo. Compártela para llegar más lejos.`,
    data: { route, slug, type: 'signal_milestone' },
    badge: 1,
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

  if (recipients.length === 0) {
    console.warn(
      '[expo-push] notifyPulsePublished: no push-enabled recipients with tokens',
      { marketId, mode }
    )
    return
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

  if (recipients.length === 0) {
    console.warn(
      '[expo-push] notifyBlogPublished: no push-enabled recipients with tokens',
      { slug }
    )
    return
  }

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

/**
 * Schedules blog publish pushes after the HTTP response is flushed. Blog
 * fan-out can exceed the default 30s route limit when awaited inline; `after()`
 * keeps the lambda alive without blocking the admin publish response.
 */
export function scheduleNotifyBlogPublished(
  admin: SupabaseClient,
  params: { slug: string; title: string }
): void {
  const task = async () => {
    try {
      await notifyBlogPublished(admin, params)
    } catch (err) {
      console.warn('[expo-push] notifyBlogPublished failed:', err)
    }
  }

  try {
    after(task)
  } catch {
    void task()
  }
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

export function buildNewLocationPush(params: {
  slug: string
  name: string
  locale: PushLocale
}): SendPushPayload {
  const { slug, name, locale } = params
  const nameShort = truncateTitle(name)
  const route = `/(drawer)/(tabs)/locations/${slug}`

  if (locale === 'en') {
    return {
      title: `New Conscious Place: ${nameShort}`,
      body: 'Discover it on Crowd Conscious',
      data: { route, slug, type: 'location_published' },
      badge: 1,
    }
  }

  return {
    title: `Nuevo Lugar Consciente: ${nameShort}`,
    body: 'Descúbrelo en Crowd Conscious',
    data: { route, slug, type: 'location_published' },
    badge: 1,
  }
}

/**
 * Fans out a "new Conscious Location" push to all push-enabled users when a
 * location is first certified (status → active). NGOs/communities are
 * nominated as conscious_locations, so this covers both. Fire only on the
 * first activation transition to avoid re-notifying on later edits.
 */
export async function notifyLocationPublished(
  admin: SupabaseClient,
  params: { slug: string; name: string; excludeUserId?: string | null }
): Promise<void> {
  const { slug, name, excludeUserId } = params
  const exclude = excludeUserId ? [excludeUserId] : []
  const recipients = await fetchPushEnabledRecipients(admin, exclude)

  if (recipients.length === 0) {
    console.warn(
      '[expo-push] notifyLocationPublished: no push-enabled recipients with tokens',
      { slug }
    )
    return
  }

  await runWithConcurrency(
    recipients,
    ({ userId, locale }) =>
      sendPushToUser(admin, userId, buildNewLocationPush({ slug, name, locale })),
    SEND_CONCURRENCY
  )
}

/**
 * Schedules the location push after the HTTP response is flushed so the admin
 * activation request returns fast and the all-users fan-out doesn't risk the
 * default 30s route limit (mirrors scheduleNotifyBlogPublished).
 */
export function scheduleNotifyLocationPublished(
  admin: SupabaseClient,
  params: { slug: string; name: string; excludeUserId?: string | null }
): void {
  const task = async () => {
    try {
      await notifyLocationPublished(admin, params)
    } catch (err) {
      console.warn('[expo-push] notifyLocationPublished failed:', err)
    }
  }

  try {
    after(task)
  } catch {
    void task()
  }
}
