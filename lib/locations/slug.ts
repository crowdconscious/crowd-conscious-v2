/**
 * Canonical slug generator for Conscious Locations. Used by the admin
 * single-form (auto-fill on name blur) and the bulk-import API so a
 * batch upload yields the exact same URLs an operator would type by hand.
 */
export function slugifyLocationName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
