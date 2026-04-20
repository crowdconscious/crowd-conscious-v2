import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'
import { moderateRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  type: z.literal('cause_suggestion_municipal'),
  sponsor_token: z.string().trim().min(8).max(128).optional(),
  name: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  website_url: z.string().trim().url().max(500),
  why: z.string().trim().min(1).max(4000),
  submitter_email: z.string().trim().email().max(320).optional(),
})

/**
 * Generic Conscious Inbox nomination endpoint. Currently only accepts
 * `cause_suggestion_municipal` payloads from the token-authed sponsor
 * dashboard; extending to other types is a matter of adding a discriminated
 * union to the zod schema.
 *
 * Why route through conscious_inbox instead of writing straight to
 * fund_causes: every suggestion gets an editorial pass before it hits a
 * public surface. The sponsor who suggested it is linked via
 * `suggested_by_sponsor_id` on the promoted cause (filled in by the admin
 * when they approve and promote via /predictions/admin/causes).
 */
export async function POST(request: NextRequest) {
  try {
    if (moderateRateLimit) {
      const id = await getRateLimitIdentifier(request)
      const rate = await moderateRateLimit.limit(`inbox-nominate:${id}`)
      if (!rate.success) {
        return NextResponse.json(
          { error: 'Too many nominations, try again in a minute' },
          { status: 429 }
        )
      }
    }

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const payload = parsed.data

    const admin = createAdminClient()

    // Resolve sponsor_account.id from the token so the admin can trace
    // which municipality suggested what. A missing or unknown token is
    // not fatal — we still accept the nomination but can't attribute it.
    let sponsorAccountId: string | null = null
    if (payload.sponsor_token) {
      const { data: sponsor } = await admin
        .from('sponsor_accounts')
        .select('id')
        .eq('access_token', payload.sponsor_token)
        .maybeSingle()
      if (sponsor) sponsorAccountId = sponsor.id as string
    }

    const descParts = [
      `Organization: ${payload.organization}`,
      `Website: ${payload.website_url}`,
      payload.submitter_email ? `Email: ${payload.submitter_email}` : null,
      '',
      payload.why,
      sponsorAccountId ? `\n\nSponsor account: ${sponsorAccountId}` : '',
    ].filter(Boolean)
    const description = descParts.join('\n')

    const { error } = await admin.from('conscious_inbox').insert({
      user_id: null,
      type: 'cause_suggestion_municipal',
      title: payload.name,
      description,
      category: 'municipality_nomination',
      links: [payload.website_url],
      status: 'pending',
    })

    if (error) {
      console.error('[inbox/nominate]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, sponsor_linked: !!sponsorAccountId })
  } catch (err) {
    console.error('[inbox/nominate] fatal', err)
    return NextResponse.json({ error: 'Nomination failed' }, { status: 500 })
  }
}
