import { NextRequest, NextResponse } from 'next/server'
import { Expo } from 'expo-server-sdk'
import { createAdminClient } from '@/lib/supabase-admin'
import { cronHealthCheck, cronHealthComplete } from '@/lib/cron-health'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const JOB_NAME = 'push-receipts'

/**
 * Expo push tickets only confirm the message reached Expo; the *receipt*
 * (available a few minutes later) carries the actual APNs/FCM outcome —
 * including credential errors that are otherwise invisible. This cron
 * resolves pending push_log rows (migration 242):
 *
 *   - receipt ok    → status 'ok'
 *   - receipt error → status 'error' + detail; DeviceNotRegistered also
 *                     prunes the token (mirrors the ticket-stage pruning
 *                     in lib/expo-push.ts)
 *   - no receipt yet → left pending for the next run
 *   - pending > 36h  → marked error (Expo discards receipts after ~24h)
 *
 * Auth: Bearer `process.env.CRON_SECRET` (mirrors pulse-auto-resolve).
 */

const RECEIPT_MIN_AGE_MS = 15 * 60 * 1000
const RECEIPT_EXPIRY_MS = 36 * 60 * 60 * 1000
const BATCH_LIMIT = 1000

type PendingLogRow = {
  id: string
  expo_ticket_id: string
  push_token_id: string | null
}

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN })

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { runId } = await cronHealthCheck(JOB_NAME, admin)

  const now = Date.now()
  const minAgeIso = new Date(now - RECEIPT_MIN_AGE_MS).toISOString()
  const expiryIso = new Date(now - RECEIPT_EXPIRY_MS).toISOString()
  const checkedAt = new Date(now).toISOString()

  const errors: string[] = []
  let resolvedOk = 0
  let resolvedError = 0
  let expired = 0
  let prunedTokens = 0

  // Expire rows whose receipt window has passed — Expo no longer has them,
  // so they would otherwise stay pending forever.
  const { data: expiredRows, error: expireErr } = await admin
    .from('push_log')
    .update({
      status: 'error',
      error_detail: 'receipt expired: no receipt fetched within 36h',
      checked_at: checkedAt,
    })
    .eq('status', 'pending')
    .lt('created_at', expiryIso)
    .select('id')

  if (expireErr) {
    errors.push(`expire pass: ${expireErr.message}`)
  } else {
    expired = (expiredRows ?? []).length
  }

  const { data: pendingRaw, error: pendingErr } = await admin
    .from('push_log')
    .select('id, expo_ticket_id, push_token_id')
    .eq('status', 'pending')
    .not('expo_ticket_id', 'is', null)
    .lt('created_at', minAgeIso)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (pendingErr) {
    errors.push(`pending query: ${pendingErr.message}`)
  }

  const pending = (pendingRaw ?? []) as PendingLogRow[]
  const rowsByTicket = new Map<string, PendingLogRow>()
  for (const row of pending) {
    rowsByTicket.set(row.expo_ticket_id, row)
  }

  const okIds: string[] = []
  const staleTokenIds = new Set<string>()

  const ticketChunks = expo.chunkPushNotificationReceiptIds([
    ...rowsByTicket.keys(),
  ])

  for (const chunk of ticketChunks) {
    let receipts: Awaited<
      ReturnType<typeof expo.getPushNotificationReceiptsAsync>
    >
    try {
      receipts = await expo.getPushNotificationReceiptsAsync(chunk)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[cron/push-receipts] receipt fetch failed:', message)
      errors.push(`receipt fetch: ${message}`)
      continue
    }

    for (const [ticketId, receipt] of Object.entries(receipts)) {
      const row = rowsByTicket.get(ticketId)
      if (!row) continue

      if (receipt.status === 'ok') {
        okIds.push(row.id)
        continue
      }

      const detailError = receipt.details?.error
      const detail = detailError
        ? `${detailError}: ${receipt.message}`
        : receipt.message
      const { error: updErr } = await admin
        .from('push_log')
        .update({ status: 'error', error_detail: detail, checked_at: checkedAt })
        .eq('id', row.id)
      if (updErr) {
        errors.push(`update ${row.id}: ${updErr.message}`)
        continue
      }
      resolvedError++

      if (detailError === 'DeviceNotRegistered' && row.push_token_id) {
        staleTokenIds.add(row.push_token_id)
      }
    }
  }

  if (okIds.length > 0) {
    const { error: okErr } = await admin
      .from('push_log')
      .update({ status: 'ok', checked_at: checkedAt })
      .in('id', okIds)
    if (okErr) {
      errors.push(`ok batch update: ${okErr.message}`)
    } else {
      resolvedOk = okIds.length
    }
  }

  if (staleTokenIds.size > 0) {
    const { error: pruneErr } = await admin
      .from('push_tokens')
      .delete()
      .in('id', [...staleTokenIds])
    if (pruneErr) {
      errors.push(`token prune: ${pruneErr.message}`)
    } else {
      prunedTokens = staleTokenIds.size
    }
  }

  await cronHealthComplete(runId, JOB_NAME, admin, {
    success: errors.length === 0,
    summary: `checked=${pending.length} ok=${resolvedOk} error=${resolvedError} expired=${expired} pruned=${prunedTokens}`,
    error: errors.length ? errors.join('; ') : undefined,
  })

  return NextResponse.json({
    ok: true,
    checked: pending.length,
    resolved_ok: resolvedOk,
    resolved_error: resolvedError,
    expired,
    pruned_tokens: prunedTokens,
    errors: errors.length ? errors : undefined,
  })
}
