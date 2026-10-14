import { NextResponse } from 'next/server'

/**
 * Brand Pulse sponsorship (Pulse Único / Pack / Suscripción / Mundial, add-ons,
 * market sponsorship, legacy sponsor tiers) is retired (Oct 2026). The checkout
 * endpoints stay deployed so existing links fail loudly instead of 404ing, but
 * they reject every NEW purchase. Webhooks for already-paid sessions are
 * untouched. Companies are pointed to /organizaciones.
 */
export const LEGACY_SPONSOR_SALES_CLOSED = true

export function legacySponsorSalesClosedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'PRODUCT_RETIRED',
        message:
          'Los planes de patrocinio Pulse ya no están a la venta. Para medir a sus usuarios vea https://crowdconscious.app/organizaciones · Pulse sponsorship plans are no longer sold; see /organizaciones.',
      },
    },
    { status: 410 }
  )
}
