/**
 * Server-side helper to mint a magic-link access token for a citizen_target.
 *
 * Used by:
 *   - app/api/cron/signal-threshold-check (auto-issue when a signal hits stage 1)
 *
 * The admin "issue magic link" UI in
 * app/api/admin/signals/targets/[id]/access-token/route.ts predates this
 * helper and inlines the same primitives from `lib/target-token-hash.ts`. We
 * intentionally do not refactor that route here to keep this F15 change
 * focused; both paths share the same crypto helpers, so the on-disk shape
 * stays consistent.
 *
 * Returns the **raw token exactly once** so the caller can drop it into the
 * outbound email URL. Only the SHA-256 hex hash is persisted in
 * `citizen_target_access_tokens.token_hash`.
 */

import type { SignalsAdminClient } from '@/lib/signals/supabase'
import {
  hashTargetToken,
  mintRawTargetToken,
} from '@/lib/target-token-hash'

/** Default lifetime for cron-minted tokens. Spec'd in F15 as 7 days. */
export const CRON_TARGET_TOKEN_TTL_DAYS = 7

export type IssuedTargetToken = {
  /** Raw token — include in the magic-link URL, never persist. */
  token: string
  /** SHA-256 hex of the raw token; mirrors the DB row. */
  hash: string
  /** ISO timestamp of expiry. */
  expires_at: string
  /** Newly inserted citizen_target_access_tokens.id. */
  token_id: string
}

export type IssueTargetTokenOptions = {
  /** Override the 7-day default. Capped at 365 days defensively. */
  ttlDays?: number
  /**
   * If true, mark any existing non-revoked tokens for this target as
   * revoked before inserting the new one. Mirrors the admin
   * "issue magic link" flow. Defaults to false because the cron is
   * already idempotent at the signal level — we only enter this code
   * path on a stage transition.
   */
  revokePrior?: boolean
}

/**
 * Mint and persist a fresh access token for the given citizen_target.
 * The caller is responsible for emailing the raw token; this helper does
 * not send mail.
 */
export async function issueTargetToken(
  admin: SignalsAdminClient,
  citizenTargetId: string,
  options: IssueTargetTokenOptions = {}
): Promise<IssuedTargetToken> {
  const ttlDays = Math.min(
    Math.max(1, options.ttlDays ?? CRON_TARGET_TOKEN_TTL_DAYS),
    365
  )

  if (options.revokePrior) {
    await admin
      .from('citizen_target_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('citizen_target_id', citizenTargetId)
      .is('revoked_at', null)
  }

  const raw = mintRawTargetToken()
  const hash = hashTargetToken(raw)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + ttlDays)

  const { data, error } = await admin
    .from('citizen_target_access_tokens')
    .insert({
      citizen_target_id: citizenTargetId,
      token_hash: hash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id, expires_at')
    .single()

  if (error || !data) {
    throw new Error(
      `Failed to insert citizen_target_access_tokens row: ${
        error?.message ?? 'unknown'
      }`
    )
  }

  return {
    token: raw,
    hash,
    expires_at: data.expires_at,
    token_id: data.id,
  }
}
