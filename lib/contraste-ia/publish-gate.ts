/**
 * Contraste IA publish gate (pure; unit-tested).
 *
 * Rule (growth plan, Oct 19 2026): the AI prediction must exist BEFORE the
 * first vote. A Pulse is only published once its prediction is locked. If the
 * lock fails or times out, the Pulse stays a draft and the admin sees the
 * error, unless the admin explicitly chooses "publish anyway": then the
 * prediction will be produced later by the backstop cron and the DB trigger
 * marks it 'late' (excluded from public claims, see isClaimEligible).
 */

/** Minimal shape of ensurePredictionLocked()'s result (kept here to stay pure). */
export type LockOutcome =
  | { ok: true; skipped: true; reason: 'exists' }
  | { ok: true; skipped: false; status: 'locked' | 'late'; locked_at: string }
  | { ok: false; error: string }

export type PublishDecision =
  | { publish: true; contraste: 'locked' | 'already_locked' | 'late' | 'override_unlocked'; warning?: string }
  | { publish: false; code: 'contraste_lock_failed'; error: string; canOverride: true }

export const CONTRASTE_OVERRIDE_LABEL_ES = 'Publicar de todos modos (la predicción quedará como tardía)'

export function decidePublish(lock: LockOutcome, opts: { force?: boolean } = {}): PublishDecision {
  if (lock.ok) {
    if (lock.skipped) return { publish: true, contraste: 'already_locked' }
    return lock.status === 'locked'
      ? { publish: true, contraste: 'locked' }
      : { publish: true, contraste: 'late', warning: 'La predicción se registró pero quedó marcada como tardía.' }
  }
  if (opts.force) {
    return {
      publish: true,
      contraste: 'override_unlocked',
      warning: `Publicado sin predicción bloqueada (${lock.error}). La predicción se generará después y quedará como tardía.`,
    }
  }
  return {
    publish: false,
    code: 'contraste_lock_failed',
    error:
      lock.error === 'timeout'
        ? 'La predicción de Contraste IA tardó demasiado. El Pulse sigue como borrador; inténtalo de nuevo.'
        : `No se pudo bloquear la predicción de Contraste IA: ${lock.error}. El Pulse sigue como borrador.`,
    canOverride: true,
  }
}

/** Parse the admin override flag from a JSON body or query string value. */
export function parseForce(raw: unknown): boolean {
  return raw === true || raw === 'true' || raw === '1' || raw === 1
}

/**
 * Only a prediction locked before the first vote, for the current wording,
 * may back public / marketing claims ("la IA predijo antes de que votaras").
 */
export function isClaimEligible(p: { status: string; stale?: boolean } | null | undefined): boolean {
  return !!p && p.status === 'locked' && !p.stale
}
