/**
 * Read-time helpers for pre-viewer (migrations 252–254) simulation rows.
 *
 * Old votes store option_chosen (label text) with null option_id /
 * sequence_index. Old personas lack persona_key / AGEB / grounding.
 * These helpers let the replay viewer work without migration 267.
 */

import { createSeededRng, seededShuffle } from './prng.ts'
import type { DivergenceMeta } from '../../types/simulation.ts'

/** Trim + lowercase + strip combining marks (á→a) for label matching. */
export function normalizeLabelKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Build a label→optionId map. Keys are normalizeLabelKey'd.
 * First occurrence wins when labels collide after normalization.
 */
export function buildOptionLabelIndex(
  outcomes: readonly { id: string; label: string }[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const o of outcomes) {
    const key = normalizeLabelKey(o.label)
    if (!map.has(key)) map.set(key, o.id)
  }
  return map
}

/**
 * Resolve option_id from a vote row. Prefer the UUID when present;
 * otherwise match option_chosen to an outcome label (accent/case-insensitive).
 */
export function resolveOptionId(
  row: { option_id: string | null; option_chosen?: string | null },
  labelIndex: Map<string, string>,
): string | null {
  if (row.option_id) return row.option_id
  const chosen = row.option_chosen
  if (typeof chosen !== 'string' || chosen.trim().length === 0) return null
  return labelIndex.get(normalizeLabelKey(chosen)) ?? null
}

/**
 * AMAI band from income_band / nse_band. Maps legacy 'D/E' and 'E' → 'D'
 * (same as the fixture builder) so the inspector colour key stays stable.
 */
export function normalizeNseBand(band: string | null | undefined): string | null {
  if (band == null) return null
  const trimmed = band.trim()
  if (trimmed.length === 0) return null
  if (trimmed === 'D/E' || trimmed === 'E') return 'D'
  return trimmed
}

/**
 * Parse household size from free-text `household` when the text is clear.
 * Returns null when ambiguous — never invents a count (unlike the fixture
 * builder, which falls back to a seeded RNG for demo density).
 */
export function householdSizeFromText(household: string | null | undefined): number | null {
  if (!household) return null
  const lower = household.toLowerCase()
  const nums = lower.match(/\b([1-9]|1[0-2])\b/g)
  if (nums && nums.length > 0) {
    const mentioned = nums.map(Number)
    const maxMentioned = Math.max(...mentioned)
    if (/solo|sola/.test(lower)) return 1
    if (/pareja|espos[oa]|compañer/.test(lower)) {
      return Math.min(7, Math.max(2, maxMentioned + 1))
    }
    if (/roommate|compañer|amigo|prima|primo/.test(lower)) {
      return Math.min(7, maxMentioned + 1)
    }
    return Math.min(7, Math.max(1, maxMentioned))
  }
  if (/solo|sola/.test(lower)) return 1
  if (/pareja|espos[oa]/.test(lower)) return 2
  return null
}

/**
 * Deterministic replay order for votes that lack sequence_index.
 * Seeded by run id so reloads are stable. Mutates nothing on input —
 * returns a new array of sequence indices aligned with `sequences`.
 *
 * When every item already has a sequence, returns those values.
 * When none have a sequence, returns a full 0..n-1 shuffle of positions.
 * When mixed, fills free slots for the nulls via a seeded shuffle.
 */
export function assignLegacySequenceIndices(
  sequences: readonly (number | null)[],
  runId: string,
): number[] {
  const n = sequences.length
  const nullPositions: number[] = []
  const used = new Set<number>()

  for (let i = 0; i < n; i++) {
    const seq = sequences[i]!
    if (seq === null) {
      nullPositions.push(i)
    } else {
      used.add(seq)
    }
  }

  if (nullPositions.length === 0) {
    return sequences.map((s) => s as number)
  }

  // Pure legacy run: shuffle vote positions, assign 0..n-1 in that order.
  if (nullPositions.length === n) {
    const order = seededShuffle(
      Array.from({ length: n }, (_, i) => i),
      createSeededRng(`sim-viewer-seq:${runId}`),
    )
    const assigned = new Array<number>(n)
    for (let seq = 0; seq < n; seq++) {
      assigned[order[seq]!] = seq
    }
    return assigned
  }

  // Mixed: keep existing indices; fill free slots for nulls.
  const result = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const seq = sequences[i]
    if (seq !== null) result[i] = seq
  }

  const free: number[] = []
  for (let i = 0; free.length < nullPositions.length; i++) {
    if (!used.has(i)) free.push(i)
  }

  const rng = createSeededRng(`sim-viewer-seq:${runId}`)
  const shuffledSlots = seededShuffle(free, rng)
  for (let k = 0; k < nullPositions.length; k++) {
    result[nullPositions[k]!] = shuffledSlots[k]!
  }
  return result
}

/**
 * Map old pipeline divergence jsonb OR new divergence_meta into DivergenceMeta.
 *
 * Old shape (lib/simulation/divergence.ts):
 *   { id, delta_shares, delta_confidence, per_option, computed_at }
 * New shape (migration 266 / viewer):
 *   { index, shareScore, confScore, computedAt }
 */
export function parseDivergenceMeta(raw: unknown): DivergenceMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>

  // New viewer shape
  const indexNew = typeof o.index === 'number' ? o.index : null
  const shareNew = typeof o.shareScore === 'number' ? o.shareScore : null
  const confNew = typeof o.confScore === 'number' ? o.confScore : null
  const computedNew =
    typeof o.computedAt === 'string'
      ? o.computedAt
      : typeof o.computed_at === 'string'
        ? o.computed_at
        : null

  if (
    indexNew !== null &&
    shareNew !== null &&
    confNew !== null &&
    computedNew !== null
  ) {
    return {
      index: indexNew,
      shareScore: shareNew,
      confScore: confNew,
      computedAt: computedNew,
    }
  }

  // Legacy B-pipeline shape: id + delta_* in 0–1
  const indexLegacy = typeof o.id === 'number' ? o.id : null
  const deltaShares = typeof o.delta_shares === 'number' ? o.delta_shares : null
  const deltaConf =
    typeof o.delta_confidence === 'number' ? o.delta_confidence : null
  const computedLegacy =
    typeof o.computed_at === 'string'
      ? o.computed_at
      : typeof o.computedAt === 'string'
        ? o.computedAt
        : null

  if (
    indexLegacy !== null &&
    deltaShares !== null &&
    deltaConf !== null &&
    computedLegacy !== null
  ) {
    return {
      index: indexLegacy,
      shareScore: deltaShares * 100,
      confScore: deltaConf * 100,
      computedAt: computedLegacy,
    }
  }

  return null
}

/** Latest ISO timestamp among vote created_at values (for completedAt fallback). */
export function latestVoteCreatedAt(
  createdAts: readonly (string | null | undefined)[],
): string | null {
  let best: string | null = null
  let bestMs = -Infinity
  for (const raw of createdAts) {
    if (typeof raw !== 'string' || raw.length === 0) continue
    const ms = Date.parse(raw)
    if (!Number.isFinite(ms)) continue
    if (ms >= bestMs) {
      bestMs = ms
      best = raw
    }
  }
  return best
}

/** Honest calibration line for legacy personas without AGEB grounding. */
export const LEGACY_PERSONA_BASIS_LINE =
  'Perfil sintético calibrado con pesos por alcaldía (INEGI)'
