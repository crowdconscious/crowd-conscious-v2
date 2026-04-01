import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/resend'
import { postVoteConfirmationTemplate } from '@/lib/prediction-emails'
import { getCommunityProbabilitySummary } from '@/lib/market-email-helpers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

type RpcVoteResult = {
  success?: boolean
  xp_earned?: number
  outcome_label?: string
  confidence?: number
  new_probability?: number
  is_update?: boolean
  no_change?: boolean
}

/** Fire-and-forget from vote API: in-app notification + optional email (respects email_notifications). */
export async function sendPostVoteConfirmation(args: {
  userId: string
  email: string | null | undefined
  marketId: string
  rpcResult: RpcVoteResult
}): Promise<void> {
  const { userId, marketId, rpcResult } = args

  if (rpcResult.is_update === true || rpcResult.no_change === true) {
    return
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('email, email_notifications')
    .eq('id', userId)
    .single()

  const email =
    (args.email?.trim() || profile?.email || '').trim() || null

  const { data: market } = await admin
    .from('prediction_markets')
    .select('title, current_probability, market_type, live_event_id, is_micro_market')
    .eq('id', marketId)
    .single()

  if (!market?.title) return

  const skipVoteEmail = market.live_event_id != null || market.is_micro_market === true

  const xp = typeof rpcResult.xp_earned === 'number' ? rpcResult.xp_earned : 0
  const outcomeLabel = rpcResult.outcome_label ?? '—'
  const confidence = typeof rpcResult.confidence === 'number' ? rpcResult.confidence : 5

  const communitySplitLine = await getCommunityProbabilitySummary(admin, marketId, {
    current_probability: market.current_probability,
    market_type: (market as { market_type?: string }).market_type,
  })

  const titleShort = market.title.slice(0, 80)
  const msg = `Tu voto: ${outcomeLabel} · Confianza ${confidence}/10 · Comunidad: ${communitySplitLine} · +${xp} XP`

  try {
    await admin.from('notifications').insert({
      user_id: userId,
      type: 'vote_confirmation',
      title: `Predijiste: ${titleShort}`,
      message: msg,
      body: msg,
      link: `/predictions/markets/${marketId}`,
    })
  } catch (e) {
    console.error('[vote notification]', e)
  }

  if (skipVoteEmail || profile?.email_notifications === false || !email) return

  const template = postVoteConfirmationTemplate({
    marketTitle: market.title,
    outcomeLabel,
    confidence,
    communitySplitLine,
    xpEarned: xp,
    predictionsUrl: `${APP_URL}/predictions`,
  })

  await sendEmail(email, template).catch((err) => console.error('[post-vote email]', err))
}
