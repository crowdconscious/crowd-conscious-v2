/**
 * Official Sello badge ("ESFUERZO CONSCIENTE"). Pure and font-free: the curved
 * text is pre-converted to outlines by scripts/generate-sello.mjs, so the SVG
 * renders the same in browsers, emails and sharp. Transparent background.
 */
import { SELLO_SVG_BODY, SELLO_TEXT } from './sello-svg.generated'

export { SELLO_TEXT }

/** Static, pre-rendered assets (public/sello). */
export const SELLO_ASSETS = {
  svg: '/sello/sello-esfuerzo-consciente.svg',
  png1024: '/sello/sello-esfuerzo-consciente-1024.png',
  png512: '/sello/sello-esfuerzo-consciente-512.png',
} as const

/** Public verify page the badge links to. */
export const selloVerifyPath = (slug: string) => `/sello/${encodeURIComponent(slug)}`

/** Full SVG markup. `id` keeps gradient ids unique when several badges share a page. */
export function selloSvg(id = 'sello', size?: number): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '') || 'sello'
  const wh = size ? ` width="${size}" height="${size}"` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"${wh} role="img" aria-label="Sello ${SELLO_TEXT}">${SELLO_SVG_BODY.replaceAll('__ID__', safe)}</svg>`
}
