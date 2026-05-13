/**
 * Shared list of CDMX alcaldía slugs used by both:
 *  - scripts/seed-conscious-locations-cdmx.ts (the seeder that creates the
 *    16 `conscious_locations` rows)
 *  - app/signals/nueva/page.tsx (the compose wizard's two-stage location
 *    picker, which must always render exactly these 16 rows as the
 *    "broad bucket" picker, even when SIGNALS_ALLOWED_LOCATION_IDS is set)
 *
 * Keep this file framework-free (no imports, no side effects) so the seed
 * script can import it without dragging in Next/React, and the Next
 * server components can import it without dragging in dotenv.
 *
 * The slugs match the rows the seeder upserts; do NOT rename without also
 * running a one-shot data migration to update existing rows.
 */

export const CDMX_ALCALDIA_SLUGS = [
  'cdmx-alvaro-obregon',
  'cdmx-azcapotzalco',
  'cdmx-benito-juarez',
  'cdmx-coyoacan',
  'cdmx-cuajimalpa',
  'cdmx-cuauhtemoc',
  'cdmx-gustavo-a-madero',
  'cdmx-iztacalco',
  'cdmx-iztapalapa',
  'cdmx-magdalena-contreras',
  'cdmx-miguel-hidalgo',
  'cdmx-milpa-alta',
  'cdmx-tlahuac',
  'cdmx-tlalpan',
  'cdmx-venustiano-carranza',
  'cdmx-xochimilco',
] as const

export type CdmxAlcaldiaSlug = (typeof CDMX_ALCALDIA_SLUGS)[number]

/**
 * Display names — kept in canonical Spanish (the way the rows are seeded).
 * Used only as a tooltip / fallback when the row lookup fails; the picker
 * always prefers the DB `name` column so admins can rename a row freely.
 */
export const CDMX_ALCALDIA_DISPLAY_NAMES: Record<CdmxAlcaldiaSlug, string> = {
  'cdmx-alvaro-obregon': 'Álvaro Obregón',
  'cdmx-azcapotzalco': 'Azcapotzalco',
  'cdmx-benito-juarez': 'Benito Juárez',
  'cdmx-coyoacan': 'Coyoacán',
  'cdmx-cuajimalpa': 'Cuajimalpa de Morelos',
  'cdmx-cuauhtemoc': 'Cuauhtémoc',
  'cdmx-gustavo-a-madero': 'Gustavo A. Madero',
  'cdmx-iztacalco': 'Iztacalco',
  'cdmx-iztapalapa': 'Iztapalapa',
  'cdmx-magdalena-contreras': 'La Magdalena Contreras',
  'cdmx-miguel-hidalgo': 'Miguel Hidalgo',
  'cdmx-milpa-alta': 'Milpa Alta',
  'cdmx-tlahuac': 'Tláhuac',
  'cdmx-tlalpan': 'Tlalpan',
  'cdmx-venustiano-carranza': 'Venustiano Carranza',
  'cdmx-xochimilco': 'Xochimilco',
}

export function isCdmxAlcaldiaSlug(s: string): s is CdmxAlcaldiaSlug {
  return (CDMX_ALCALDIA_SLUGS as readonly string[]).includes(s)
}
