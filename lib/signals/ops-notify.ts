/**
 * Stage 1/2 ops packet send + durable ledger.
 *
 * Always emails francisco@ + comunidad@ (or SIGNALS_OPS_EMAIL_TO).
 * Author-suggested / company emails are listed in the packet only — never
 * Resend To: for institutions. Verified registry / Conscious Location
 * emails may still receive the existing Stage-1 authority mail with ops BCC.
 */

import type { SignalsAdminClient } from '@/lib/signals/supabase'
import {
  type AuthorSuggestedContact,
  type OpsRoutingMode,
  isSignalsOpsEmailEnabled,
  resolveSignalsOpsRecipients,
} from '@/lib/signals/ops-contacts'
import {
  OpsPacketStage1Email,
  OpsPacketStage2Email,
  type OpsVerifiedAuthority,
} from '@/lib/emails/signals/OpsPacketStage1Email'
import {
  sendSignalOpsPacket,
  sendSignalTargetNotifiedStage1,
  type SignalEmailResult,
} from '@/lib/resend'

export type OpsNotifyStage = 1 | 2

export type OpsNotifySignal = {
  id: string
  public_slug: string
  title: string
  language: string
  cosign_count: number
  threshold_stage: number
  category: string | null
  street_reference: string | null
  conscious_location_id: string | null
  citizen_target_id: string | null
  target_kind: string | null
  target_name: string | null
  target_contact_email: string | null
  target_location_id: string | null
  private_target_notify_at: string | null
  ops_routing_mode?: OpsRoutingMode | null
  author_suggested_contacts?: unknown
}

export type VerifiedAuthority = {
  email: string
  displayName: string
  source: OpsVerifiedAuthority['source']
  magicLinkUrl: string | null
  ctaMode: 'dashboard' | 'public'
}

function appBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

/** Subject short title — keep subjects scannable in crowded inboxes. */
export function shortSignalTitle(title: string, max = 72): string {
  const trimmed = title.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

export function opsPacketSubject(
  stage: OpsNotifyStage,
  stageThreshold: number,
  title: string
): string {
  const short = shortSignalTitle(title)
  if (stage === 1) {
    return `Señal lista para enviar · ${stageThreshold} respaldos · ${short}`
  }
  return `Prioridad pública · ${stageThreshold} respaldos · ${short} · presión social`
}

async function resolvePlaceLabel(
  admin: SignalsAdminClient,
  row: OpsNotifySignal
): Promise<string> {
  const street = row.street_reference?.trim() || null
  const locationId = row.conscious_location_id || row.target_location_id
  let locationName: string | null = null
  if (locationId) {
    const { data: loc } = await admin
      .from('conscious_locations')
      .select('id, name')
      .eq('id', locationId)
      .maybeSingle()
    locationName = loc?.name?.trim() || null
  }
  if (street && locationName) return `${street} · ${locationName}`
  if (street) return street
  if (locationName) return locationName
  if (row.target_name?.trim()) return row.target_name.trim()
  return '—'
}

function parseSuggestedContacts(raw: unknown): AuthorSuggestedContact[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((row): row is AuthorSuggestedContact => {
    if (!row || typeof row !== 'object') return false
    const r = row as Record<string, unknown>
    return typeof r.kind === 'string' && typeof r.value === 'string'
  }) as AuthorSuggestedContact[]
}

export async function resolveVerifiedAuthority(
  admin: SignalsAdminClient,
  row: OpsNotifySignal,
  baseUrl: string,
  magicLinkUrl: string | null
): Promise<VerifiedAuthority | null> {
  if (row.citizen_target_id) {
    const { data: target } = await admin
      .from('citizen_targets')
      .select('id, display_name, notification_email')
      .eq('id', row.citizen_target_id)
      .maybeSingle()
    const email = target?.notification_email?.trim() ?? null
    if (!email) return null
    return {
      email,
      displayName: target?.display_name ?? row.target_name ?? 'Destinatario',
      source: 'citizen_targets.notification_email',
      magicLinkUrl,
      ctaMode: 'dashboard',
    }
  }

  if (row.target_kind === 'conscious_location' && row.target_location_id) {
    const { data: loc } = await admin
      .from('conscious_locations')
      .select('id, name, contact_email')
      .eq('id', row.target_location_id)
      .maybeSingle()
    const email = loc?.contact_email?.trim() ?? null
    if (!email) return null
    return {
      email,
      displayName: loc?.name ?? row.target_name ?? 'Lugar Consciente',
      source: 'conscious_locations.contact_email',
      magicLinkUrl: `${appBaseUrl(baseUrl)}/signals/${row.public_slug}`,
      ctaMode: 'public',
    }
  }

  return null
}

async function readOpsLogStatus(
  admin: SignalsAdminClient,
  signalId: string,
  stage: OpsNotifyStage
): Promise<'sent' | 'failed' | 'skipped' | null> {
  const { data } = await admin
    .from('citizen_signal_ops_notify_log')
    .select('status')
    .eq('signal_id', signalId)
    .eq('stage', stage)
    .maybeSingle()
  return (data?.status as 'sent' | 'failed' | 'skipped' | undefined) ?? null
}

async function upsertOpsLog(
  admin: SignalsAdminClient,
  args: {
    signalId: string
    stage: OpsNotifyStage
    status: 'sent' | 'failed' | 'skipped'
    resendId?: string | null
    error?: string | null
    recipients: string[]
  }
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await admin.from('citizen_signal_ops_notify_log').upsert(
    {
      signal_id: args.signalId,
      stage: args.stage,
      status: args.status,
      resend_id: args.resendId ?? null,
      error: args.error ?? null,
      recipients: args.recipients,
      sent_at: args.status === 'sent' ? now : null,
      updated_at: now,
    },
    { onConflict: 'signal_id,stage' }
  )
  if (error) {
    console.error(
      '[signals/ops-notify] upsert log failed',
      args.signalId,
      args.stage,
      error.message
    )
  }
}

export type SendOpsPacketResult = {
  attempted: boolean
  status: 'sent' | 'failed' | 'skipped' | 'already_sent'
  resendId?: string
  error?: string
  recipients: string[]
}

/**
 * Send (or retry) the ops packet for a stage. Idempotent via ledger:
 * skips when status=sent; retries when missing or failed.
 */
export async function sendOrRetryOpsPacket(args: {
  admin: SignalsAdminClient
  row: OpsNotifySignal
  stage: OpsNotifyStage
  stageThreshold: number
  baseUrl: string
  verifiedAuthority: VerifiedAuthority | null
  authorityMailStatus: OpsVerifiedAuthority['authorityMailStatus']
  magicLinkUrl: string | null
}): Promise<SendOpsPacketResult> {
  const {
    admin,
    row,
    stage,
    stageThreshold,
    baseUrl,
    verifiedAuthority,
    authorityMailStatus,
    magicLinkUrl,
  } = args

  const recipients = resolveSignalsOpsRecipients()
  const existing = await readOpsLogStatus(admin, row.id, stage)
  if (existing === 'sent') {
    return { attempted: false, status: 'already_sent', recipients }
  }

  if (!isSignalsOpsEmailEnabled()) {
    await upsertOpsLog(admin, {
      signalId: row.id,
      stage,
      status: 'skipped',
      error: 'SIGNALS_OPS_EMAIL_ENABLED=false or RESEND_ENABLED=false',
      recipients,
    })
    return {
      attempted: false,
      status: 'skipped',
      error: 'ops_email_disabled',
      recipients,
    }
  }

  if (recipients.length === 0) {
    await upsertOpsLog(admin, {
      signalId: row.id,
      stage,
      status: 'skipped',
      error: 'no_ops_recipients',
      recipients,
    })
    return {
      attempted: false,
      status: 'skipped',
      error: 'no_ops_recipients',
      recipients,
    }
  }

  const opsRoutingMode: OpsRoutingMode =
    row.ops_routing_mode === 'author_provided'
      ? 'author_provided'
      : 'crowd_conscious'
  const authorSuggestedContacts = parseSuggestedContacts(
    row.author_suggested_contacts
  )
  const root = appBaseUrl(baseUrl)
  const signalUrl = `${root}/signals/${row.public_slug}`
  const adminUrl = `${root}/admin/signals`
  const placeLabel = await resolvePlaceLabel(admin, row)
  const officialEmail = verifiedAuthority?.email ?? null
  const targetDisplayName =
    verifiedAuthority?.displayName ?? row.target_name ?? null

  const common = {
    signalId: row.id,
    signalTitle: row.title,
    signalSlug: row.public_slug,
    signalUrl,
    adminUrl,
    placeLabel,
    category: row.category?.trim() || '—',
    cosignCount: row.cosign_count,
    stageThreshold,
    opsRoutingMode,
    targetDisplayName,
    officialEmail,
    authorSuggestedContacts,
    companyContactEmail:
      row.target_kind === 'company' ? row.target_contact_email : null,
  }

  // Francisco-locked subjects (ES).
  const subject = opsPacketSubject(stage, stageThreshold, row.title)

  const react =
    stage === 1
      ? OpsPacketStage1Email({ ...common, magicLinkUrl })
      : OpsPacketStage2Email(common)

  // Recipients are always francisco@ + comunidad@ (or SIGNALS_OPS_EMAIL_TO).
  // Author-suggested contacts are never included in `to`.
  const result: SignalEmailResult = await sendSignalOpsPacket({
    to: recipients,
    subject,
    react,
    context:
      stage === 1 ? 'signals/ops-packet-stage1' : 'signals/ops-packet-stage2',
  })

  if (result.ok) {
    await upsertOpsLog(admin, {
      signalId: row.id,
      stage,
      status: 'sent',
      resendId: result.id ?? null,
      recipients,
    })
    return {
      attempted: true,
      status: 'sent',
      resendId: result.id,
      recipients,
    }
  }

  await upsertOpsLog(admin, {
    signalId: row.id,
    stage,
    status: 'failed',
    error: result.error ?? 'send_failed',
    recipients,
  })
  return {
    attempted: true,
    status: 'failed',
    error: result.error ?? 'send_failed',
    recipients,
  }
}

/**
 * Stage-1 authority mail — only for verified registry / location emails.
 * Company author-supplied emails are NOT auto-To'd.
 * On success, stamps private_target_notify_at. Ops recipients go in BCC.
 */
export async function sendVerifiedAuthorityStage1(args: {
  admin: SignalsAdminClient
  row: OpsNotifySignal
  verified: VerifiedAuthority
  locale: 'es' | 'en'
}): Promise<{ sent: boolean; error?: string }> {
  const { admin, row, verified, locale } = args

  if (row.private_target_notify_at) {
    return { sent: false, error: 'already_stamped' }
  }

  if (!verified.magicLinkUrl) {
    return { sent: false, error: 'missing_magic_link' }
  }

  const opsBcc = isSignalsOpsEmailEnabled()
    ? resolveSignalsOpsRecipients().filter(
        (e) => e.toLowerCase() !== verified.email.toLowerCase()
      )
    : []

  const result = await sendSignalTargetNotifiedStage1({
    to: verified.email,
    locale,
    targetDisplayName: verified.displayName,
    signalSlug: row.public_slug,
    signalTitle: row.title,
    cosignCount: row.cosign_count,
    magicLinkUrl: verified.magicLinkUrl,
    expiryDays: 7,
    ctaMode: verified.ctaMode,
    bcc: opsBcc.length > 0 ? opsBcc : undefined,
  })

  if (!result.ok) {
    return { sent: false, error: result.error ?? 'send_failed' }
  }

  const nowIso = new Date().toISOString()
  const { error: stampErr } = await admin
    .from('citizen_signals')
    .update({ private_target_notify_at: nowIso })
    .eq('id', row.id)
    .is('private_target_notify_at', null)

  if (stampErr) {
    console.error(
      '[signals/ops-notify] stamp private_target_notify_at failed',
      row.id,
      stampErr.message
    )
  }

  return { sent: true }
}
