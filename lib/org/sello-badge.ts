/**
 * The two official badges. They are DIFFERENT seals with different names,
 * types and marks, and one name is never used for the other (Francisco, 16 Oct 2026):
 *   - lugar_consciente → "Lugar Consciente": free and earned (4 weeks of
 *     distributing Pulses + accepting our 7 values), reviewed yearly. 7 stars.
 *   - sello_verificado → "Sello verificado": paid B2B package, based on a
 *     measured reading with public results. Check mark, no stars.
 * The old "Empresa Consciente / Esfuerzo Consciente" names (PR #60) are retired;
 * both map to sello_verificado.
 * Pure and font-free (scripts/generate-sello.mjs); centre = CC fingerprint/pin mark.
 */
import { SELLO_SVG_BODIES, SELLO_TEXTS } from './sello-svg.generated'

export type SealType = keyof typeof SELLO_TEXTS
export const SEAL_TYPES = Object.keys(SELLO_TEXTS) as SealType[]
export { SELLO_TEXTS }

/** Human name, ES and EN (EN keeps the Spanish proper name). */
export const SEAL_NAMES: Record<SealType, { es: string; en: string }> = {
  lugar_consciente: { es: 'Lugar Consciente', en: 'Lugar Consciente' },
  sello_verificado: { es: 'Sello verificado', en: 'Sello verificado (verified seal)' },
}

/** Static, pre-rendered assets (public/sello). */
export function sealAssets(t: SealType) {
  const base = `/sello/${t.replace('_', '-')}`
  return { svg: `${base}.svg`, png1024: `${base}-1024.png`, png512: `${base}-512.png` } as const
}

/** Public verify page each badge links to. */
export function sealVerifyPath(t: SealType, slug: string) {
  return t === 'lugar_consciente' ? `/lugar-consciente/${encodeURIComponent(slug)}` : `/sello-verificado/${encodeURIComponent(slug)}`
}

/** Full SVG markup. `id` keeps gradient ids unique when several badges share a page. */
export function sealSvg(t: SealType, id = 'sello', size?: number): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'sello'
  const wh = size ? ` width="${size}" height="${size}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"${wh} role="img" aria-label="${SEAL_NAMES[t].es}">${SELLO_SVG_BODIES[t].replaceAll('__ID__', safe)}</svg>`
}
