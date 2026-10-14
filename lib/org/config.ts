/**
 * Org portal configuration. Change these in one place.
 *
 * NEXT_PUBLIC_ORG_PORTAL_V2 (default false) gates the parts of the org
 * portal that are not finished yet, i.e. anything that would show a real
 * client's portal before auth and reading storage exist (Prompt 4):
 *   - /org/[slug]/lecturas/[id] (client reading dashboard)
 *   - /org/[slug]/lecturas/[id]/resumen (expiring share link)
 *   - the "Mis lecturas" slot in the org header
 * The public sales surfaces (/organizaciones, demo, resumen demo, contratar)
 * are complete and do not depend on the flag.
 */
export const ORG_PORTAL_V2 = process.env.NEXT_PUBLIC_ORG_PORTAL_V2 === 'true'

/** Booking tool for "Agendar llamada". Unset -> short request form + mailto. */
export function bookingUrl(): string | null {
  const u = process.env.BOOKING_URL?.trim()
  return u && /^https:\/\//.test(u) ? u : null
}

export const CALL_FORM_HREF = '/organizaciones/contratar?modo=llamada'
export const SAMPLE_PDF_HREF = '/api/organizaciones/demo/pdf'
export const ORG_CONTACT_EMAIL = 'francisco@crowdconscious.app'

export function callHref() {
  return bookingUrl() ?? CALL_FORM_HREF
}

/** Card payment stays available as the third contratar option. */
export const ORG_CARD_PAYMENT_ENABLED = true

/** Private share links for "Resumen para direccion" expire after this. */
export const SHARE_LINK_TTL_DAYS = 14
