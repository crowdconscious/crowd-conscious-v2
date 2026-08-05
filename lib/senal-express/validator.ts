/**
 * Structural guardrails for the Señal Express oficio draft (§7.1 — these are
 * release-blockers). The system prompt instructs the model, but instruction is
 * not enforcement: this post-parse validator is the deterministic backstop. The
 * draft route runs it after every model call and, on any violation, retries
 * ONCE with a stricter reminder, then FAILS the request rather than shipping a
 * non-compliant oficio.
 *
 * Two categories of violation:
 *  1. Legal citations — the model must NEVER cite laws/reglamentos/artículos.
 *     Vetted legal snippets are added by the owner later, never generated.
 *  2. Named / accused individuals + partisan framing — the oficio judges
 *     conditions, not people or parties (apolitical by construction, §1).
 */

import type { ExpressDraft } from './types'

/**
 * Deny-list for legal citations. Deliberately broad: any of these tokens in the
 * generated prose fails the draft. Matches the §7.1 list
 * (artículo|ley |reglamento|fracción|LGEEPA|constituc) plus a few close variants.
 */
export const LAW_CITATION_RE =
  /(art[íi]culo|\bley\b|\bleyes\b|reglamento|fracci[óo]n|lgeepa|constituc|c[óo]digo\s+(civil|penal|fiscal)|norma\s+oficial|\bnom-\d)/i

/**
 * Partisan framing deny-list — party names/acronyms must never appear. Acronyms
 * are matched as whole words so "pan" (bread) inside another word never trips it.
 */
export const PARTISAN_RE =
  /\b(morena|pri|pan|prd|pvem|pt|movimiento\s+ciudadano|partido)\b/i

/**
 * Named-individual heuristic: an honorific/title immediately followed by a
 * capitalised proper name (e.g. "Lic. Pérez", "Dip. García"). Titles alone
 * (e.g. "la alcaldía", "el alcalde") do NOT trip it — only title + name — so
 * the generic destinatario role never false-positives. This is a heuristic
 * backstop; the prompt is the primary defence against naming people.
 */
export const NAMED_INDIVIDUAL_RE =
  /\b(lic|ing|dip|sen|mtr[oa]|dra?|arq|c\.?\s*ciudadan[oa]|profr?)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/

export type OficioViolationKind = 'law_citation' | 'partisan' | 'named_individual'

export interface OficioValidationResult {
  ok: boolean
  violations: OficioViolationKind[]
}

/** Concatenate every user-facing field of a draft into one scan string. */
function draftText(draft: ExpressDraft): string {
  return [draft.asunto, ...(draft.cuerpo_parrafos ?? []), draft.peticion]
    .filter((s): s is string => typeof s === 'string')
    .join('\n')
}

/**
 * Validate the free-text fields of an oficio draft against the guardrails.
 * Returns every violation found (not just the first) for clear logging.
 */
export function validateOficioText(text: string): OficioValidationResult {
  const violations: OficioViolationKind[] = []
  if (LAW_CITATION_RE.test(text)) violations.push('law_citation')
  if (PARTISAN_RE.test(text)) violations.push('partisan')
  if (NAMED_INDIVIDUAL_RE.test(text)) violations.push('named_individual')
  return { ok: violations.length === 0, violations }
}

/** Validate a parsed draft (asunto + cuerpo_parrafos + peticion). */
export function validateOficioDraft(
  draft: ExpressDraft
): OficioValidationResult {
  return validateOficioText(draftText(draft))
}
