/**
 * App Store Guideline 5.2.1 — block protected FIFA trademarks in user-authored
 * text. SCOPED: generic tournament language ("World Cup", "Mundial", "Copa del
 * Mundo", "torneo", team/country names) is NOT infringing and passes through.
 * Only actual FIFA marks are filtered — the word mark "FIFA" (which also covers
 * official phrases like "FIFA World Cup" and the "FIFA World Cup Trophy") plus
 * any obvious official emblem name. Server-side gate on POST /api/signals.
 */
const SPORTS_EVENT_BLOCKLIST: RegExp[] = [/\bfifa\b/i]

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
  'target_name',
  'target_contact_email',
  'target_location_id',
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

/**
 * Creation-time gate for Pulses. The mobile app strips protected FIFA marks
 * client-side for App Store Guideline 5.2.1, so a Pulse carrying such a mark is
 * published on web but silently vanishes on mobile. Reject at creation instead
 * so a Pulse can never appear on one surface but not the other. Generic
 * tournament language is allowed — only official FIFA marks trip this gate.
 * Callers pass every user-facing text field (both languages) the mobile filter
 * inspects.
 */
export function firstPulseBrandingViolation(
  fields: Array<string | null | undefined>
): string | null {
  for (const field of fields) {
    if (field && containsSportsEventBranding(field)) {
      return 'El texto del Pulse usa una marca protegida de la FIFA. Los términos genéricos ("Mundial", "Copa del Mundo", nombres de selecciones) sí se permiten; solo elimina las marcas oficiales de la FIFA para que aparezca en web y en la app. / Pulse text uses a protected FIFA trademark. Generic terms ("World Cup", "Mundial", national team names) are allowed; only remove official FIFA marks so it shows on both web and mobile.'
    }
  }
  return null
}
