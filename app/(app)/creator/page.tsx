import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import type { CreatorLocale } from '@/lib/i18n/creator'
import { SPONSORSHIP_TIERS } from '@/lib/sponsorship-tiers'
import { loadCreatorTiers, loadTierLimits } from '@/lib/sponsorship-tiers-data'
import type { TierPricingItem } from './CreatorTierPricing'
import CreatorDashboardClient, {
  type DashboardPost,
  type DashboardPayout,
} from './CreatorDashboardClient'

export const dynamic = 'force-dynamic'

export default async function CreatorDashboardPage() {
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const user = await getCurrentUser()
  // The (app)/creator layout already guarantees an authenticated creator.
  const userId = user!.id
  const handle = (user as { handle?: string | null }).handle ?? null
  const trust = Number((user as { creator_trust_level?: number }).creator_trust_level ?? 0)

  const admin = createAdminClient()

  // Own posts (admin client, strictly scoped to author_id = userId).
  const { data: postsRaw } = await admin
    .from('blog_posts')
    .select('id, title, slug, status, updated_at, view_count')
    .eq('author_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100)

  const posts: DashboardPost[] = (postsRaw ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug ?? null,
    status: p.status,
    updatedAt: p.updated_at ?? null,
    views: Number(p.view_count ?? 0),
  }))

  // Earnings / payouts (creator-own; service-role read is safe + scoped).
  const { data: payoutsRaw } = await admin
    .from('influencer_payouts')
    .select('period, total_earned, amount_paid, currency, status')
    .eq('creator_id', userId)
    .order('period', { ascending: false })
    .limit(60)

  const payouts: DashboardPayout[] = (payoutsRaw ?? []).map((p) => ({
    period: p.period,
    totalEarned: Number(p.total_earned ?? 0),
    amountPaid: Number(p.amount_paid ?? 0),
    currency: p.currency ?? 'MXN',
    status: p.status ?? 'pending',
  }))

  // Referred clicks (NOT installs). The per-creator RLS read on
  // app_referral_clicks is disabled in migration 231, so we count server-side
  // with the admin client, scoped to this creator's own handle.
  let referredClicks = 0
  if (handle) {
    const { count } = await admin
      .from('app_referral_clicks')
      .select('id', { count: 'exact', head: true })
      .eq('ref_handle', handle)
    referredClicks = count ?? 0
  }

  // Tier pricing settings: platform guardrails + this creator's own prices.
  // Both tier tables are public-read; the admin client is just a reader here.
  const tierLimits = await loadTierLimits(admin)
  const creatorTiers = await loadCreatorTiers(admin, userId)
  const tierPricing: TierPricingItem[] = SPONSORSHIP_TIERS.map((tier) => {
    const limit = tierLimits[tier]
    const own = creatorTiers.find((r) => r.tier === tier)
    return {
      tier,
      price: own ? own.price : limit.defaultPrice,
      enabled: own ? own.enabled : false,
      min: limit.minPrice,
      max: limit.maxPrice,
      default: limit.defaultPrice,
      currency: limit.currency,
    }
  })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crowdconscious.app'

  return (
    <CreatorDashboardClient
      locale={locale}
      handle={handle}
      creatorId={userId}
      trust={trust}
      posts={posts}
      payouts={payouts}
      referredClicks={referredClicks}
      baseUrl={baseUrl}
      tierPricing={tierPricing}
    />
  )
}
