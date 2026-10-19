/**
 * Official Sello badges. Two variants (Francisco, 14 Oct 2026):
 *   - empresa  → "EMPRESA CONSCIENTE"  for companies
 *   - esfuerzo → "ESFUERZO CONSCIENTE" for every other org type (schools, universities, condominiums…)
 * Pure and font-free: curved text pre-converted to outlines and the centre icon
 * is the Crowd Conscious fingerprint/pin mark (scripts/generate-sello.mjs).
 */
import { SELLO_SVG_BODIES, SELLO_TEXTS } from './sello-svg.generated'

export type SelloVariant = keyof typeof SELLO_TEXTS
export { SELLO_TEXTS }

/** Human name, ES and EN (EN keeps the Spanish name). */
export const SELLO_NAMES: Record<SelloVariant, { es: string; en: string }> = {
  empresa: { es: 'Sello Empresa Consciente', en: 'Empresa Consciente seal' },
  esfuerzo: { es: 'Sello Esfuerzo Consciente', en: 'Esfuerzo Consciente seal' },
}

/**
 * Org type codes come from the contratar form (lib/organizaciones/lead-options
 * ORG_TYPES, stored on org_pilot_requests.org_type). Companies get "Empresa";
 * schools, universities and condominiums get "Esfuerzo". Unknown, 'otra' or
 * missing defaults to Empresa (Francisco's default).
 */
const ESFUERZO_TYPES = new Set(['escuela', 'universidad', 'condominio'])
export function selloVariantFor(orgType: string | null | undefined): SelloVariant {
  return orgType && ESFUERZO_TYPES.has(orgType) ? 'esfuerzo' : 'empresa'
}

/** Static, pre-rendered assets (public/sello). */
export function selloAssets(v: SelloVariant) {
  const base = `/sello/sello-${v}-consciente`
  return { svg: `${base}.svg`, png1024: `${base}-1024.png`, png512: `${base}-512.png` } as const
}

/** Public verify page the badge links to. */
export const selloVerifyPath = (slug: string) => `/sello/${encodeURIComponent(slug)}`

/** Full SVG markup. `id` keeps gradient ids unique when several badges share a page. */
export function selloSvg(v: SelloVariant, id = 'sello', size?: number): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'sello'
  const wh = size ? ` width="${size}" height="${size}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"${wh} role="img" aria-label="Sello ${SELLO_TEXTS[v]}">${SELLO_SVG_BODIES[v].replaceAll('__ID__', safe)}</svg>`
}
