import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ApiResponse } from '@/lib/api-responses'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  SPONSORSHIP_TIERS,
  validateCreatorPrice,
  type SponsorshipTier,
} from '@/lib/sponsorship-tiers'
import { loadTierLimits } from '@/lib/sponsorship-tiers-data'

/**
 * POST /api/creator/tiers
 *
 * Lets an authenticated creator set their own price per sponsorship tier
 * (migrations 237–239). Prices are validated server-side against the platform
 * guardrails in `sponsorship_tier_limits`; enabled tiers must fall within
 * `[min_price, max_price]` (a disabled tier may park any non-negative price).
 *
 * Writes go through the creator's OWN session (RLS on
 * `creator_sponsorship_tiers` enforces `creator_id = auth.uid()`), NOT the
 * service role — this is creator-owned config, not a money row.
 */
const schema = z.object({
  tiers: z
    .array(
      z.object({
        tier: z.enum(SPONSORSHIP_TIERS),
        price: z.number().min(0).max(1_000_000),
        enabled: z.boolean(),
      })
    )
    .min(1)
    .max(3),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return ApiResponse.unauthorized()
    if (!isBlogEditorUser(user)) return ApiResponse.forbidden()

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return ApiResponse.badRequest(
        parsed.error.issues.map((e) => e.message).join(', '),
        'VALIDATION_ERROR'
      )
    }

    // Guardrails are public-read; the admin client is just a convenient reader.
    const limits = await loadTierLimits(createAdminClient())

    // Validate every enabled price against the platform [min, max].
    for (const row of parsed.data.tiers) {
      if (!row.enabled) continue
      const check = validateCreatorPrice(row.price, limits[row.tier as SponsorshipTier])
      if (!check.ok) {
        return ApiResponse.badRequest(
          `Price for tier "${row.tier}" is outside the platform bounds`,
          'TIER_PRICE_OUT_OF_RANGE'
        )
      }
    }

    // Write via the creator's own session so RLS (creator_id = auth.uid())
    // applies. UNIQUE (creator_id, tier) makes this an idempotent upsert.
    const supabase = await createClient()
    const nowIso = new Date().toISOString()
    const rows = parsed.data.tiers.map((row) => ({
      creator_id: user.id,
      tier: row.tier,
      price: row.price,
      currency: limits[row.tier as SponsorshipTier].currency,
      enabled: row.enabled,
      updated_at: nowIso,
    }))

    const { error } = await supabase
      .from('creator_sponsorship_tiers')
      .upsert(rows, { onConflict: 'creator_id,tier' })

    if (error) {
      console.error('[creator/tiers] upsert failed', error)
      return ApiResponse.serverError('Could not save tier pricing', 'TIER_SAVE_ERROR')
    }

    return ApiResponse.ok({ saved: rows.length })
  } catch (err) {
    console.error('[creator/tiers] exception', err)
    const message = err instanceof Error ? err.message : 'Server error'
    return ApiResponse.serverError(message, 'TIER_SAVE_ERROR')
  }
}
