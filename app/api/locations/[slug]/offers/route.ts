import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isOfferInStock, isOfferPubliclyVisible, stockRemaining } from '@/lib/perks/offer-status'
import type { PublicOfferRow } from '@/lib/perks/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/** GET /api/locations/[slug]/offers — public active offers for a certified location. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params
    const admin = createAdminClient()

    const { data: location, error: locErr } = await admin
      .from('conscious_locations')
      .select('id, status')
      .eq('slug', slug)
      .maybeSingle()

    if (locErr) {
      return NextResponse.json({ error: locErr.message }, { status: 500 })
    }
    if (!location || location.status !== 'active') {
      return NextResponse.json({ offers: [] })
    }

    const { data: offers, error } = await admin
      .from('location_offers')
      .select('*')
      .eq('location_id', location.id)
      .eq('status', 'active')
      .order('xp_cost', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const visible = (offers ?? []).filter(isOfferPubliclyVisible).filter(isOfferInStock)
    const payload: PublicOfferRow[] = visible.map((o) => ({
      ...(o as PublicOfferRow),
      stock_remaining: stockRemaining(o as PublicOfferRow),
    }))

    return NextResponse.json({ offers: payload })
  } catch (err) {
    console.error('[GET /api/locations/[slug]/offers]', err)
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 })
  }
}
