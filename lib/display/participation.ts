/**
 * Centralized display helpers for A2 — "never render a zero next to a
 * promise" (CC_BUILD_CONTEXT.md §1 convention #4 and §4/A2).
 *
 * The platform must never show a small vote count, a "0 votos", a "$0
 * Repartido", or a "faltan N votos" promise next to a call to action. Every
 * raw-count surface routes its display through the helpers here so the
 * thresholds and copy stay in exactly one place.
 *
 * Pure formatting/logic: no React, DOM, or Supabase imports, so it runs
 * identically on the server and the client and is trivially unit-testable.
 * Aggregate math (shares/confidence) is NOT re-implemented here — that lives
 * in lib/pulse-vote-aggregates.ts; this module only decides how the resulting
 * counts and figures are rendered.
 *
 * Spanish-first with English variants, matching the repo's `'es' | 'en'`
 * i18n pattern (see lib/i18n/*).
 */

export type ParticipationLang = 'es' | 'en'

/**
 * Below this many votes we reveal "Votación abierta" instead of the raw
 * count. At/above it, the real number is trustworthy enough to show.
 */
export const PARTICIPATION_REVEAL_THRESHOLD = 25

/** Fallback fund event date used when NEXT_PUBLIC_FUND_EVENT_DATE is unset. */
export const DEFAULT_FUND_EVENT_DATE = '2026-08-21'

const MS_PER_DAY = 86_400_000

const VOTING_OPEN: Record<ParticipationLang, string> = {
  es: 'Votación abierta',
  en: 'Voting open',
}

const FUND_CYCLE_IN_PROGRESS: Record<ParticipationLang, string> = {
  es: 'Ciclo 1 en curso — la primera entrega del Fondo se anuncia en agosto.',
  en: 'Cycle 1 underway — the first Fund allocation will be announced in August.',
}

const SCORE_IN_VOTING: Record<ParticipationLang, string> = {
  es: 'Score en votación',
  en: 'Score in voting',
}

/** True once the count is large enough to render the real number. */
export function shouldRevealCount(count: number): boolean {
  return count >= PARTICIPATION_REVEAL_THRESHOLD
}

/**
 * Vote-count display. Counts below the reveal threshold render "Votación
 * abierta" (es) / "Voting open" (en); at/above it, the real localized count.
 *
 * `withUnit` (default true) appends the "voto(s)"/"vote(s)" word for inline
 * copy like "128 votos"; pass false when the surface shows the number on its
 * own (e.g. a stat tile with its own label).
 */
export function formatParticipationCount(
  count: number,
  lang: ParticipationLang,
  options: { withUnit?: boolean } = {}
): string {
  if (!shouldRevealCount(count)) return VOTING_OPEN[lang]

  const n = count.toLocaleString(lang === 'es' ? 'es-MX' : 'en-US')
  if (options.withUnit === false) return n

  const unit =
    lang === 'es'
      ? count === 1
        ? 'voto'
        : 'votos'
      : count === 1
        ? 'vote'
        : 'votes'
  return `${n} ${unit}`
}

/**
 * Replacement for the "0 votos → $0" promise: a positive, in-progress
 * message instead of a pair of zeros.
 */
export function fundCycleInProgressNote(lang: ParticipationLang): string {
  return FUND_CYCLE_IN_PROGRESS[lang]
}

/** Reads NEXT_PUBLIC_FUND_EVENT_DATE, falling back to DEFAULT_FUND_EVENT_DATE. */
export function getFundEventDate(): string {
  return process.env.NEXT_PUBLIC_FUND_EVENT_DATE || DEFAULT_FUND_EVENT_DATE
}

/** Parsed fund event date; falls back to the default when the env value is invalid. */
export function getFundEventDateObject(): Date {
  const parsed = new Date(getFundEventDate())
  return Number.isNaN(parsed.getTime()) ? new Date(DEFAULT_FUND_EVENT_DATE) : parsed
}

/** Whole days from `now` to `target`, compared at UTC calendar-day granularity. */
function daysUntil(now: Date, target: Date): number {
  const a = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const b = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate())
  return Math.round((b - a) / MS_PER_DAY)
}

/**
 * Countdown copy that replaces the "$0 Repartido" fund figure until the first
 * allocation. Pure over (now, target) so it can be unit-tested; use
 * fundCountdownText() for the env-wired convenience wrapper.
 */
export function formatFundCountdown(
  now: Date,
  target: Date,
  lang: ParticipationLang
): string {
  const days = daysUntil(now, target)
  const es = lang === 'es'
  if (days > 1) {
    return es
      ? `Primera entrega del Fondo en ${days} días`
      : `First Fund allocation in ${days} days`
  }
  if (days === 1) {
    return es
      ? 'Primera entrega del Fondo mañana'
      : 'First Fund allocation tomorrow'
  }
  if (days === 0) {
    return es ? 'Primera entrega del Fondo hoy' : 'First Fund allocation today'
  }
  // Target already passed but no real distribution yet: stay forward-looking.
  return es ? 'Primera entrega del Fondo muy pronto' : 'First Fund allocation coming soon'
}

/** Env-wired countdown to the configured fund event date. */
export function fundCountdownText(
  lang: ParticipationLang,
  now: Date = new Date()
): string {
  return formatFundCountdown(now, getFundEventDateObject(), lang)
}

/**
 * Replacement for "faltan N votos para el Score": drops the raw remaining
 * count in favor of a neutral in-progress label.
 */
export function scoreInVotingLabel(lang: ParticipationLang): string {
  return SCORE_IN_VOTING[lang]
}
