import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchSponsorPulseClosureEmail } from '@/lib/sponsor-notifications'
import { notifyPulseClosedViaResolutionHook } from '@/lib/resolution-notify'

/**
 * Notify voters (and Pulse sponsors) when a market resolves.
 *
 * Phase 2: voter fan-out goes through the resolution hook — max one
 * resolution notification per user per UTC day, push preferred over email
 * when a push token exists. Sponsor closure email is unchanged (B2B).
 */
export async function notifyMarketResolutionVoters(
  admin: SupabaseClient,
  params: { marketId: string; winningOutcomeId: string; winningLabel: string }
): Promise<void> {
  const { marketId, winningOutcomeId, winningLabel } = params

  const { data: market } = await admin
    .from('prediction_markets')
    .select('title, is_pulse, sponsor_account_id')
    .eq('id', marketId)
    .single()

  const marketTitle = market?.title || 'Prediction'

  // Pulse-only sponsor closure email. Non-Pulse markets and markets without
  // a sponsor_account_id are silently skipped.
  if (market?.is_pulse && market.sponsor_account_id) {
    const { count } = await admin
      .from('market_votes')
      .select('user_id', { count: 'exact', head: true })
      .eq('market_id', marketId)
      .not('user_id', 'is', null)

    void dispatchSponsorPulseClosureEmail({
      sponsorAccountId: market.sponsor_account_id as string,
      marketId,
      marketTitle,
      winningLabel,
      totalVoters: count ?? 0,
    }).catch((err) =>
      console.warn('[market-resolution] sponsor closure email error:', err)
    )
  }

  if (market?.is_pulse) {
    try {
      await notifyPulseClosedViaResolutionHook(admin, {
        marketId,
        marketTitle,
        winningOutcomeId,
        winningLabel,
      })
    } catch (err) {
      console.warn('[market-resolution] resolution hook error:', err)
    }
    return
  }

  // Legacy non-Pulse markets: keep a minimal in-app row only (no resolution
  // push product surface for prediction markets behind the auth shell).
  const { data: votes } = await admin
    .from('market_votes')
    .select('user_id, outcome_id')
    .eq('market_id', marketId)

  for (const v of votes || []) {
    if (!v.user_id) continue
    const won = v.outcome_id === winningOutcomeId
    const fallbackMessage = won
      ? 'Your vote matched the community outcome. Thanks for participating.'
      : `Community outcome: ${winningLabel}. Your vote was recorded.`
    try {
      await admin.from('notifications').insert({
        user_id: v.user_id,
        type: 'market_resolved',
        title: `Resolved: ${marketTitle}`,
        message: `"${marketTitle}" closed. ${fallbackMessage}`,
        link: `/predictions/markets/${marketId}`,
        data: null,
      })
    } catch (notifErr) {
      console.error('Notification insert error:', notifErr)
    }
  }
}
