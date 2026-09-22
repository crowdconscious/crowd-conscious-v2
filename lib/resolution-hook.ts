/**
 * Phase 2 resolution hook — memory notifications when something the user
 * touched moved (UX overhaul §3.5 / §6.4).
 *
 * Recipients come from existing ledgers (market_votes, citizen_signal_cosigns,
 * citizen_signals.author_user_id). This module only writes:
 *   - resolution_notify_log (idempotency + max 1 / user / UTC day)
 *   - notifications (in-app mirror)
 *   - Expo push (preferred) or email fallback when no push token
 *
 * Rules:
 *   - Max one resolution notification per user per UTC day
 *   - If the user has a push token, do not also send resolution email
 *   - Never invent a second action ledger for votes / co-signs
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolvePushLocale,
  sendPushToUser,
  type PushLocale,
  type SendPushPayload,
} from '@/lib/expo-push'
import {
  inAppRowFromPush,
  insertInAppNotifications,
} from '@/lib/in-app-notifications'

export type ResolutionTrigger =
  | 'signal_stage_50'
  | 'signal_stage_200'
  | 'signal_official_response'
  | 'signal_silence_30d'
  | 'pulse_close'
  | 'location_certified'

export type ResolutionObjectType = 'signal' | 'pulse' | 'location'

export type ResolutionDispatchResult = {
  considered: number
  sentPush: number
  sentEmail: number
  inAppOnly: number
  suppressedDaily: number
  suppressedDuplicate: number
  skipped: number
}

function utcDayStartIso(d = new Date()): string {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  ).toISOString()
}

/**
 * True when the user already received any resolution notify today (UTC).
 */
export async function userHasResolutionNotifyToday(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const since = utcDayStartIso()
  const { data, error } = await admin
    .from('resolution_notify_log')
    .select('id')
    .eq('user_id', userId)
    .gte('sent_at', since)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[resolution-hook] daily-cap lookup failed:', error.message)
    // Fail closed on lookup errors — avoid spam bursts if the table is down.
    return true
  }
  return Boolean(data?.id)
}

/**
 * True when the user has at least one Expo push token registered.
 * Used to suppress resolution email when push can deliver the same loop.
 */
export async function userHasPushToken(
  admin: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('push_tokens')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[resolution-hook] push_tokens lookup failed:', error.message)
    return false
  }
  return Boolean(data?.id)
}

async function recordNotifyLog(
  admin: SupabaseClient,
  row: {
    user_id: string
    trigger: ResolutionTrigger
    object_type: ResolutionObjectType
    object_id: string
    channel: 'push' | 'email' | 'in_app_only'
    days_since_action: number | null
    meta?: Record<string, unknown>
  }
): Promise<'ok' | 'duplicate' | 'daily_cap' | 'error'> {
  const { error } = await admin.from('resolution_notify_log').insert({
    user_id: row.user_id,
    trigger: row.trigger,
    object_type: row.object_type,
    object_id: row.object_id,
    channel: row.channel,
    days_since_action: row.days_since_action,
    meta: row.meta ?? {},
  })

  if (!error) return 'ok'
  // 23505 = unique_violation (same event OR already notified today)
  if (error.code === '23505') {
    const { data: sameEvent } = await admin
      .from('resolution_notify_log')
      .select('id')
      .eq('user_id', row.user_id)
      .eq('trigger', row.trigger)
      .eq('object_id', row.object_id)
      .maybeSingle()
    return sameEvent?.id ? 'duplicate' : 'daily_cap'
  }
  console.warn('[resolution-hook] notify log insert failed:', error.message)
  return 'error'
}

function logResolutionPushSent(params: {
  trigger: ResolutionTrigger
  userId: string
  objectId: string
  channel: 'push' | 'email' | 'in_app_only'
  daysSinceAction: number | null
  surface?: 'web' | 'app'
}): void {
  console.info('[ux-overhaul-analytics]', {
    event: 'resolution_push_sent',
    surface: params.surface ?? 'web',
    user_id: params.userId,
    trigger: params.trigger,
    object_id: params.objectId,
    channel: params.channel,
    days_since_action: params.daysSinceAction,
    timestamp: new Date().toISOString(),
  })
}

export type ResolutionRecipient = {
  userId: string
  /** When the user acted on this object (vote / co-sign / evaluate). */
  actionAt?: string | null
}

/**
 * Fan out one resolution event to eligible recipients.
 * Caller supplies localized push payload builder and optional email fallback
 * (email runs only when the user has no push token).
 */
export async function dispatchResolutionNotifications(
  admin: SupabaseClient,
  params: {
    trigger: ResolutionTrigger
    objectType: ResolutionObjectType
    objectId: string
    recipients: ResolutionRecipient[]
    inAppType: string
    webLink: string
    buildPayload: (args: {
      locale: PushLocale
      userId: string
    }) => SendPushPayload
    /** Optional email when no push token. Must not throw. */
    sendEmailFallback?: (args: {
      userId: string
      locale: PushLocale
    }) => Promise<boolean>
    /** Analytics surface tag; resolution sends are server-side (web API). */
    surface?: 'web' | 'app'
  }
): Promise<ResolutionDispatchResult> {
  const result: ResolutionDispatchResult = {
    considered: 0,
    sentPush: 0,
    sentEmail: 0,
    inAppOnly: 0,
    suppressedDaily: 0,
    suppressedDuplicate: 0,
    skipped: 0,
  }

  const seen = new Set<string>()
  const unique = params.recipients.filter((r) => {
    if (!r.userId || seen.has(r.userId)) return false
    seen.add(r.userId)
    return true
  })

  for (const recipient of unique) {
    result.considered++
    const { userId, actionAt } = recipient

    try {
      if (await userHasResolutionNotifyToday(admin, userId)) {
        result.suppressedDaily++
        continue
      }

      const daysSinceAction =
        actionAt != null
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(actionAt).getTime()) / (24 * 60 * 60 * 1000)
              )
            )
          : null

      const hasToken = await userHasPushToken(admin, userId)
      const locale = await resolvePushLocale(admin, userId)
      const payload = params.buildPayload({ locale, userId })

      // Claim the daily slot + idempotency before side effects.
      const channel: 'push' | 'email' | 'in_app_only' = hasToken
        ? 'push'
        : params.sendEmailFallback
          ? 'email'
          : 'in_app_only'

      const claim = await recordNotifyLog(admin, {
        user_id: userId,
        trigger: params.trigger,
        object_type: params.objectType,
        object_id: params.objectId,
        channel,
        days_since_action: daysSinceAction,
      })

      if (claim === 'duplicate') {
        result.suppressedDuplicate++
        continue
      }
      if (claim === 'daily_cap') {
        result.suppressedDaily++
        continue
      }
      if (claim === 'error') {
        result.skipped++
        continue
      }

      await insertInAppNotifications(admin, [
        inAppRowFromPush({
          userId,
          type: params.inAppType,
          payload,
          webLink: params.webLink,
        }),
      ])

      if (hasToken) {
        await sendPushToUser(admin, userId, payload)
        result.sentPush++
        logResolutionPushSent({
          trigger: params.trigger,
          userId,
          objectId: params.objectId,
          channel: 'push',
          daysSinceAction,
          surface: params.surface,
        })
      } else if (params.sendEmailFallback) {
        const emailed = await params.sendEmailFallback({ userId, locale })
        if (emailed) {
          result.sentEmail++
          logResolutionPushSent({
            trigger: params.trigger,
            userId,
            objectId: params.objectId,
            channel: 'email',
            daysSinceAction,
            surface: params.surface,
          })
        } else {
          result.inAppOnly++
          logResolutionPushSent({
            trigger: params.trigger,
            userId,
            objectId: params.objectId,
            channel: 'in_app_only',
            daysSinceAction,
            surface: params.surface,
          })
        }
      } else {
        result.inAppOnly++
        logResolutionPushSent({
          trigger: params.trigger,
          userId,
          objectId: params.objectId,
          channel: 'in_app_only',
          daysSinceAction,
          surface: params.surface,
        })
      }
    } catch (err) {
      result.skipped++
      console.warn(
        '[resolution-hook] recipient failed',
        params.trigger,
        userId,
        err
      )
    }
  }

  return result
}

/**
 * Author + verified co-signers for a signal (threshold recipients).
 */
export async function fetchSignalStakeholders(
  admin: SupabaseClient,
  signalId: string
): Promise<ResolutionRecipient[]> {
  const { data: signal } = await admin
    .from('citizen_signals')
    .select('author_user_id, created_at')
    .eq('id', signalId)
    .maybeSingle()

  const recipients: ResolutionRecipient[] = []
  if (signal?.author_user_id) {
    recipients.push({
      userId: signal.author_user_id,
      actionAt: signal.created_at,
    })
  }

  const { data: cosigns } = await admin
    .from('citizen_signal_cosigns')
    .select('user_id, created_at')
    .eq('signal_id', signalId)

  for (const row of cosigns ?? []) {
    if (!row.user_id) continue
    recipients.push({
      userId: row.user_id as string,
      actionAt: (row.created_at as string | null) ?? null,
    })
  }

  return recipients
}

/**
 * Voters on a Pulse / location evaluation market.
 */
export async function fetchMarketVoters(
  admin: SupabaseClient,
  marketId: string
): Promise<ResolutionRecipient[]> {
  const { data: votes } = await admin
    .from('market_votes')
    .select('user_id, created_at')
    .eq('market_id', marketId)
    .not('user_id', 'is', null)

  return (votes ?? [])
    .filter((v) => Boolean(v.user_id))
    .map((v) => ({
      userId: v.user_id as string,
      actionAt: (v.created_at as string | null) ?? null,
    }))
}
