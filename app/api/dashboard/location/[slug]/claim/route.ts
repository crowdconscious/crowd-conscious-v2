import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { canClaimByEmail, getLocationBySlug } from '@/lib/perks/location-owner'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

/** POST /api/dashboard/location/[slug]/claim */
export async function POST(_request: Request, { params }: Params) {
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

    if (location.owner_profile_id === user.id) {
      return NextResponse.json({ success: true, already_claimed: true, slug })
    }

    if (location.owner_profile_id && location.owner_profile_id !== user.id) {
      return NextResponse.json({ error: 'Location already claimed' }, { status: 409 })
    }

    if (!canClaimByEmail(location, user.email)) {
      return NextResponse.json(
        { error: 'Your account email does not match this location contact email' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('conscious_locations')
      .update({ owner_profile_id: user.id, updated_at: new Date().toISOString() })
      .eq('id', location.id)
      .is('owner_profile_id', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, slug })
  } catch (err) {
    console.error('[POST /api/dashboard/location/[slug]/claim]', err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
