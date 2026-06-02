import type { Database } from '@/types/database'

export type LiveAuctionItemRow = Database['public']['Tables']['live_auction_items']['Row']
export type LiveAuctionVoteRow = Database['public']['Tables']['live_auction_votes']['Row']

export type AuctionBidLeaderEntry = {
  rank: number
  bid_amount: number
  user_id: string | null
  anonymous_participant_id: string | null
  display_name: string
  avatar_emoji: string | null
  is_you: boolean
}

export type LiveAuctionItemWithBids = LiveAuctionItemRow & {
  highest_bid: number | null
  bid_count: number
  top_bids: AuctionBidLeaderEntry[]
  my_bid: number | null
}
