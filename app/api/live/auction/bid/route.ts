import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { getHighestBid } from '@/lib/live/auction-bids'
import { createClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Submit or update an open bid on an auction lot.
 * Payment is off-platform; highest bid wins when admin marks item sold.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { auction_item_id, bid_amount, anonymous_participant_id } = body as {
      auction_item_id?: string
      bid_amount?: number | string
      anonymous_participant_id?: string
    }

    if (!auction_item_id || !UUID_REGEX.test(auction_item_id)) {
      return Response.json({ error: 'Invalid auction_item_id' }, { status: 400 })
    }

    const amount =
      typeof bid_amount === 'number'
        ? bid_amount
        : typeof bid_amount === 'string'
          ? parseFloat(bid_amount.replace(/,/g, ''))
          : NaN

    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: 'Bid amount must be a positive number' }, { status: 400 })
    }

    const rounded = Math.round(amount * 100) / 100
    const admin = createAdminClient()

    const { data: item, error: itemErr } = await admin
      .from('live_auction_items')
      .select('id, status, currency')
      .eq('id', auction_item_id)
      .maybeSingle()

    if (itemErr || !item) {
      return Response.json({ error: 'Auction item not found' }, { status: 404 })
    }

    if (item.status !== 'bidding') {
      return Response.json({ error: 'Bidding is not open for this item' }, { status: 400 })
    }

    const highest = await getHighestBid(admin, auction_item_id)
    const minNext = highest != null ? highest + 1 : 1
    if (rounded < minNext) {
      return Response.json(
        {
          error:
            highest != null
              ? `Bid must be at least ${minNext} ${item.currency}`
              : 'Bid must be at least 1',
          min_bid: minNext,
          currency: item.currency,
        },
        { status: 400 }
      )
    }

    const authUser = await getCurrentUser()
    let userId: string | null = authUser?.id ?? null
    let anonId: string | null = null

    if (!userId) {
      if (anonymous_participant_id && UUID_REGEX.test(anonymous_participant_id)) {
        anonId = anonymous_participant_id
      } else {
        const cookieStore = await cookies()
        const sessionId = cookieStore.get('cc_session')?.value
        if (sessionId && UUID_REGEX.test(sessionId)) {
          const supabase = await createClient()
          const { data: participant } = await supabase
            .from('anonymous_participants')
            .select('id')
            .eq('session_id', sessionId)
            .is('converted_to_user_id', null)
            .maybeSingle()
          anonId = participant?.id ?? null
        }
      }
    }

    if (!userId && !anonId) {
      return Response.json({ error: 'Sign in or choose an alias to bid' }, { status: 401 })
    }

    if (userId) {
      const { data: existing } = await admin
        .from('live_auction_votes')
        .select('id')
        .eq('auction_item_id', auction_item_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (existing) {
        const { error: updErr } = await admin
          .from('live_auction_votes')
          .update({ bid_amount: rounded, discount_vote: null })
          .eq('id', existing.id)
        if (updErr) {
          console.error('[POST /api/live/auction/bid] update', updErr)
          return Response.json({ error: updErr.message }, { status: 400 })
        }
      } else {
        const { error: insErr } = await admin.from('live_auction_votes').insert({
          auction_item_id,
          user_id: userId,
          bid_amount: rounded,
        })
        if (insErr) {
          console.error('[POST /api/live/auction/bid] insert', insErr)
          return Response.json({ error: insErr.message }, { status: 400 })
        }
      }
    } else if (anonId) {
      const { data: existing } = await admin
        .from('live_auction_votes')
        .select('id')
        .eq('auction_item_id', auction_item_id)
        .eq('anonymous_participant_id', anonId)
        .maybeSingle()

      if (existing) {
        const { error: updErr } = await admin
          .from('live_auction_votes')
          .update({ bid_amount: rounded, discount_vote: null })
          .eq('id', existing.id)
        if (updErr) {
          console.error('[POST /api/live/auction/bid] anon update', updErr)
          return Response.json({ error: updErr.message }, { status: 400 })
        }
      } else {
        const { error: insErr } = await admin.from('live_auction_votes').insert({
          auction_item_id,
          anonymous_participant_id: anonId,
          bid_amount: rounded,
        })
        if (insErr) {
          console.error('[POST /api/live/auction/bid] anon insert', insErr)
          return Response.json({ error: insErr.message }, { status: 400 })
        }
      }
    }

    return Response.json({
      success: true,
      bid_amount: rounded,
      currency: item.currency,
    })
  } catch (e) {
    console.error('[POST /api/live/auction/bid]', e)
    return Response.json({ error: 'Failed to place bid' }, { status: 500 })
  }
}
