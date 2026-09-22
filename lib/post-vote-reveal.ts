/**
 * Post-vote reveal logic (UX overhaul Phase 1 §3.3).
 *
 * Pure helpers: pick one of three headline cases from real confidence-weighted
 * aggregates, never from simulation. Density honesty stays in
 * lib/display/participation.ts (threshold = 25).
 */

import {
  outcomeAvgConfidence,
  type PulseOutcomeVoteStats,
} from '@/lib/pulse-vote-aggregates'
import { PARTICIPATION_REVEAL_THRESHOLD } from '@/lib/display/participation'

export type RevealHeadlineCase =
  | 'leader_lower_confidence'
  | 'majority_high_confidence'
  | 'minority_highest_confidence'
  | 'generic'

export type RevealOutcome = {
  id: string
  label: string
  /** Confidence-weighted share 0..1 (same as Results). */
  probability: number
  avgConfidence: number | null
}

export type RevealHeadline = {
  case: RevealHeadlineCase
  /** Interpolated headline already localized. */
  text: string
  leaderLabel: string
  trailerLabel: string | null
}

const HIGH_CONFIDENCE = 7

export function canShowFullReveal(voteN: number): boolean {
  return voteN >= PARTICIPATION_REVEAL_THRESHOLD
}

/**
 * Pick the §3.3 headline. Prefer the three contrast cases; fall back to a
 * short generic line when the numbers do not support a contrast claim.
 *
 * Order: personal minority conviction → majority high confidence → leader
 * vs surer trailer. Personal cases win when they apply so the reveal speaks
 * to the voter who just acted.
 */
export function buildRevealHeadline(
  outcomes: RevealOutcome[],
  userOutcomeId: string | null | undefined,
  locale: 'es' | 'en'
): RevealHeadline {
  const es = locale === 'es'
  const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
  const leader = sorted[0]
  if (!leader) {
    return {
      case: 'generic',
      text: es
        ? 'Tu voto acaba de mejorar la lectura de tu comunidad.'
        : 'Your vote just sharpened your community’s reading.',
      leaderLabel: '',
      trailerLabel: null,
    }
  }

  const userOutcome = userOutcomeId
    ? outcomes.find((o) => o.id === userOutcomeId)
    : null
  const userIsMajority = !!userOutcome && userOutcome.id === leader.id

  const highestConf = outcomes.reduce<{ id: string; conf: number } | null>(
    (best, o) => {
      if (o.avgConfidence == null) return best
      if (!best || o.avgConfidence > best.conf) {
        return { id: o.id, conf: o.avgConfidence }
      }
      return best
    },
    null
  )

  if (
    userOutcome &&
    highestConf &&
    userOutcome.id === highestConf.id &&
    userOutcome.id !== leader.id
  ) {
    return {
      case: 'minority_highest_confidence',
      text: es
        ? 'Estás en minoría — pero es la minoría más convencida.'
        : 'You’re in the minority — but it’s the most convinced minority.',
      leaderLabel: leader.label,
      trailerLabel: userOutcome.label,
    }
  }

  const userSideHigh =
    userOutcome?.avgConfidence != null &&
    userOutcome.avgConfidence >= HIGH_CONFIDENCE

  if (userIsMajority && userSideHigh) {
    return {
      case: 'majority_high_confidence',
      text: es
        ? 'No estás solo, y tu grupo está muy seguro.'
        : 'You’re not alone — and your side is very sure.',
      leaderLabel: leader.label,
      trailerLabel: null,
    }
  }

  const trailer = sorted.find(
    (o) =>
      o.id !== leader.id &&
      o.avgConfidence != null &&
      leader.avgConfidence != null &&
      o.avgConfidence > leader.avgConfidence
  )

  if (
    trailer &&
    leader.avgConfidence != null &&
    trailer.avgConfidence != null &&
    trailer.avgConfidence > leader.avgConfidence
  ) {
    return {
      case: 'leader_lower_confidence',
      text: es
        ? `${leader.label} gana, pero quienes eligieron ${trailer.label} están más seguros.`
        : `${leader.label} leads, but people who chose ${trailer.label} are more certain.`,
      leaderLabel: leader.label,
      trailerLabel: trailer.label,
    }
  }

  return {
    case: 'generic',
    text: es
      ? 'Así va la lectura de tu comunidad hasta ahora.'
      : 'Here’s how your community reads so far.',
    leaderLabel: leader.label,
    trailerLabel: null,
  }
}

export function revealClosingLine(locale: 'es' | 'en'): string {
  return locale === 'es'
    ? 'Tu voto acaba de mejorar la lectura de tu comunidad.'
    : 'Your vote just sharpened your community’s reading.'
}

export function lowNRevealCopy(locale: 'es' | 'en'): {
  headline: string
  body: string
  notifyCta: string
} {
  if (locale === 'es') {
    return {
      headline: 'Eres de los primeros en opinar.',
      body: 'Te avisamos cuando haya suficientes votos para ver cómo se compara tu certeza.',
      notifyCta: 'Avísame',
    }
  }
  return {
    headline: 'You’re one of the first voices.',
    body: 'We’ll let you know when there are enough votes to compare your certainty.',
    notifyCta: 'Notify me',
  }
}

/** Map outcome vote stats → avg confidence for reveal bars. */
export function avgConfidenceMap(
  byOutcome: Record<string, PulseOutcomeVoteStats>
): Record<string, number | null> {
  const out: Record<string, number | null> = {}
  for (const [id, stats] of Object.entries(byOutcome)) {
    out[id] = outcomeAvgConfidence(stats)
  }
  return out
}

/** Confidence 0 = "No lo sé" — stored but excluded from averages. */
export const CONFIDENCE_UNKNOWN = 0

export function isConfidenceUnknown(c: number | null | undefined): boolean {
  return c === CONFIDENCE_UNKNOWN
}

export function isStatedConfidence(c: number | null | undefined): c is number {
  return typeof c === 'number' && c >= 1 && c <= 10
}
