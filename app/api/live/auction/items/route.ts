import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'
import { fetchAuctionItemsWithBids } from '@/lib/live/auction-bids'
import { createClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function resolveViewerIds(): Promise<{ userId: string | null; anonId: string | null }> {
  const user = await getCurrentUser()
  if (user?.id) return { userId: user.id, anonId: null }

  const cookieStore = await cookies()
  const sessionId = cookieStore.get('cc_session')?.value
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return { userId: null, anonId: null }
  }

  const supabase = await createClient()
  const { data: participant } = await supabase
    .from('anonymous_participants')
    .select('id')
    .eq('session_id', sessionId)
    .is('converted_to_user_id', null)
    .maybeSingle()

  return { userId: null, anonId: participant?.id ?? null }
}

/** List auction items for a live event with bid leaderboards. */
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId')?.trim()
    if (!eventId || !UUID_REGEX.test(eventId)) {
      return Response.json({ error: 'Invalid eventId' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { userId, anonId } = await resolveViewerIds()
    const items = await fetchAuctionItemsWithBids(admin, eventId, userId, anonId)

    return Response.json({ items })
  } catch (e) {
    console.error('[GET /api/live/auction/items]', e)
    return Response.json({ error: 'Failed to load auction items' }, { status: 500 })
  }
}

/** Admin: create an auction lot/piece. */
export async function POST(request: Request) {
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

    const body = await request.json()
    const {
      live_event_id,
      title,
      description,
      image_url,
      original_price,
      currency,
      category,
      sort_order,
    } = body as {
      live_event_id?: string
      title?: string
      description?: string
      image_url?: string
      original_price?: number
      currency?: string
      category?: string
      sort_order?: number
    }

    if (!live_event_id || !UUID_REGEX.test(live_event_id)) {
      return Response.json({ error: 'Invalid live_event_id' }, { status: 400 })
    }
    if (!title?.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: item, error } = await admin
      .from('live_auction_items')
      .insert({
        live_event_id,
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        image_url: typeof image_url === 'string' ? image_url.trim() || null : null,
        original_price:
          typeof original_price === 'number' && Number.isFinite(original_price)
            ? original_price
            : null,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim() : 'MXN',
        category:
          typeof category === 'string' &&
          ['food', 'drink', 'fashion', 'experience', 'art', 'merch', 'other'].includes(category)
            ? category
            : 'art',
        sort_order: typeof sort_order === 'number' ? sort_order : 0,
        status: 'upcoming',
      })
      .select('*')
      .single()

    if (error) {
      console.error('[POST /api/live/auction/items]', error)
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ item })
  } catch (e) {
    console.error('[POST /api/live/auction/items]', e)
    return Response.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
