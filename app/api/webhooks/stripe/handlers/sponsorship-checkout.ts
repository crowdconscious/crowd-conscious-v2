import Stripe from 'stripe'
import {
  getMoneyClient,
  resolveSplitLabel,
  loadSplitConfig,
  computeAmounts,
  currentPayoutPeriod,
  isSurfaceType,
  type SurfaceType,
} from '../lib/sponsorship-money'
import { signalCategoryToPillar, isFundPillar, type FundPillar } from '@/lib/fund/pillars'
import { isSponsorshipTier, round2 } from '@/lib/sponsorship-tiers'

/**
 * Prompt 3 — the automation core.
 *
 * Processes a paid `kind: 'sponsorship'` Checkout Session into snapshotted
 * ledger rows. Shape of the shared metadata contract (both workers emit this):
 *
 *   metadata = {
 *     kind: 'sponsorship',
 *     surface_type: 'blog' | 'signal' | 'pulse',
 *     source_id: <uuid>,
 *     creator_id: <profile uuid>,   // omitted when absent
 *     // additive (this worker's signal checkout also sends):
 *     sponsor_name, sponsor_logo_url, sponsor_email, sponsor_contact,
 *     badge_message, fund_pillar
 *   }
 *
 * Writes (all service-role):
 *   1. creator_sponsorships  (status 'active', amounts SNAPSHOTTED)
 *   2. conscious_fund_contributions (the flat 20% inflow)
 *   3. influencer_payouts    (accrued per-period, only when creator_amount > 0)
 *   4. signal_sponsorships   (only for surface_type 'signal')
 *
 * IDEMPOTENT on creator_sponsorships.stripe_session_id (UNIQUE). Re-deliveries
 * short-circuit before any write.
 */
export async function handleSponsorshipCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}

  const surfaceTypeRaw = metadata.surface_type
  if (!isSurfaceType(surfaceTypeRaw)) {
    console.error('[sponsorship-checkout] invalid surface_type', {
      sessionId: session.id,
      surfaceType: surfaceTypeRaw,
    })
    return
  }
  const surfaceType: SurfaceType = surfaceTypeRaw
  const sourceId = (metadata.source_id as string | undefined)?.trim() || null

  // Guard: only act on a session whose payment actually succeeded. Stripe sets
  // payment_status to 'paid' once the underlying PaymentIntent succeeds, so we
  // don't double-handle the unpaid/async states.
  if (session.payment_status !== 'paid') {
    console.log('[sponsorship-checkout] skipping non-paid session', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
    })
    return
  }

  const supabase = getMoneyClient()

  // ---- Idempotency: stripe_session_id is UNIQUE on creator_sponsorships. ----
  const { data: existing } = await supabase
    .from('creator_sponsorships')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()
  if (existing) {
    console.log('[sponsorship-checkout] already processed (idempotent skip)', {
      sessionId: session.id,
      sponsorshipId: existing.id,
    })
    return
  }

  const gross = (session.amount_total ?? 0) / 100
  const currency = (session.currency || 'mxn').toUpperCase()
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : null

  const creatorIdFromMetadata =
    (metadata.creator_id as string | undefined)?.trim() || null

  // ---- Tier metadata (migrations 237–239, additive). ----
  // gross = tier_price + top_up_amount. `gross` above already equals the Stripe
  // amount_total (tier_price + top_up), so we persist the raw top-up + tier for
  // placement; the split below is still computed on gross. tier is nullable for
  // legacy / non-tiered rows.
  const tier = isSponsorshipTier(metadata.tier) ? metadata.tier : null
  const topUpRaw = Number((metadata.top_up_amount as string | undefined) ?? '')
  const topUpAmount =
    Number.isFinite(topUpRaw) && topUpRaw > 0 ? round2(topUpRaw) : 0
  // Supporter shout-out only carries meaning for the support tier (no logo).
  const supporterMessage =
    tier === 'support'
      ? (metadata.supporter_message as string | undefined)?.trim() || null
      : null

  // For a blog with no explicit creator_id, the split depends on whether the
  // post has a creator author. (Signals never carry a creator_id; pulse uses
  // the pulse_signal split regardless.)
  let hasCreatorAuthor = false
  let blogAuthorId: string | null = null
  if (surfaceType === 'blog' && !creatorIdFromMetadata && sourceId) {
    const { data: post } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', sourceId)
      .maybeSingle()
    blogAuthorId = (post?.author_id as string | null) ?? null
    hasCreatorAuthor = !!blogAuthorId
  }

  const { label, sourcedBy } = resolveSplitLabel({
    surfaceType,
    creatorIdFromMetadata,
    hasCreatorAuthor,
  })
  const config = await loadSplitConfig(label)
  const amounts = computeAmounts(gross, config)

  // The creator attributed for payout: the explicit metadata creator (creator-
  // sourced) or the blog author (platform-sourced). Editorial / pulse_signal
  // have creator_amount 0 and no attributed creator.
  const attributedCreatorId =
    creatorIdFromMetadata ?? (sourcedBy === 'platform' ? blogAuthorId : null)

  // ---- Sponsor disclosure fields (NOT NULL sponsor_name enforces the badge). ----
  const sponsorName =
    (metadata.sponsor_name as string | undefined)?.trim() ||
    session.customer_details?.name?.trim() ||
    'Patrocinador'
  const sponsorLogoUrl = (metadata.sponsor_logo_url as string | undefined)?.trim() || null
  const sponsorContact = (metadata.sponsor_contact as string | undefined)?.trim() || null
  const sponsorEmail =
    (metadata.sponsor_email as string | undefined)?.trim() ||
    session.customer_details?.email?.trim() ||
    null

  // ---- Self-sponsorship guard. ----
  // Flag when the checkout names a creator AND the paying account/email matches
  // that creator's profile email. Holds the payout for manual review.
  let flaggedSelfSponsor = false
  if (creatorIdFromMetadata && sponsorEmail) {
    const { data: creatorProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', creatorIdFromMetadata)
      .maybeSingle()
    const creatorEmail = (creatorProfile?.email as string | null)?.toLowerCase().trim()
    if (creatorEmail && creatorEmail === sponsorEmail.toLowerCase().trim()) {
      flaggedSelfSponsor = true
      console.warn('[sponsorship-checkout] self-sponsorship detected — holding payout', {
        sessionId: session.id,
        creatorId: creatorIdFromMetadata,
      })
    }
  }

  // ---- Fund pillar resolution. ----
  // Signals derive the pillar from the signal's category; other surfaces accept
  // an explicit metadata.fund_pillar or leave it null (nullable on the ledger).
  let fundPillar: FundPillar | null = isFundPillar(metadata.fund_pillar)
    ? metadata.fund_pillar
    : null
  if (surfaceType === 'signal' && sourceId) {
    const { data: signalRow } = await supabase
      .from('citizen_signals')
      .select('category')
      .eq('id', sourceId)
      .maybeSingle()
    fundPillar = signalCategoryToPillar(signalRow?.category as string | null)
  }

  // ---- 1. creator_sponsorships (snapshotted). ----
  const { data: sponsorship, error: sponsorshipErr } = await supabase
    .from('creator_sponsorships')
    .insert({
      sponsor_name: sponsorName,
      sponsor_logo_url: sponsorLogoUrl,
      sponsor_contact: sponsorContact,
      sponsor_email: sponsorEmail,
      surface_type: surfaceType,
      source_id: sourceId,
      sourced_by: sourcedBy,
      creator_id: attributedCreatorId,
      gross_amount: amounts.gross,
      currency,
      fund_amount: amounts.fundAmount,
      creator_amount: amounts.creatorAmount,
      platform_amount: amounts.platformAmount,
      status: 'active',
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntentId,
      stripe_event_id: (metadata.stripe_event_id as string | undefined) ?? null,
      flagged_self_sponsor: flaggedSelfSponsor,
      // Tier placement metadata (additive; NULL for legacy/non-tiered rows).
      tier,
      supporter_message: supporterMessage,
      top_up_amount: topUpAmount,
    })
    .select('id')
    .single()

  if (sponsorshipErr) {
    // 23505 = unique_violation on stripe_session_id ⇒ a concurrent delivery won
    // the race; treat as already-processed (idempotent).
    if ((sponsorshipErr as { code?: string }).code === '23505') {
      console.log('[sponsorship-checkout] concurrent delivery raced — idempotent skip', {
        sessionId: session.id,
      })
      return
    }
    console.error('[sponsorship-checkout] creator_sponsorships insert failed', sponsorshipErr)
    throw new Error(`creator_sponsorships insert failed: ${sponsorshipErr.message}`)
  }

  const sponsorshipId = sponsorship.id as string

  // ---- 2. conscious_fund_contributions (flat 20% inflow). ----
  const { error: contribErr } = await supabase
    .from('conscious_fund_contributions')
    .insert({
      source_type: surfaceType,
      source_id: sourceId,
      amount: amounts.fundAmount,
      currency,
      fund_pillar: fundPillar,
      sponsorship_id: sponsorshipId,
    })
  if (contribErr) {
    console.error('[sponsorship-checkout] conscious_fund_contributions insert failed', contribErr)
  }

  // ---- 3. influencer_payouts accrual (only when the creator earns). ----
  if (amounts.creatorAmount > 0 && attributedCreatorId) {
    await accruePayout(supabase, {
      creatorId: attributedCreatorId,
      amount: amounts.creatorAmount,
      currency,
      flaggedSelfSponsor,
    })
  }

  // ---- 4. Surface activation. ----
  if (surfaceType === 'signal' && sourceId) {
    const badgeMessage =
      (metadata.badge_message as string | undefined)?.trim() ||
      `Patrocinado por ${sponsorName}`
    const pillar: FundPillar = fundPillar ?? 'safe_cities'
    const { error: ssErr } = await supabase.from('signal_sponsorships').insert({
      signal_id: sourceId,
      sponsorship_id: sponsorshipId,
      fund_pillar: pillar,
      badge_message: badgeMessage,
    })
    if (ssErr && (ssErr as { code?: string }).code !== '23505') {
      console.error('[sponsorship-checkout] signal_sponsorships insert failed', ssErr)
    }
  }
  // blog: the creator_sponsorships row IS the placement (no extra table —
  // the creator-platform worker renders the sponsor card from active rows).
  // pulse: no creator-market join table; the legacy pulse flow owns its own
  // market sponsor fields.

  console.log('[sponsorship-checkout] processed', {
    sessionId: session.id,
    sponsorshipId,
    surfaceType,
    tier,
    topUpAmount,
    label,
    sourcedBy,
    gross: amounts.gross,
    fund: amounts.fundAmount,
    creator: amounts.creatorAmount,
    platform: amounts.platformAmount,
    flaggedSelfSponsor,
  })
}

/**
 * Add a creator's earned amount to their per-period payout bucket. Respects the
 * UNIQUE (creator_id, period) constraint by reading-then-writing. A self-
 * sponsorship holds the whole bucket for manual finance review.
 */
async function accruePayout(
  supabase: ReturnType<typeof getMoneyClient>,
  params: {
    creatorId: string
    amount: number
    currency: string
    flaggedSelfSponsor: boolean
  }
) {
  const period = currentPayoutPeriod()
  const { data: existing, error: readErr } = await supabase
    .from('influencer_payouts')
    .select('id, total_earned, status, flagged_self_sponsor')
    .eq('creator_id', params.creatorId)
    .eq('period', period)
    .maybeSingle()

  if (readErr) {
    console.error('[sponsorship-checkout] influencer_payouts read failed', readErr)
  }

  if (existing) {
    const nextTotal =
      Number(existing.total_earned ?? 0) + params.amount
    const update: Record<string, unknown> = {
      total_earned: nextTotal,
      updated_at: new Date().toISOString(),
    }
    // A self-deal taints the bucket: flag it and hold (unless already paid).
    if (params.flaggedSelfSponsor) {
      update.flagged_self_sponsor = true
      if (existing.status === 'pending') update.status = 'held'
    }
    const { error: updErr } = await supabase
      .from('influencer_payouts')
      .update(update)
      .eq('id', existing.id)
    if (updErr) {
      console.error('[sponsorship-checkout] influencer_payouts update failed', updErr)
    }
    return
  }

  const { error: insErr } = await supabase.from('influencer_payouts').insert({
    creator_id: params.creatorId,
    period,
    total_earned: params.amount,
    currency: params.currency,
    status: params.flaggedSelfSponsor ? 'held' : 'pending',
    flagged_self_sponsor: params.flaggedSelfSponsor,
  })
  if (insErr) {
    // A concurrent delivery may have created the bucket first; retry as update.
    if ((insErr as { code?: string }).code === '23505') {
      const { data: row } = await supabase
        .from('influencer_payouts')
        .select('id, total_earned')
        .eq('creator_id', params.creatorId)
        .eq('period', period)
        .maybeSingle()
      if (row) {
        await supabase
          .from('influencer_payouts')
          .update({
            total_earned: Number(row.total_earned ?? 0) + params.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
      }
      return
    }
    console.error('[sponsorship-checkout] influencer_payouts insert failed', insErr)
  }
}
