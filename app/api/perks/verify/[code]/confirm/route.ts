import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { normalizeRedemptionCode } from '@/lib/perks/redemption-code'
import { unwrapJoin } from '@/lib/perks/supabase-join'
import { userOwnsLocation } from '@/lib/perks/location-owner'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ code: string }> }

/** POST /api/perks/verify/[code]/confirm — owner marks redemption confirmed */
export async function POST(_request: Request, { params }: Params) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { code: rawCode } = await params
    const code = normalizeRedemptionCode(rawCode)
    if (!code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: redemption, error: fetchErr } = await admin
      .from('location_redemptions')
      .select('id, status, expires_at, offer_id, location_offers(location_id)')
      .eq('redemption_code', code)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!redemption) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 })
    }

    const offerRaw = unwrapJoin(redemption.location_offers)
    if (!offerRaw?.location_id) {
      return NextResponse.json({ error: 'Offer data missing' }, { status: 500 })
    }

    const isOwner = await userOwnsLocation(supabase, offerRaw.location_id, user.id, user.email)
    if (!isOwner) {
      return NextResponse.json({ error: 'Not authorized for this location' }, { status: 403 })
    }

    if (redemption.status === 'confirmed') {
      return NextResponse.json({ success: true, already_confirmed: true })
    }

    if (redemption.status !== 'pending') {
      return NextResponse.json({ error: 'Redemption cannot be confirmed' }, { status: 400 })
    }

    if (new Date(redemption.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Code expired' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateErr } = await admin
      .from('location_redemptions')
      .update({
        status: 'confirmed',
        confirmed_at: now,
        confirmed_by: user.id,
        updated_at: now,
      })
      .eq('id', redemption.id)
      .eq('status', 'pending')

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/perks/verify/[code]/confirm]', err)
    return NextResponse.json({ error: 'Confirm failed' }, { status: 500 })
  }
}
