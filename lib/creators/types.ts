import type { Json } from '@/types/database'

/**
 * Local row types for `creator_certifications` (migration 241).
 *
 * types/database.ts is stale in this repo (regeneration pending — see
 * strategy doc Phase 0), so the new table gets tightly-scoped local types
 * here instead of hand-edits to the generated file. lib/locations relies on
 * the generated types because conscious_locations predates the staleness.
 */
export type CreatorCertificationStatus =
  | 'pending'
  | 'active'
  | 'under_review'
  | 'suspended'
  | 'revoked'

export type CreatorCertificationRow = {
  id: string
  profile_id: string
  status: CreatorCertificationStatus
  current_market_id: string | null
  conscious_score: number | null
  approval_rate: number | null
  avg_confidence: number | null
  total_votes: number
  certified_at: string | null
  certified_by: string | null
  next_review_date: string | null
  why_conscious: string | null
  why_conscious_en: string | null
  craft: string | null
  craft_en: string | null
  city: string | null
  cover_image_url: string | null
  metadata: Json
  is_featured: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

/** Public-safe profile columns joined alongside a certification. */
export type CreatorPublicProfile = {
  id: string
  handle: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export const CREATOR_SCORE_REVEAL_THRESHOLD = 10

/** Tier 2 gate per strategy doc §4 / §10: score >= 7.0 at >= 10 votes. */
export const CREATOR_COMMUNITY_VERIFIED_SCORE = 7.0

export type CreatorTier = 'nominated' | 'community_verified' | 'certified'

/**
 * Tier ladder (strategy doc §4): admin certification wins; otherwise a
 * revealed score >= 7.0 earns the community-verified badge; everything
 * else publicly visible is a nominee collecting votes.
 */
export function creatorTier(cert: {
  certified_at: string | null
  conscious_score: number | null
  total_votes: number
}): CreatorTier {
  if (cert.certified_at) return 'certified'
  if (
    cert.conscious_score != null &&
    cert.total_votes >= CREATOR_SCORE_REVEAL_THRESHOLD &&
    cert.conscious_score >= CREATOR_COMMUNITY_VERIFIED_SCORE
  ) {
    return 'community_verified'
  }
  return 'nominated'
}
