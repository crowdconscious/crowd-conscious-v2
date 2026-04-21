/**
 * Sponsor notification dispatch — sits between the two trigger points
 * (create-pulse handler, market-resolution-notifications helper) and the
 * pure email template + low-level Resend send.
 *
 * Responsibilities:
 *   1. Resolve the sponsor's current preferences (email_preferences JSONB)
 *      and short-circuit if the channel is disabled.
 *   2. Build per-channel unsubscribe URLs with HMAC tokens bound to the
 *      account id + email type.
 *   3. Compose public / dashboard / report URLs from a single canonical
 *      base (NEXT_PUBLIC_APP_URL).
 *   4. Send through `sendEmail` in `lib/resend.ts`, swallowing errors —
 *      transactional sponsor emails must NEVER crash a publish or a
 *      resolution.
 *
 * Callers should invoke `dispatch…` functions fire-and-forget (`void
 * dispatchSponsorPulseLaunchEmail(...).catch(() => {})`) so the happy
 * path (publish succeeds / resolution completes) isn't blocked by email
 * latency, and transient Resend failures don't surface to the user.
 */

import { createAdminClient } from './supabase-admin'
import { sendEmail } from './resend'
import {
  createSponsorUnsubscribeToken,
  type SponsorEmailType,
} from './email-unsubscribe'
import {
  sponsorPulseLaunchTemplate,
  sponsorPulseClosureTemplate,
} from './sponsor-pulse-emails'

type Locale = 'es' | 'en'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

type SponsorRowForEmail = {
  id: string
  company_name: string | null
  contact_email: string | null
  access_token: string | null
  locale: string | null
  email_preferences: Record<string, unknown> | null
}

const DEFAULT_PREFS: Record<SponsorEmailType, boolean> = {
  pulse_launch: true,
  pulse_closure: true,
}

/** Read a single sponsor_accounts row with just the columns we need. */
async function loadSponsorForEmail(
  sponsorAccountId: string
): Promise<SponsorRowForEmail | null> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sponsor_accounts')
      .select('id, company_name, contact_email, access_token, locale, email_preferences')
      .eq('id', sponsorAccountId)
      .maybeSingle()
    if (error) {
      console.warn('[sponsor-notifications] load failed:', error.message)
      return null
    }
    return (data as SponsorRowForEmail) ?? null
  } catch (err) {
    console.warn('[sponsor-notifications] load threw:', err)
    return null
  }
}

function normalizeLocale(raw: string | null | undefined): Locale {
  return raw === 'en' ? 'en' : 'es'
}

function isChannelOn(
  prefs: Record<string, unknown> | null | undefined,
  channel: SponsorEmailType
): boolean {
  if (!prefs || typeof prefs !== 'object') return DEFAULT_PREFS[channel]
  const v = (prefs as Record<string, unknown>)[channel]
  if (typeof v === 'boolean') return v
  return DEFAULT_PREFS[channel]
}

function buildUrls(params: {
  sponsorAccountId: string
  emailType: SponsorEmailType
  accessToken: string | null
  marketId: string
  locale: Locale
}) {
  const token = createSponsorUnsubscribeToken(params.sponsorAccountId, params.emailType)
  const unsubscribeUrl = `${APP_URL}/api/email/unsubscribe/sponsor?account=${encodeURIComponent(
    params.sponsorAccountId
  )}&type=${encodeURIComponent(params.emailType)}&token=${token}`

  // If the sponsor has no access_token, fall back to the generic upgrade
  // prompt. This should never happen for an active sponsor but keeps the
  // email safe to render.
  const dashboardBase = params.accessToken
    ? `${APP_URL}/dashboard/sponsor/${params.accessToken}`
    : `${APP_URL}/sponsor-accounts`

  const manageUrl = params.accessToken
    ? `${dashboardBase}#notifications`
    : dashboardBase

  const dashboardReportUrl = params.accessToken
    ? `${dashboardBase}/report/${params.marketId}`
    : dashboardBase

  const publicPulseUrl = `${APP_URL}/pulse/${params.marketId}`

  return { unsubscribeUrl, manageUrl, dashboardReportUrl, publicPulseUrl }
}

/**
 * Pulse launch email — called immediately after a sponsor successfully
 * publishes a new Pulse market. Idempotency is best-effort: the trigger
 * is tied to a single successful POST response, which Next.js won't
 * replay on its own. Duplicate sends would require a user double-submit
 * that also double-inserted the market; not worth a dedupe column for
 * the current volume.
 */
export async function dispatchSponsorPulseLaunchEmail(input: {
  sponsorAccountId: string
  marketId: string
  marketTitle: string
  marketQuestion?: string | null
  endsAtIso: string
  coverImageUrl?: string | null
}): Promise<{ sent: boolean; reason?: string }> {
  const sponsor = await loadSponsorForEmail(input.sponsorAccountId)
  if (!sponsor) return { sent: false, reason: 'sponsor_not_found' }
  if (!sponsor.contact_email) return { sent: false, reason: 'no_contact_email' }
  if (!isChannelOn(sponsor.email_preferences, 'pulse_launch')) {
    return { sent: false, reason: 'pref_opted_out' }
  }

  const locale = normalizeLocale(sponsor.locale)
  const { unsubscribeUrl, manageUrl, dashboardReportUrl, publicPulseUrl } = buildUrls({
    sponsorAccountId: sponsor.id,
    emailType: 'pulse_launch',
    accessToken: sponsor.access_token,
    marketId: input.marketId,
    locale,
  })

  const template = sponsorPulseLaunchTemplate({
    sponsorName: sponsor.company_name || (locale === 'en' ? 'Sponsor' : 'Patrocinador'),
    marketTitle: input.marketTitle,
    marketQuestion: input.marketQuestion ?? null,
    marketId: input.marketId,
    endsAtIso: input.endsAtIso,
    coverImageUrl: input.coverImageUrl ?? null,
    publicPulseUrl,
    dashboardReportUrl,
    locale,
    unsubscribeUrl,
    manageUrl,
  })

  const res = await sendEmail(sponsor.contact_email, template)
  if (!res.success) {
    console.warn('[sponsor-notifications] pulse_launch send failed:', res.error)
    return { sent: false, reason: res.error || 'send_failed' }
  }
  return { sent: true }
}

/**
 * Pulse closure email — called from market-resolution-notifications for
 * any resolved market where is_pulse=true and sponsor_account_id is set.
 * Resolution itself is idempotent (prediction_markets.status=resolved is
 * a one-way gate), and the notifier runs inside the same post-resolve
 * path that already handles voter emails, so the email goes out once per
 * resolution.
 */
export async function dispatchSponsorPulseClosureEmail(input: {
  sponsorAccountId: string
  marketId: string
  marketTitle: string
  winningLabel: string | null
  totalVoters?: number | null
}): Promise<{ sent: boolean; reason?: string }> {
  const sponsor = await loadSponsorForEmail(input.sponsorAccountId)
  if (!sponsor) return { sent: false, reason: 'sponsor_not_found' }
  if (!sponsor.contact_email) return { sent: false, reason: 'no_contact_email' }
  if (!isChannelOn(sponsor.email_preferences, 'pulse_closure')) {
    return { sent: false, reason: 'pref_opted_out' }
  }

  const locale = normalizeLocale(sponsor.locale)
  const { unsubscribeUrl, manageUrl, dashboardReportUrl, publicPulseUrl } = buildUrls({
    sponsorAccountId: sponsor.id,
    emailType: 'pulse_closure',
    accessToken: sponsor.access_token,
    marketId: input.marketId,
    locale,
  })

  const template = sponsorPulseClosureTemplate({
    sponsorName: sponsor.company_name || (locale === 'en' ? 'Sponsor' : 'Patrocinador'),
    marketTitle: input.marketTitle,
    marketId: input.marketId,
    winningLabel: input.winningLabel,
    totalVoters: input.totalVoters ?? null,
    publicPulseUrl,
    dashboardReportUrl,
    locale,
    unsubscribeUrl,
    manageUrl,
  })

  const res = await sendEmail(sponsor.contact_email, template)
  if (!res.success) {
    console.warn('[sponsor-notifications] pulse_closure send failed:', res.error)
    return { sent: false, reason: res.error || 'send_failed' }
  }
  return { sent: true }
}
