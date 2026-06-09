import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getStripe } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'
import { createAdminClient } from '@/lib/supabase-admin'

const MIN_AMOUNT_MXN = 100
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  post_id: z.string().regex(UUID_RE),
  amount_mxn: z.number().int().min(MIN_AMOUNT_MXN),
  sponsor_name: z.string().trim().min(1).max(120),
  sponsor_logo_url: z.string().trim().url().optional().or(z.literal('')),
  target_url: z.string().trim().url(),
  sponsor_email: z.string().trim().email(),
  // 'ref' from /sponsor/blog/{id}?ref=<handle-or-creatorId>. Resolved → creator_id.
  ref: z.string().trim().max(120).optional(),
})

/**
 * POST /api/sponsor/blog/checkout
 *
 * Starts a Stripe Checkout Session for sponsoring a blog post. This endpoint
 * ONLY starts the session with the shared metadata contract — it does NOT write
 * creator_sponsorships / fund / payout rows. The Stripe webhook (owned by the
 * money worker) processes the session and writes all money rows via service
 * role.
 *
 * Shared metadata contract:
 *   metadata = {
 *     kind: 'sponsorship',
 *     surface_type: 'blog',
 *     source_id: <post uuid>,
 *     creator_id: <profile uuid>   // omitted when no ref / unresolved
 *   }
 *
 * Additional brand fields (sponsor_name, sponsor_logo_url, sponsor_contact,
 * sponsor_email) are passed so the webhook can persist them onto the
 * creator_sponsorships row that the sponsor card renders from. (See FLAG in the
 * PR notes — the routing keys are locked by the contract; these descriptive
 * keys are additive and may need name-alignment with the webhook.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return ApiResponse.badRequest(parsed.error.issues.map((e) => e.message).join(', '), 'VALIDATION_ERROR')
    }
    const { post_id, amount_mxn, sponsor_name, sponsor_logo_url, target_url, sponsor_email, ref } = parsed.data

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

    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

    const metadata: Record<string, string> = {
      kind: 'sponsorship',
      surface_type: 'blog',
      source_id: post_id,
      sponsor_name,
      sponsor_logo_url: sponsor_logo_url || '',
      // creator_sponsorships.sponsor_contact holds the verified target URL the
      // sponsor card links to; sponsor_email is the billing/contact email.
      sponsor_contact: target_url,
      sponsor_email,
    }
    if (creatorId) metadata.creator_id = creatorId

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Patrocinio — ${post.title}`,
              description: 'Sponsor card on a Crowd Conscious blog post. 20% goes to the Conscious Fund.',
              images: sponsor_logo_url ? [sponsor_logo_url] : undefined,
            },
            unit_amount: amount_mxn * 100,
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
