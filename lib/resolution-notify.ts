/**
 * Phase 2 resolution notify helpers — one entry point per trigger.
 * Mobile and web share these server paths; mobile consumes the resulting
 * Expo pushes + in-app notification rows.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildLocationCertifiedPush,
  buildPulseResolutionPush,
  buildSignalOfficialResponsePush,
  buildSignalSilencePush,
  buildSignalStage200Push,
  buildSignalStage50Push,
} from '@/lib/expo-push'
import {
  dispatchResolutionNotifications,
  fetchMarketVoters,
  fetchSignalStakeholders,
  type ResolutionDispatchResult,
  userHasPushToken,
} from '@/lib/resolution-hook'
import { sendMarketResolutionEmail, sendSignalTargetReplied } from '@/lib/resend'
import type { TargetReplyStatus } from '@/lib/emails/signals/TargetRepliedEmail'
import { isPredictionResolutionEmailEnabled } from '@/lib/email-flags'

const emptyResult = (): ResolutionDispatchResult => ({
  considered: 0,
  sentPush: 0,
  sentEmail: 0,
  inAppOnly: 0,
  suppressedDaily: 0,
  suppressedDuplicate: 0,
  skipped: 0,
})

export async function notifySignalStageCrossed(
  admin: SupabaseClient,
  params: {
    signalId: string
    slug: string
    title: string
    stage: 1 | 2
  }
): Promise<ResolutionDispatchResult> {
  const trigger = params.stage === 1 ? 'signal_stage_50' : 'signal_stage_200'
  const inAppType = trigger
  const recipients = await fetchSignalStakeholders(admin, params.signalId)
  const build =
    params.stage === 1 ? buildSignalStage50Push : buildSignalStage200Push

  return dispatchResolutionNotifications(admin, {
    trigger,
    objectType: 'signal',
    objectId: params.signalId,
    recipients,
    inAppType,
    webLink: `/signals/${params.slug}`,
    buildPayload: ({ locale }) =>
      build({ slug: params.slug, title: params.title, locale }),
  })
}

export async function notifySignalOfficialResponse(
  admin: SupabaseClient,
  params: {
    signalId: string
    slug: string
    title: string
    language: string
    authorLabel: string
    officialStatus: TargetReplyStatus
    responseBody: string
  }
): Promise<ResolutionDispatchResult> {
  const recipients = await fetchSignalStakeholders(admin, params.signalId)

  return dispatchResolutionNotifications(admin, {
    trigger: 'signal_official_response',
    objectType: 'signal',
    objectId: params.signalId,
    recipients,
    inAppType: 'signal_official_response',
    webLink: `/signals/${params.slug}`,
    buildPayload: ({ locale }) =>
      buildSignalOfficialResponsePush({
        slug: params.slug,
        title: params.title,
        locale,
      }),
    sendEmailFallback: async ({ userId, locale }) => {
      // Author email already existed; co-signers get the same template when
      // they have no push token. Skip if they already got push (hook rule).
      if (await userHasPushToken(admin, userId)) return false
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (!profile?.email) return false
      try {
        await sendSignalTargetReplied({
          to: profile.email,
          locale: locale === 'en' ? 'en' : 'es',
          signalSlug: params.slug,
          signalTitle: params.title,
          filerName: profile.full_name ?? null,
          authorLabel: params.authorLabel,
          officialStatus: params.officialStatus,
          responseBody: params.responseBody,
        })
        return true
      } catch (err) {
        console.warn('[resolution-notify] target-replied email failed', err)
        return false
      }
    },
  })
}

export async function notifySignalSilencePublished(
  admin: SupabaseClient,
  params: { signalId: string; slug: string; title: string }
): Promise<ResolutionDispatchResult> {
  const recipients = await fetchSignalStakeholders(admin, params.signalId)

  return dispatchResolutionNotifications(admin, {
    trigger: 'signal_silence_30d',
    objectType: 'signal',
    objectId: params.signalId,
    recipients,
    inAppType: 'signal_silence_30d',
    webLink: `/signals/${params.slug}`,
    buildPayload: ({ locale }) =>
      buildSignalSilencePush({
        slug: params.slug,
        title: params.title,
        locale,
      }),
  })
}

export async function notifyPulseClosedViaResolutionHook(
  admin: SupabaseClient,
  params: {
    marketId: string
    marketTitle: string
    winningOutcomeId: string
    winningLabel: string
  }
): Promise<ResolutionDispatchResult> {
  const { data: votes } = await admin
    .from('market_votes')
    .select('user_id, outcome_id, bonus_xp, created_at')
    .eq('market_id', params.marketId)
    .not('user_id', 'is', null)

  if (!votes?.length) return emptyResult()

  const recipients = votes.map((v) => ({
    userId: v.user_id as string,
    actionAt: (v.created_at as string | null) ?? null,
  }))

  const wonByUser = new Map<string, boolean>()
  const bonusByUser = new Map<string, number>()
  for (const v of votes) {
    if (!v.user_id) continue
    wonByUser.set(v.user_id, v.outcome_id === params.winningOutcomeId)
    bonusByUser.set(v.user_id, (v.bonus_xp as number | null) ?? 0)
  }

  return dispatchResolutionNotifications(admin, {
    trigger: 'pulse_close',
    objectType: 'pulse',
    objectId: params.marketId,
    recipients,
    inAppType: 'pulse_resolved',
    webLink: `/pulse/${params.marketId}`,
    buildPayload: ({ locale, userId }) =>
      buildPulseResolutionPush({
        marketId: params.marketId,
        marketTitle: params.marketTitle,
        winningLabel: params.winningLabel,
        won: wonByUser.get(userId) ?? false,
        bonusXp: bonusByUser.get(userId) ?? 0,
        locale,
      }),
    sendEmailFallback: async ({ userId }) => {
      if (!isPredictionResolutionEmailEnabled()) return false
      if (await userHasPushToken(admin, userId)) return false
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (!profile?.email) return false
      try {
        await sendMarketResolutionEmail(
          profile.email,
          profile.full_name || 'Predictor',
          params.marketTitle,
          params.winningLabel,
          wonByUser.get(userId) ?? false,
          bonusByUser.get(userId)
        )
        return true
      } catch (err) {
        console.warn('[resolution-notify] pulse close email failed', err)
        return false
      }
    },
  })
}

export async function notifyLocationCertifiedEvaluators(
  admin: SupabaseClient,
  params: {
    locationId: string
    slug: string
    name: string
    marketId: string | null
  }
): Promise<ResolutionDispatchResult> {
  if (!params.marketId) return emptyResult()

  const recipients = await fetchMarketVoters(admin, params.marketId)
  if (recipients.length === 0) return emptyResult()

  return dispatchResolutionNotifications(admin, {
    trigger: 'location_certified',
    objectType: 'location',
    objectId: params.locationId,
    recipients,
    inAppType: 'location_certified',
    webLink: `/locations/${params.slug}`,
    buildPayload: ({ locale }) =>
      buildLocationCertifiedPush({
        slug: params.slug,
        name: params.name,
        locale,
      }),
  })
}
