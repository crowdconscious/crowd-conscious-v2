/**
 * App Store Guideline 5.2.1 — block FIFA / World Cup / Mundial branding in
 * user-authored signal text. Server-side gate on POST /api/signals; DB should
 * be neutralized too.
 */
const SPORTS_EVENT_BLOCKLIST: RegExp[] = [
  /copa\s+del\s+mundo(?:\s*2026)?/i,
  /world\s*cup(?:\s*2026)?/i,
  /mundial(?:\s*2026)?/i,
  /\bfifa\b/i,
]

export function containsSportsEventBranding(text: string): boolean {
  if (!text) return false
  return SPORTS_EVENT_BLOCKLIST.some((pattern) => pattern.test(text))
}

const OBSERVATION_FORBIDDEN_ROUTED_KEYS = [
  'citizen_target_id',
  'conscious_location_id',
  'target_kind',
  'partner_location_id',
  'street_reference',
] as const

export function observationPayloadHasForbiddenRoutedFields(
  json: unknown
): boolean {
  if (!json || typeof json !== 'object') return false
  const obj = json as Record<string, unknown>
  return OBSERVATION_FORBIDDEN_ROUTED_KEYS.some(
    (key) => obj[key] !== undefined && obj[key] !== null
  )
}

export function firstSignalContentPolicyViolation(
  fields: Array<string | null | undefined>
): string | null {
  for (const field of fields) {
    if (field && containsSportsEventBranding(field)) {
      return 'Content contains blocked sports-event branding'
    }
  }
  return null
}
