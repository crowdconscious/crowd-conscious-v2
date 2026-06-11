export type LocationOfferStatus = 'draft' | 'active' | 'paused' | 'expired'

export type LocationRedemptionStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled'

export type LocationOfferRow = {
  id: string
  location_id: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  xp_cost: number
  min_tier: number | null
  stock_limit: number | null
  redeemed_count: number
  max_redemptions_per_user: number
  valid_from: string | null
  valid_until: string | null
  status: LocationOfferStatus
  created_at: string
  updated_at: string
}

export type LocationRedemptionRow = {
  id: string
  offer_id: string
  user_id: string
  redemption_code: string
  xp_spent: number
  status: LocationRedemptionStatus
  expires_at: string
  confirmed_at: string | null
  confirmed_by: string | null
  created_at: string
  updated_at: string
}

export type PublicOfferRow = LocationOfferRow & {
  stock_remaining: number | null
}

export type RedemptionVerifyPayload = {
  redemption: {
    code: string
    status: LocationRedemptionStatus
    xp_spent: number
    expires_at: string
    confirmed_at: string | null
  }
  offer: {
    title: string
    title_en: string | null
    description: string | null
    description_en: string | null
  }
  location: {
    name: string
    slug: string
    city: string
    neighborhood: string | null
  }
  can_confirm: boolean
}
