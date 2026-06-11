import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getLocationBySlug, userOwnsLocation } from '@/lib/perks/location-owner'
import type { LocationOfferStatus } from '@/lib/perks/types'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/** GET /api/dashboard/location/[slug]/offers — owner list */
export async function GET(_request: Request, { params }: Params) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = await params
    const location = await getLocationBySlug(supabase, slug)
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const owns = await userOwnsLocation(supabase, location.id, user.id, user.email)
    if (!owns) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: offers, error } = await supabase
      .from('location_offers')
      .select('*')
      .eq('location_id', location.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ location, offers: offers ?? [] })
  } catch (err) {
    console.error('[GET /api/dashboard/location/[slug]/offers]', err)
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 })
  }
}

type CreateBody = {
  title?: string
  title_en?: string
  description?: string
  description_en?: string
  xp_cost?: number
  min_tier?: number | null
  stock_limit?: number | null
  max_redemptions_per_user?: number
  valid_from?: string | null
  valid_until?: string | null
  status?: LocationOfferStatus
}

/** POST /api/dashboard/location/[slug]/offers — owner create */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { slug } = await params
    const location = await getLocationBySlug(supabase, slug)
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const owns = await userOwnsLocation(supabase, location.id, user.id, user.email)
    if (!owns) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (location.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active certified locations can publish offers' },
        { status: 400 }
      )
    }

    let body: CreateBody
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const title = body.title?.trim()
    if (!title) {
      return NextResponse.json({ error: 'title required' }, { status: 400 })
    }

    const xpCost = Number(body.xp_cost)
    if (!Number.isFinite(xpCost) || xpCost < 1) {
      return NextResponse.json({ error: 'xp_cost must be >= 1' }, { status: 400 })
    }

    const status: LocationOfferStatus =
      body.status === 'active' ? 'active' : 'draft'

    const row = {
      location_id: location.id,
      title,
      title_en: body.title_en?.trim() || null,
      description: body.description?.trim() || null,
      description_en: body.description_en?.trim() || null,
      xp_cost: Math.floor(xpCost),
      min_tier: body.min_tier ?? null,
      stock_limit: body.stock_limit ?? null,
      max_redemptions_per_user: body.max_redemptions_per_user ?? 1,
      valid_from: body.valid_from ?? null,
      valid_until: body.valid_until ?? null,
      status,
      updated_at: new Date().toISOString(),
    }

    const { data: offer, error } = await supabase.from('location_offers').insert(row).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ offer })
  } catch (err) {
    console.error('[POST /api/dashboard/location/[slug]/offers]', err)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
