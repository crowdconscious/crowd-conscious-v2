import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { normalizeRedemptionCode } from '@/lib/perks/redemption-code'
import { unwrapJoin } from '@/lib/perks/supabase-join'
import { userOwnsLocation } from '@/lib/perks/location-owner'
import type { RedemptionVerifyPayload } from '@/lib/perks/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ code: string }> }

/** GET /api/perks/verify/[code] — public staff lookup */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { code: rawCode } = await params
    const code = normalizeRedemptionCode(rawCode)
    if (!code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: redemption, error } = await admin
      .from('location_redemptions')
      .select(
        `
        id, redemption_code, xp_spent, status, expires_at, confirmed_at, user_id,
        location_offers (
          title, title_en, description, description_en, location_id,
          conscious_locations ( name, slug, city, neighborhood )
        )
      `
      )
      .eq('redemption_code', code)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!redemption) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 })
    }

    const offerRaw = unwrapJoin(redemption.location_offers)
    const locationRaw = offerRaw ? unwrapJoin(offerRaw.conscious_locations) : null

    if (!offerRaw || !locationRaw) {
      return NextResponse.json({ error: 'Offer data missing' }, { status: 500 })
    }

    let canConfirm = false
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && redemption.status === 'pending') {
      const expired = new Date(redemption.expires_at).getTime() < Date.now()
      if (!expired) {
        canConfirm = await userOwnsLocation(
          supabase,
          offerRaw.location_id,
          user.id,
          user.email
        )
      }
    }

    const payload: RedemptionVerifyPayload = {
      redemption: {
        code: redemption.redemption_code,
        status: redemption.status as RedemptionVerifyPayload['redemption']['status'],
        xp_spent: redemption.xp_spent,
        expires_at: redemption.expires_at,
        confirmed_at: redemption.confirmed_at,
      },
      offer: {
        title: offerRaw.title,
        title_en: offerRaw.title_en,
        description: offerRaw.description,
        description_en: offerRaw.description_en,
      },
      location: locationRaw,
      can_confirm: canConfirm,
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[GET /api/perks/verify/[code]]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
