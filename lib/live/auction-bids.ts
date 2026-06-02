import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { AuctionBidLeaderEntry, LiveAuctionItemWithBids } from '@/lib/live/auction-types'

type AdminClient = SupabaseClient<Database>

type VoteWithBid = {
  id: string
  auction_item_id: string
  user_id: string | null
  anonymous_participant_id: string | null
  bid_amount: number | null
  created_at: string
}

type ProfilePublic = { id: string; full_name: string | null }
type AnonRow = { id: string; alias: string; avatar_emoji: string | null }

export async function fetchAuctionItemsWithBids(
  admin: AdminClient,
  liveEventId: string,
  viewerUserId: string | null,
  viewerAnonId: string | null
): Promise<LiveAuctionItemWithBids[]> {
  const { data: items, error: itemsErr } = await admin
    .from('live_auction_items')
    .select('*')
    .eq('live_event_id', liveEventId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (itemsErr) throw new Error(itemsErr.message)
  if (!items?.length) return []

  const itemIds = items.map((i) => i.id)
  const { data: votes, error: votesErr } = await admin
    .from('live_auction_votes')
    .select('id, auction_item_id, user_id, anonymous_participant_id, bid_amount, created_at')
    .in('auction_item_id', itemIds)
    .not('bid_amount', 'is', null)
    .order('bid_amount', { ascending: false })

  if (votesErr) throw new Error(votesErr.message)

  const bidRows = (votes ?? []) as VoteWithBid[]
  const userIds = [...new Set(bidRows.map((v) => v.user_id).filter(Boolean))] as string[]
  const anonIds = [
    ...new Set(bidRows.map((v) => v.anonymous_participant_id).filter(Boolean)),
  ] as string[]

  const [{ data: profiles }, { data: anons }] = await Promise.all([
    userIds.length
      ? admin.rpc('get_profiles_public', { p_ids: userIds })
      : Promise.resolve({ data: [] as ProfilePublic[] }),
    anonIds.length
      ? admin.from('anonymous_participants').select('id, alias, avatar_emoji').in('id', anonIds)
      : Promise.resolve({ data: [] as AnonRow[] }),
  ])

  const profileMap = new Map(
    ((profiles ?? []) as ProfilePublic[]).map((p) => [
      p.id,
      p.full_name?.trim() || 'Bidder',
    ])
  )
  const anonMap = new Map(
    ((anons ?? []) as AnonRow[]).map((a) => [a.id, { alias: a.alias, emoji: a.avatar_emoji }])
  )

  const votesByItem = new Map<string, VoteWithBid[]>()
  for (const v of bidRows) {
    const list = votesByItem.get(v.auction_item_id) ?? []
    list.push(v)
    votesByItem.set(v.auction_item_id, list)
  }

  return items.map((item) => {
    const itemVotes = votesByItem.get(item.id) ?? []
    const top_bids: AuctionBidLeaderEntry[] = itemVotes.slice(0, 10).map((v, idx) => {
      const isAnon = !!v.anonymous_participant_id
      const display_name = isAnon
        ? anonMap.get(v.anonymous_participant_id!)?.alias ?? 'Guest'
        : profileMap.get(v.user_id!) ?? 'Bidder'
      const avatar_emoji = isAnon
        ? anonMap.get(v.anonymous_participant_id!)?.emoji ?? '🎯'
        : null
      const is_you =
        (!!viewerUserId && v.user_id === viewerUserId) ||
        (!!viewerAnonId && v.anonymous_participant_id === viewerAnonId)

      return {
        rank: idx + 1,
        bid_amount: Number(v.bid_amount),
        user_id: v.user_id,
        anonymous_participant_id: v.anonymous_participant_id,
        display_name,
        avatar_emoji,
        is_you,
      }
    })

    const myVote = itemVotes.find(
      (v) =>
        (viewerUserId && v.user_id === viewerUserId) ||
        (viewerAnonId && v.anonymous_participant_id === viewerAnonId)
    )

    return {
      ...item,
      highest_bid: itemVotes[0] ? Number(itemVotes[0].bid_amount) : null,
      bid_count: itemVotes.length,
      top_bids,
      my_bid: myVote ? Number(myVote.bid_amount) : null,
    }
  })
}

export async function getHighestBid(
  admin: AdminClient,
  auctionItemId: string
): Promise<number | null> {
  const { data } = await admin
    .from('live_auction_votes')
    .select('bid_amount')
    .eq('auction_item_id', auctionItemId)
    .not('bid_amount', 'is', null)
    .order('bid_amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.bid_amount != null ? Number(data.bid_amount) : null
}
