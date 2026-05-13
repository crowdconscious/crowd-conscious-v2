import { NextRequest, NextResponse } from 'next/server'
import {
  createSignalsAdminClient,
  type SignalsAdminClient,
} from '@/lib/signals/supabase'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'
import { issueTargetToken } from '@/lib/signals/issue-target-token'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Citizen Signals — F15 Stage Threshold Cron.
 *
 * Runs every 15 minutes (see vercel.json crons entry) and promotes
 * `citizen_signals` rows through the escalation ladder:
 *
 *   threshold_stage 0 → 1 — once cosign_count >= STAGE1, mark stage 1,
 *     mint a magic-link token for the target and email
 *     `notification_email` via `sendSignalTargetNotifiedStage1` (when
 *     present — F13 may not be merged yet, so we runtime-check).
 *
 *   threshold_stage 1 → 2 — once cosign_count >= STAGE2, mark stage 2.
 *     **No mass mail in MVP** — the "publish dossier" email blast is the
 *     follow-up F-task; see TODO below.
 *
 * Idempotency: the `threshold_stage <` filter on every pass plus the
 * stage*_met_at timestamp guards mean a re-run within the same window
 * is a no-op for already-promoted signals.
 *
 * Auth: Bearer `process.env.CRON_SECRET` (mirrors pulse-auto-resolve).
 *
 * Stage thresholds default to the launch values (50 / 200) but read from
 * the same NEXT_PUBLIC_SIGNALS_STAGE* envs the client TimelineRail uses,
 * so the two surfaces never drift.
 */

const JOB_NAME = 'signal-threshold-check'

const STAGE1_DEFAULT = 50
const STAGE2_DEFAULT = 200

const ROW_LIMIT = 200

function readStageThreshold(envName: string, fallback: number): number {
  const raw = process.env[envName]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readBaseUrl(request: NextRequest): string {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return 'https://crowdconscious.app'
}

type Stage1EmailHelper = (args: {
  to: string
  targetName: string
  signalTitle: string
  signalSlug: string
  cosignCount: number
  magicLinkUrl: string
  language: string
}) => Promise<unknown>

/**
 * Soft-load `sendSignalTargetNotifiedStage1` from `@/lib/resend`. F13 ships
 * the helper; if it merges after F15 the cron must not crash — it should
 * skip the email and continue updating the DB state.
 *
 * The cron speaks a small intermediate shape (`targetName` + `language`) so
 * it can keep the same interface even if the underlying helper's argument
 * names change. We adapt to the F13 helper's `targetDisplayName` + `locale`
 * keys here.
 */
async function loadStage1EmailHelper(): Promise<Stage1EmailHelper | null> {
  const mod = (await import('@/lib/resend')) as Record<string, unknown>
  const fn = mod['sendSignalTargetNotifiedStage1']
  if (typeof fn !== 'function') return null
  type RealHelper = (args: {
    to: string
    locale: 'es' | 'en'
    targetDisplayName: string
    signalSlug: string
    signalTitle: string
    cosignCount: number
    magicLinkUrl: string
    expiryDays?: number
  }) => Promise<unknown>
  const real = fn as RealHelper
  return (args) =>
    real({
      to: args.to,
      locale: args.language === 'en' ? 'en' : 'es',
      targetDisplayName: args.targetName,
      signalSlug: args.signalSlug,
      signalTitle: args.signalTitle,
      cosignCount: args.cosignCount,
      magicLinkUrl: args.magicLinkUrl,
      expiryDays: 7,
    })
}

/**
 * The moderation_events table requires a non-null `admin_user_id`. The cron
 * has no human admin, so we resolve a "system" admin via:
 *   1. `SIGNALS_SYSTEM_ADMIN_USER_ID` env (a real auth.users uuid), then
 *   2. the first profile with `user_type = 'admin'` (lex by created_at).
 *
 * Cached for the duration of one cron invocation. Returns null if no admin
 * exists in the project — callers must handle that by skipping the audit
 * row (and logging) rather than aborting the whole batch.
 */
async function resolveSystemAdminUserId(
  admin: SignalsAdminClient
): Promise<string | null> {
  const fromEnv = process.env.SIGNALS_SYSTEM_ADMIN_USER_ID?.trim()
  if (fromEnv) return fromEnv
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('user_type', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

type SignalRow = {
  id: string
  public_slug: string
  title: string
  language: string
  cosign_count: number
  threshold_stage: number
  citizen_target_id: string
  private_target_notify_at: string | null
}

type CronError = {
  signalId: string
  stage: 1 | 2
  message: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSignalsAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)

  const stage1Threshold = readStageThreshold(
    'NEXT_PUBLIC_SIGNALS_STAGE1',
    STAGE1_DEFAULT
  )
  const stage2Threshold = readStageThreshold(
    'NEXT_PUBLIC_SIGNALS_STAGE2',
    STAGE2_DEFAULT
  )
  const baseUrl = readBaseUrl(request)

  const errors: CronError[] = []
  let stage1Promoted = 0
  let stage2Promoted = 0

  const adminUserId = await resolveSystemAdminUserId(admin)
  if (!adminUserId) {
    console.warn(
      '[cron/signal-threshold-check] no system admin user resolved — moderation_events rows will be skipped this run'
    )
  }

  const stage1Helper = await loadStage1EmailHelper()
  if (!stage1Helper) {
    console.warn(
      '[cron/signal-threshold-check] sendSignalTargetNotifiedStage1 not exported from @/lib/resend — F13 likely not merged yet; skipping stage 1 email send'
    )
  }

  // ===== Stage 1 pass =====
  try {
    const { data: stage1Rows, error: stage1QueryErr } = await admin
      .from('citizen_signals')
      .select(
        'id, public_slug, title, language, cosign_count, threshold_stage, citizen_target_id, private_target_notify_at'
      )
      .eq('publication_status', 'published')
      .lt('threshold_stage', 1)
      .gte('cosign_count', stage1Threshold)
      .order('cosign_count', { ascending: false })
      .limit(ROW_LIMIT)

    if (stage1QueryErr) {
      throw new Error(`stage1 query: ${stage1QueryErr.message}`)
    }

    for (const row of (stage1Rows ?? []) as SignalRow[]) {
      try {
        await promoteStage1({
          admin,
          row,
          baseUrl,
          adminUserId,
          stage1Helper,
        })
        stage1Promoted++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(
          '[cron/signal-threshold-check] stage1 failed',
          row.id,
          message
        )
        errors.push({ signalId: row.id, stage: 1, message })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/signal-threshold-check] stage1 batch error', message)
    errors.push({ signalId: 'batch', stage: 1, message })
  }

  // ===== Stage 2 pass =====
  try {
    const { data: stage2Rows, error: stage2QueryErr } = await admin
      .from('citizen_signals')
      .select(
        'id, public_slug, title, language, cosign_count, threshold_stage, citizen_target_id, private_target_notify_at'
      )
      .eq('publication_status', 'published')
      .lt('threshold_stage', 2)
      .gte('cosign_count', stage2Threshold)
      .order('cosign_count', { ascending: false })
      .limit(ROW_LIMIT)

    if (stage2QueryErr) {
      throw new Error(`stage2 query: ${stage2QueryErr.message}`)
    }

    for (const row of (stage2Rows ?? []) as SignalRow[]) {
      try {
        await promoteStage2({ admin, row, adminUserId })
        stage2Promoted++
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(
          '[cron/signal-threshold-check] stage2 failed',
          row.id,
          message
        )
        errors.push({ signalId: row.id, stage: 2, message })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/signal-threshold-check] stage2 batch error', message)
    errors.push({ signalId: 'batch', stage: 2, message })
  }

  await cronHealthComplete(runId, JOB_NAME, admin, {
    success: errors.length === 0,
    summary: `stage1=${stage1Promoted} stage2=${stage2Promoted} errors=${errors.length}`,
    error: errors.length
      ? errors
          .map((e) => `s${e.stage} ${e.signalId}: ${e.message}`)
          .join('; ')
      : undefined,
  })

  return NextResponse.json(
    {
      ok: true,
      stage1_promoted: stage1Promoted,
      stage2_promoted: stage2Promoted,
      errors: errors.length ? errors : undefined,
    },
    { status: 200 }
  )
}

async function promoteStage1(args: {
  admin: SignalsAdminClient
  row: SignalRow
  baseUrl: string
  adminUserId: string | null
  stage1Helper: Stage1EmailHelper | null
}): Promise<void> {
  const { admin, row, baseUrl, adminUserId, stage1Helper } = args
  const nowIso = new Date().toISOString()

  // Race-safe state flip: only update if still below stage 1. A second cron
  // process or a fast cosign->cron interleaving cannot double-promote.
  const { data: updated, error: updErr } = await admin
    .from('citizen_signals')
    .update({
      threshold_stage: 1,
      stage1_met_at: nowIso,
    })
    .eq('id', row.id)
    .lt('threshold_stage', 1)
    .select('id')
    .maybeSingle()

  if (updErr) {
    throw new Error(`update stage1: ${updErr.message}`)
  }
  if (!updated) {
    // Lost the race — another cron pass got here first.
    return
  }

  // Mint the magic-link token. We always mint fresh at the stage transition
  // so the email body has a usable raw token (we cannot read the prior
  // hash-only row back to re-send it).
  const issued = await issueTargetToken(admin, row.citizen_target_id, {
    ttlDays: 7,
  })

  // Look up the target's notification email + display name for the mail body.
  const { data: target } = await admin
    .from('citizen_targets')
    .select('id, display_name, notification_email')
    .eq('id', row.citizen_target_id)
    .maybeSingle()

  const magicLinkUrl = `${baseUrl}/dashboard/target/${issued.token}`

  let emailSent = false
  let emailError: string | null = null

  if (
    stage1Helper &&
    target?.notification_email &&
    target.notification_email.length > 0
  ) {
    try {
      await stage1Helper({
        to: target.notification_email,
        targetName: target.display_name,
        signalTitle: row.title,
        signalSlug: row.public_slug,
        cosignCount: row.cosign_count,
        magicLinkUrl,
        language: row.language,
      })
      emailSent = true
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err)
      console.error(
        '[cron/signal-threshold-check] stage1 email failed',
        row.id,
        emailError
      )
    }
  } else if (!target?.notification_email) {
    console.warn(
      '[cron/signal-threshold-check] stage1: no notification_email for target',
      row.citizen_target_id,
      'signal',
      row.id
    )
  }

  if (emailSent) {
    const { error: notifyErr } = await admin
      .from('citizen_signals')
      .update({ private_target_notify_at: nowIso })
      .eq('id', row.id)
    if (notifyErr) {
      console.error(
        '[cron/signal-threshold-check] stamp private_target_notify_at failed',
        row.id,
        notifyErr.message
      )
    }
  }

  if (adminUserId) {
    const { error: evErr } = await admin
      .from('citizen_signal_moderation_events')
      .insert({
        signal_id: row.id,
        admin_user_id: adminUserId,
        action: 'stage1_reached',
        detail: {
          source: 'cron/signal-threshold-check',
          cosign_count: row.cosign_count,
          target_id: row.citizen_target_id,
          token_id: issued.token_id,
          email_sent: emailSent,
          email_error: emailError,
          notification_email_present: Boolean(target?.notification_email),
        },
      })
    if (evErr) {
      console.error(
        '[cron/signal-threshold-check] moderation event (stage1) insert failed',
        row.id,
        evErr.message
      )
    }
  }
}

async function promoteStage2(args: {
  admin: SignalsAdminClient
  row: SignalRow
  adminUserId: string | null
}): Promise<void> {
  const { admin, row, adminUserId } = args
  const nowIso = new Date().toISOString()

  const { data: updated, error: updErr } = await admin
    .from('citizen_signals')
    .update({
      threshold_stage: 2,
      stage2_met_at: nowIso,
    })
    .eq('id', row.id)
    .lt('threshold_stage', 2)
    .select('id')
    .maybeSingle()

  if (updErr) {
    throw new Error(`update stage2: ${updErr.message}`)
  }
  if (!updated) {
    return
  }

  // TODO(F15-followup): trigger the public dossier email blast to all
  // citizen_signal_subscriptions for this signal + a press packet PDF
  // build. Out of scope for the MVP cron (see SIGNALS-MVP-CHECKLIST.md
  // "Out of scope" note in the cron section).

  if (adminUserId) {
    const { error: evErr } = await admin
      .from('citizen_signal_moderation_events')
      .insert({
        signal_id: row.id,
        admin_user_id: adminUserId,
        action: 'stage2_reached',
        detail: {
          source: 'cron/signal-threshold-check',
          cosign_count: row.cosign_count,
          target_id: row.citizen_target_id,
        },
      })
    if (evErr) {
      console.error(
        '[cron/signal-threshold-check] moderation event (stage2) insert failed',
        row.id,
        evErr.message
      )
    }
  }
}
