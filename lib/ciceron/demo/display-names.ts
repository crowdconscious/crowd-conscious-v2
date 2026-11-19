/**
 * Lawyer-facing persona and firm names for the demo.
 * «Demo» never appears in a name a lawyer can see; the demo badge marks sample data.
 */

import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'

/** Fictional firm — no «Demo» in the name. */
export const FIRM_DISPLAY_NAME = 'Despacho Altamirano y Asociados, S.C.'

/** Stable display names by persona id (offline + DB remap). */
export const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  [CICERON_SEED.personas.socio]: 'Socia Valeria Rivera',
  [CICERON_SEED.personas.asociado]: 'Asociado Martín Herrera',
  [CICERON_SEED.personas.pasante]: 'Pasante Sofía López',
  [CICERON_SEED.personas.admin]: 'Administrador Luis Ortega',
  [CICERON_SEED.personas.asociado2]: 'Asociada Carmen Méndez',
  [CICERON_SEED.personas.coordinador]: 'Coordinador Andrés Salazar',
  [CICERON_SEED.personas.firmB]: 'Abogado Contraste Núñez',
}

/** Strip legacy «Demo» tokens from a stored display name. */
export function lawyerFacingPersonaName(
  raw: string | null | undefined,
  personaId?: string | null
): string {
  if (personaId && PERSONA_DISPLAY_NAMES[personaId]) {
    return PERSONA_DISPLAY_NAMES[personaId]!
  }
  if (!raw || !raw.trim()) return 'Usuario'
  const cleaned = raw
    .replace(/\bDemo\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'Usuario'
}

export function lawyerFacingFirmName(raw?: string | null): string {
  if (!raw) return FIRM_DISPLAY_NAME
  if (/\bDemo\b/i.test(raw) || /despacho demo/i.test(raw)) return FIRM_DISPLAY_NAME
  return raw
}
