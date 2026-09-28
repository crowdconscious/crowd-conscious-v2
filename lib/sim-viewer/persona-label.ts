/**
 * Human-facing persona labels for the sim viewer.
 * Deep-link keys (?persona=) may still be UUIDs internally — never show those.
 */

/** Matches DB uuid / RFC-4122 strings (any version/variant). */
const UUID_LOOSE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuidLike(value: string | null | undefined): boolean {
  if (!value) return false
  return UUID_LOOSE_RE.test(value.trim())
}

/**
 * persona_key is usable as a label when present, non-empty, and not a UUID.
 * Fixture keys like `mh-fixture-c-001` pass; raw agent UUIDs do not.
 */
export function isHumanReadablePersonaKey(
  key: string | null | undefined,
): boolean {
  if (!key) return false
  const trimmed = key.trim()
  if (trimmed.length === 0) return false
  if (isUuidLike(trimmed)) return false
  return true
}

/**
 * Stable user-facing label: human persona_key, else "Persona N"
 * (1-based from sequence / vote order).
 */
export function personaDisplayLabel(
  personaKey: string | null | undefined,
  sequenceIndex: number,
): string {
  if (isHumanReadablePersonaKey(personaKey)) {
    return (personaKey as string).trim()
  }
  const n = Number.isFinite(sequenceIndex)
    ? Math.max(1, Math.floor(sequenceIndex) + 1)
    : 1
  return `Persona ${n}`
}
