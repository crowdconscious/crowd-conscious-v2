import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getLocationBySlug, userOwnsLocation } from '@/lib/perks/location-owner'
import type { LocationOfferStatus } from '@/lib/perks/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string; offerId: string }> }

type PatchBody = {
  title?: string
  title_en?: string | null
  description?: string | null
  description_en?: string | null
  xp_cost?: number
  min_tier?: number | null
  stock_limit?: number | null
  max_redemptions_per_user?: number
  valid_from?: string | null
  valid_until?: string | null
  status?: LocationOfferStatus
}

async function authorizeOffer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
  offerId: string,
  userId: string,
  userEmail: string | null | undefined
) {
  const location = await getLocationBySlug(supabase, slug)
  if (!location) return { error: 'Location not found', status: 404 as const }

  const owns = await userOwnsLocation(supabase, location.id, userId, userEmail)
  if (!owns) return { error: 'Not authorized', status: 403 as const }

  const { data: offer, error } = await supabase
    .from('location_offers')
    .select('*')
    .eq('id', offerId)
    .eq('location_id', location.id)
    .maybeSingle()

  if (error) return { error: error.message, status: 500 as const }
  if (!offer) return { error: 'Offer not found', status: 404 as const }

  return { location, offer }
}

/** PATCH /api/dashboard/location/[slug]/offers/[offerId] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug, offerId } = await params
    const auth = await authorizeOffer(supabase, slug, offerId, user.id, user.email)
    if ('error' in auth && !('offer' in auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { location, offer } = auth as { location: { status: string }; offer: { id: string } }

    let body: PatchBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (body.status === 'active' && location.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active certified locations can publish offers' },
        { status: 400 }
      )
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.title !== undefined) update.title = body.title.trim()
    if (body.title_en !== undefined) update.title_en = body.title_en?.trim() || null
    if (body.description !== undefined) update.description = body.description?.trim() || null
    if (body.description_en !== undefined) update.description_en = body.description_en?.trim() || null
    if (body.xp_cost !== undefined) {
      const xp = Number(body.xp_cost)
      if (!Number.isFinite(xp) || xp < 1) {
        return NextResponse.json({ error: 'xp_cost must be >= 1' }, { status: 400 })
      }
      update.xp_cost = Math.floor(xp)
    }
    if (body.min_tier !== undefined) update.min_tier = body.min_tier
    if (body.stock_limit !== undefined) update.stock_limit = body.stock_limit
    if (body.max_redemptions_per_user !== undefined) {
      update.max_redemptions_per_user = body.max_redemptions_per_user
    }
    if (body.valid_from !== undefined) update.valid_from = body.valid_from
    if (body.valid_until !== undefined) update.valid_until = body.valid_until
    if (body.status !== undefined) update.status = body.status

    const { data: updated, error } = await supabase
      .from('location_offers')
      .update(update)
      .eq('id', offer.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ offer: updated })
  } catch (err) {
    console.error('[PATCH /api/dashboard/location/[slug]/offers/[offerId]]', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

/** DELETE /api/dashboard/location/[slug]/offers/[offerId] — soft-delete via paused */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug, offerId } = await params
    const auth = await authorizeOffer(supabase, slug, offerId, user.id, user.email)
    if ('error' in auth && !('offer' in auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    const { offer } = auth as { offer: { id: string } }

    const { error } = await supabase
      .from('location_offers')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', offer.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/dashboard/location/[slug]/offers/[offerId]]', err)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
