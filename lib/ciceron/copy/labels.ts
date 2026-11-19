/**
 * Display-only Spanish labels for enums and structured fields.
 * Matching / persistence strings stay untouched; UI maps through these helpers.
 */

import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateShortEs } from '@/lib/ciceron/copy/format-date'

const RAW_TIER_VALUES = ['A', 'B', 'C', 'D', 'E', 'not_verified'] as const

export type SourceTierKey = (typeof RAW_TIER_VALUES)[number]

/** A2 — source level as lawyer-facing words (never raw A/B/not_verified). */
export function sourceTierLabel(tier: string | null | undefined): string {
  const key = (tier ?? 'not_verified') as SourceTierKey
  const map = copy.boletines.tier
  if (key in map) return map[key as keyof typeof map]
  return map.not_verified
}

export function isRawSourceTierValue(text: string): boolean {
  return (RAW_TIER_VALUES as readonly string[]).includes(text.trim())
}

const FAILURE_STAGES = [
  'fetch',
  'parse',
  'count_check',
  'terms',
  'disabled',
  'manual_required',
] as const

export type FailureStageKey = (typeof FAILURE_STAGES)[number]

/** A1 — failure copy from failure_stage, never stored developer wording. */
export function failureStageLabel(stage: string | null | undefined): string | null {
  if (!stage) return null
  const map = copy.boletines.failureStage
  if ((FAILURE_STAGES as readonly string[]).includes(stage)) {
    return map[stage as FailureStageKey]
  }
  return map.fetch
}

export function manualCheckStatusLabel(status: string | null | undefined): string {
  const map = copy.boletines.manualStatus
  if (!status) return '—'
  if (status in map) return map[status as keyof typeof map]
  return status
}

export type HitReasonInput = {
  matchKind: 'exact' | 'possible'
  expedienteNumber?: string | null
  courtName?: string | null
  /** Optional party name variant when the match was by party similarity. */
  partyVariant?: string | null
  /** True when expediente matched but court did not appear in the publication. */
  numberWithoutCourt?: boolean
}

/** D4 — plain-language match reason from structured fields. */
export function hitReasonLabel(input: HitReasonInput): string {
  const { matchKind, expedienteNumber, courtName, partyVariant, numberWithoutCourt } =
    input
  if (matchKind === 'exact') {
    if (expedienteNumber && courtName) {
      return copy.boletines.reasonExactCourt
        .replace('{expediente}', expedienteNumber)
        .replace('{court}', courtName)
    }
    return copy.boletines.reasonExact
  }
  if (numberWithoutCourt) {
    return copy.boletines.reasonPossibleNumberNoCourt
  }
  if (partyVariant) {
    return copy.boletines.reasonPossibleParty.replace('{variant}', partyVariant)
  }
  return copy.boletines.reasonPossibleGeneric
}

/**
 * Infer a display party variant from stored reason text when structured
 * metadata is absent (demo rows). Never returns the raw reason.
 */
export function partyVariantFromStoredReason(reason: string | null | undefined): string | null {
  if (!reason) return null
  const m = reason.match(/«([^»]+)»/)
  return m?.[1] ?? null
}

export function eventTypeLabel(eventType: string | null | undefined): string {
  if (!eventType) return '—'
  const map = copy.expedientes.eventTypes
  if (eventType in map) return map[eventType as keyof typeof map]
  // Fallback: humanize snake_case without exposing the raw token as-is.
  return eventType
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Rewrite deadline computation text for display: replace snake_case rule tokens
 * and ISO dates with Spanish labels. Does not mutate stored computation_text.
 */
export function computationDisplayText(raw: string | null | undefined): string {
  if (!raw) return '—'
  let text = raw
  const types = Object.keys(copy.expedientes.eventTypes).sort(
    (a, b) => b.length - a.length
  )
  for (const key of types) {
    const label = copy.expedientes.eventTypes[key as keyof typeof copy.expedientes.eventTypes]
    text = text.replaceAll(key, label)
  }
  text = text.replace(/\bRegla ejemplo\b/gi, copy.expedientes.ruleExample)
  text = text.replace(
    /^Ejemplo de demostración\s*[—–-]\s*/i,
    ''
  )
  // ISO dates → short Spanish (B1); never leave yyyy-mm-dd in the UI.
  text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (iso) => formatDateShortEs(iso))
  return text
}

/** Fundamento text without «Ejemplo de demostración» prefix (legacy DB rows). */
export function basisDisplayText(raw: string | null | undefined): string {
  if (!raw) return '—'
  return computationDisplayText(raw)
}

export function auditActionLabel(action: string | null | undefined): string {
  if (!action) return '—'
  const map = copy.audit.actions
  if (action in map) return map[action as keyof typeof map]
  return action
}

/** Known raw tokens that must never appear in lawyer-facing UI text. */
export const FORBIDDEN_UI_TOKENS = [
  'not_verified',
  'acuerdo_requerimiento',
  'notificacion_demanda',
  'notificacion_sentencia',
  'Cloudflare',
  'captcha',
  'tier D',
  'tier A',
  'tier B',
  'tokens de nombre',
  'CDMX demo',
  'Edomex demo',
  'Fuente de datos: base de datos',
  'Fuente de datos: fixture',
] as const

export function findForbiddenUiToken(text: string): string | null {
  const lower = text.toLowerCase()
  for (const token of FORBIDDEN_UI_TOKENS) {
    if (lower.includes(token.toLowerCase())) return token
  }
  // Raw single-letter tiers as whole strings
  if (/^(?:[A-E]|not_verified)$/.test(text.trim())) return text.trim()
  return null
}
