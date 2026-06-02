import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { getHighestBid } from '@/lib/live/auction-bids'
import { createClient } from '@/lib/supabase-server'

type Props = { params: Promise<{ id: string }> }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Admin: update auction item (status, details). */
export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const user = await getCurrentUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()

    if (!isAdminUser(profile)) {
      return Response.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id } = await params
    if (!UUID_REGEX.test(id)) {
      return Response.json({ error: 'Invalid id' }, { status: 400 })
    }

    const body = await request.json()
    const admin = createAdminClient()

    const { data: before } = await admin
      .from('live_auction_items')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!before) return Response.json({ error: 'Item not found' }, { status: 404 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.title === 'string') updates.title = body.title.trim()
    if (typeof body.description === 'string') updates.description = body.description.trim() || null
    if (typeof body.image_url === 'string') updates.image_url = body.image_url.trim() || null
    if (typeof body.sort_order === 'number') updates.sort_order = body.sort_order

    if (typeof body.status === 'string') {
      const allowed = ['upcoming', 'bidding', 'sold', 'ended', 'cancelled'] as const
      if (!allowed.includes(body.status as (typeof allowed)[number])) {
        return Response.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status

      if (body.status === 'bidding' && before.status !== 'bidding') {
        updates.bidding_opened_at = new Date().toISOString()
      }

      if (body.status === 'sold') {
        const highest = await getHighestBid(admin, id)
        if (highest != null) updates.winning_bid_amount = highest
      }
    }

    const { data: item, error } = await admin
      .from('live_auction_items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[PATCH /api/live/auction/items/[id]]', error)
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ item })
  } catch (e) {
    console.error('[PATCH /api/live/auction/items/[id]]', e)
    return Response.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
