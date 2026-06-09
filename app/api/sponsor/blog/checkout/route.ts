import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  fundPreview,
  resolveTierPrice,
  round2,
  SPONSORSHIP_TIERS,
  type SponsorshipTier,
} from '@/lib/sponsorship-tiers'
import { loadCreatorTiers, loadTierLimits } from '@/lib/sponsorship-tiers-data'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SUPPORTER_MESSAGE_MAX = 280

const schema = z.object({
  post_id: z.string().regex(UUID_RE),
  tier: z.enum(SPONSORSHIP_TIERS),
  // Optional checkout top-up. gross = tier_price + top_up_amount.
  top_up_amount: z.number().min(0).max(1_000_000).optional(),
  sponsor_name: z.string().trim().min(1).max(120),
  // Logo + target are only meaningful for logo tiers (sponsor / featured).
  sponsor_logo_url: z.string().trim().url().optional().or(z.literal('')),
  target_url: z.string().trim().url().optional().or(z.literal('')),
  sponsor_email: z.string().trim().email(),
  // Moderated shout-out, only meaningful for the support tier.
  supporter_message: z.string().trim().max(SUPPORTER_MESSAGE_MAX).optional(),
  // 'ref' from /sponsor/blog/{id}?ref=<handle-or-creatorId>. Resolved → creator_id.
  ref: z.string().trim().max(120).optional(),
})

/**
 * POST /api/sponsor/blog/checkout
 *
 * Starts a Stripe Checkout Session for a TIERED blog sponsorship (migrations
 * 237–239). The sponsor picks a tier; the price is the creator's configured
 * price for that tier (or the platform default when the creator has no enabled
 * row), plus an optional top-up. This endpoint ONLY starts the session — it does
 * NOT write any money rows. The Stripe webhook (service role) processes the
 * session and snapshots `creator_sponsorships` + the flat-20% fund split.
 *
 * Shared metadata contract (read by handlers/sponsorship-checkout.ts):
 *   metadata = {
 *     kind: 'sponsorship',
 *     surface_type: 'blog',
 *     source_id: <post uuid>,
 *     tier: 'support' | 'sponsor' | 'featured',
 *     top_up_amount: <string number>,
 *     supporter_message?: <string>,      // support tier shout-out
 *     creator_id?: <profile uuid>,       // omitted when no ref / unresolved
 *     sponsor_name, sponsor_logo_url, sponsor_contact (= target_url), sponsor_email
 *   }
 *
 * Money math: gross = tier_price + top_up_amount; the Conscious Fund is a flat
 * 20% of gross (the webhook computes the authoritative split).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return ApiResponse.badRequest(
        parsed.error.issues.map((e) => e.message).join(', '),
        'VALIDATION_ERROR'
      )
    }
    const {
      post_id,
      tier,
      top_up_amount,
      sponsor_name,
      sponsor_logo_url,
      target_url,
      sponsor_email,
      supporter_message,
      ref,
    } = parsed.data

    const admin = createAdminClient()

    // The post must exist and be published to be sponsorable.
    const { data: post } = await admin
      .from('blog_posts')
      .select('id, slug, title, status')
      .eq('id', post_id)
      .maybeSingle()
    if (!post || post.status !== 'published') {
      return ApiResponse.badRequest('Post not found or not published', 'POST_NOT_SPONSORABLE')
    }

    // Resolve ref → creator_id. ref may be a handle OR a profile uuid.
    let creatorId: string | null = null
    if (ref) {
      if (UUID_RE.test(ref)) {
        const { data: byId } = await admin.from('profiles').select('id').eq('id', ref).maybeSingle()
        creatorId = byId?.id ?? null
      } else {
        const { data: byHandle } = await admin
          .from('profiles')
          .select('id')
          .ilike('handle', ref)
          .maybeSingle()
        creatorId = byHandle?.id ?? null
      }
    }

    // Resolve the price for the chosen tier: the creator's configured price
    // (when they have an enabled row) or the platform default. The result is
    // bounded by the platform guardrails by construction (creator prices are
    // validated on write; the default is within [min, max]).
    const limits = await loadTierLimits(admin)
    const creatorTiers = creatorId ? await loadCreatorTiers(admin, creatorId) : []
    const resolved = resolveTierPrice(tier as SponsorshipTier, creatorTiers, limits[tier])

    const topUp = round2(Math.max(0, top_up_amount ?? 0))
    const gross = round2(resolved.price + topUp)
    if (gross <= 0) {
      return ApiResponse.badRequest('Invalid sponsorship amount', 'INVALID_AMOUNT')
    }
    // Stripe charges in the smallest currency unit; we keep whole-cent precision.
    const unitAmount = Math.round(gross * 100)

    const isLogoTier = tier === 'sponsor' || tier === 'featured'
    const logoUrl = isLogoTier ? sponsor_logo_url || '' : ''
    const targetUrl = isLogoTier ? target_url || '' : ''
    const message = tier === 'support' ? supporter_message?.trim() || '' : ''

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const metadata: Record<string, string> = {
      kind: 'sponsorship',
      surface_type: 'blog',
      source_id: post_id,
      tier,
      top_up_amount: String(topUp),
      sponsor_name,
      sponsor_logo_url: logoUrl,
      // creator_sponsorships.sponsor_contact holds the verified target URL the
      // sponsor card links to; sponsor_email is the billing/contact email.
      sponsor_contact: targetUrl,
      sponsor_email,
    }
    if (creatorId) metadata.creator_id = creatorId
    if (message) metadata.supporter_message = message

    const fundEstimate = fundPreview(gross)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Patrocinio — ${post.title}`,
              description: `Patrocinio (${tier}) en una publicación de Crowd Conscious. $${fundEstimate} MXN al Fondo Consciente.`,
              images: logoUrl ? [logoUrl] : undefined,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/sponsor/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/blog/${post.slug}`,
      customer_email: sponsor_email,
      metadata,
    })

    return ApiResponse.ok({ url: session.url, session_id: session.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    console.error('[sponsor/blog/checkout]', err)
    return ApiResponse.serverError(message, 'CHECKOUT_ERROR')
  }
}
