import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse, strictRateLimit } from '@/lib/rate-limit'
import { CP_REGEX, REGIMEN_CODES, USO_CFDI_CODES, isValidRfcFormat, normalizeRfc } from '@/lib/organizaciones/fiscal'
import { ORG_PILOT_PRODUCT_TYPE, ORG_PRICES, PILOT_BREAKDOWN } from '@/lib/organizaciones/pricing'
import { sendOrgAdminAlert, type OrgPilotEmailRow } from '@/lib/organizaciones/emails'
import { BASE_SIZE_CODES, ORG_TYPE_CODES, VISIBILITY_PREF_CODES } from '@/lib/organizaciones/lead-options'

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))

const schema = z
  .object({
    // call = request a 20-min call; proposal = PDF proposal / PO; pilot = pay by card now.
    mode: z.enum(['call', 'proposal', 'pilot']),
    plan: z.enum(['pilot', 'anual', 'continua', 'sello']).default('pilot'),
    company_name: z.string().trim().min(1).max(200),
    contact_name: z.string().trim().min(1).max(200),
    email: z.string().trim().toLowerCase().email().max(320),
    phone: optStr(40),
    rfc: optStr(20),
    razon_social: optStr(300),
    regimen_fiscal: optStr(3),
    cp_fiscal: optStr(5),
    uso_cfdi: optStr(5),
    message: optStr(2000),
    cargo: optStr(120),
    org_type: z.enum(ORG_TYPE_CODES).optional(),
    current_reporting: optStr(500),
    base_size: z.enum(BASE_SIZE_CODES).optional(),
    visibility_pref: z.enum(VISIBILITY_PREF_CODES).optional(),
    locale: z.enum(['es', 'en']).default('es'),
    source: optStr(64),
  })
  .superRefine((d, ctx) => {
    if (d.rfc && !isValidRfcFormat(d.rfc)) ctx.addIssue({ code: 'custom', path: ['rfc'], message: 'RFC_FORMAT' })
    if (d.cp_fiscal && !CP_REGEX.test(d.cp_fiscal)) ctx.addIssue({ code: 'custom', path: ['cp_fiscal'], message: 'CP_FORMAT' })
    if (d.regimen_fiscal && !REGIMEN_CODES.includes(d.regimen_fiscal))
      ctx.addIssue({ code: 'custom', path: ['regimen_fiscal'], message: 'REGIMEN' })
    if (d.uso_cfdi && !USO_CFDI_CODES.includes(d.uso_cfdi))
      ctx.addIssue({ code: 'custom', path: ['uso_cfdi'], message: 'USO_CFDI' })
    // Pilot-defining questions come first for proposals and card payments.
    if (d.mode !== 'call') {
      for (const k of ['org_type', 'base_size', 'visibility_pref', 'cargo'] as const) {
        if (!d[k]) ctx.addIssue({ code: 'custom', path: [k], message: 'REQUIRED' })
      }
    }
    // Fiscal data only for paying by card (never on first contact).
    if (d.mode === 'pilot') {
      for (const k of ['phone', 'rfc', 'razon_social', 'regimen_fiscal', 'cp_fiscal', 'uso_cfdi'] as const) {
        if (!d[k]) ctx.addIssue({ code: 'custom', path: [k], message: 'REQUIRED' })
      }
    } else if (d.rfc || d.razon_social || d.regimen_fiscal || d.cp_fiscal) {
      ctx.addIssue({ code: 'custom', path: ['rfc'], message: 'FISCAL_ONLY_FOR_CARD' })
    }
  })

/**
 * SPEI via Stripe `customer_balance` (mx_bank_transfer) must be enabled on
 * the Stripe account first. Off by default; card-only until
 * ORG_PILOT_ENABLE_SPEI=true is set in Vercel.
 */
function speiEnabled() {
  return process.env.ORG_PILOT_ENABLE_SPEI === 'true'
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(strictRateLimit, await getRateLimitIdentifier(request))
  if (rl && !rl.allowed) return rateLimitResponse(rl.limit, rl.remaining, rl.reset)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiResponse.badRequest('Invalid JSON', 'INVALID_JSON')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return ApiResponse.badRequest('Validation failed', 'VALIDATION_ERROR', {
      fields: parsed.error.issues.map((i) => ({ field: i.path.join('.'), code: i.message })),
    })
  }
  const d = parsed.data
  const isPilot = d.mode === 'pilot'
  const admin = createAdminClient()

  const insert = {
    kind: d.mode,
    plan: d.mode === 'proposal' ? d.plan : 'pilot',
    status: isPilot ? 'pending_payment' : d.mode === 'call' ? 'call_requested' : 'proposal_requested',
    cargo: d.cargo,
    org_type: d.org_type ?? null,
    current_reporting: d.current_reporting,
    base_size: d.base_size ?? null,
    visibility_pref: d.visibility_pref ?? null,
    company_name: d.company_name,
    contact_name: d.contact_name,
    email: d.email,
    phone: d.phone,
    rfc: d.rfc ? normalizeRfc(d.rfc) : null,
    razon_social: d.razon_social,
    regimen_fiscal: d.regimen_fiscal,
    cp_fiscal: d.cp_fiscal,
    uso_cfdi: d.uso_cfdi,
    message: d.message,
    locale: d.locale,
    source: d.source,
    ...(isPilot
      ? {
          subtotal_mxn: PILOT_BREAKDOWN.subtotal,
          iva_mxn: PILOT_BREAKDOWN.iva,
          total_mxn: PILOT_BREAKDOWN.total,
          fund_mxn: PILOT_BREAKDOWN.fund,
        }
      : {}),
  }

  const table = () => admin.from('org_pilot_requests')
  const { data: created, error } = await table().insert(insert).select('*').single()
  if (error || !created) {
    console.error('[organizaciones/contratar] insert failed', error?.message)
    return ApiResponse.serverError('Could not save request', 'DB_ERROR')
  }
  const row = created as unknown as OrgPilotEmailRow

  if (!isPilot) {
    const sent = await sendOrgAdminAlert(row)
    if (!sent.success) console.error('[organizaciones/contratar] lead alert failed', sent.error)
    return ApiResponse.ok({ mode: d.mode, id: row.id })
  }

  try {
    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
    const spei = speiEnabled()
    const metadata = { product_type: ORG_PILOT_PRODUCT_TYPE, org_pilot_request_id: row.id }

    let customerId: string | undefined
    if (spei) {
      // customer_balance (bank transfer) requires a Customer on the session.
      const customer = await stripe.customers.create({
        email: d.email,
        name: d.razon_social ?? d.company_name,
        metadata,
      })
      customerId = customer.id
    }

    const es = d.locale === 'es'
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: spei ? ['card', 'customer_balance'] : ['card'],
      ...(spei
        ? {
            customer: customerId,
            payment_method_options: {
              customer_balance: {
                funding_type: 'bank_transfer',
                bank_transfer: { type: 'mx_bank_transfer' },
              },
            },
          }
        : { customer_email: d.email }),
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: es ? 'Lectura piloto privada · Crowd Conscious' : 'Private pilot reading · Crowd Conscious',
              description: es
                ? `$${ORG_PRICES.pilot.toLocaleString('es-MX')} MXN + IVA. 20% al Fondo Consciente.`
                : `$${ORG_PRICES.pilot.toLocaleString('en-US')} MXN + VAT. 20% to the Conscious Fund.`,
            },
            unit_amount: Math.round(PILOT_BREAKDOWN.subtotal * 100),
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'mxn',
            product_data: { name: es ? 'IVA 16%' : 'VAT (IVA) 16%' },
            unit_amount: Math.round(PILOT_BREAKDOWN.iva * 100),
          },
          quantity: 1,
        },
      ],
      locale: es ? 'es' : 'en',
      client_reference_id: row.id,
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/organizaciones/contratar/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/organizaciones/contratar?cancelado=1`,
    }

    const session = await stripe.checkout.sessions.create(params)
    await table()
      .update({ stripe_checkout_session_id: session.id, stripe_customer_id: customerId ?? null, updated_at: new Date().toISOString() })
      .eq('id', row.id)

    return ApiResponse.ok({ mode: 'pilot', id: row.id, url: session.url })
  } catch (err) {
    console.error('[organizaciones/contratar] stripe session failed', err instanceof Error ? err.message : err)
    return ApiResponse.serverError('Could not start checkout', 'CHECKOUT_ERROR')
  }
}
