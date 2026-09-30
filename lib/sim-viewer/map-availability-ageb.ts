/**
 * Strict AGEB mappability (code ∈ GeoJSON + finite centroids).
 * Kept separate from colonia/alcaldía fallbacks so callers can distinguish
 * precise census-block placement from approximate placement.
 */

export type AgebMapPersona = {
  agebCode: string | null
  centroidLat: number | null
  centroidLng: number | null
}

export function isPersonaMappable(
  persona: AgebMapPersona,
  geoCodes: ReadonlySet<string>,
): boolean {
  const code = persona.agebCode
  if (typeof code !== 'string' || code.trim().length === 0) return false
  if (!geoCodes.has(code)) return false
  if (
    typeof persona.centroidLat !== 'number' ||
    !Number.isFinite(persona.centroidLat)
  ) {
    return false
  }
  if (
    typeof persona.centroidLng !== 'number' ||
    !Number.isFinite(persona.centroidLng)
  ) {
    return false
  }
  return true
}
