import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
  formatDateMX,
  mexicoCityNow,
} from '@/lib/agents/config'
import { CONSCIOUS_FUND_PERCENT } from '@/lib/fund-allocation'

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function runContentCreator(): Promise<{
  success: boolean
  error?: string
  posts_generated?: number
  tokens?: { input: number; output: number }
}> {
  const startTime = Date.now()

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()
    const today = mexicoCityNow()
    const todayFormatted = formatDateMX(today)

    const data: Record<string, unknown> = {}

    // a. ACTIVE MARKETS with activity
    try {
      const { data: markets } = await supabase
        .from('prediction_markets')
        .select('id, title, category, current_probability, status')
        .in('status', ['active', 'trading'])

      const marketIds = (markets ?? []).map((m) => m.id)
      const voteCounts: Record<string, number> = {}
      if (marketIds.length > 0) {
        const { data: votes } = await supabase
          .from('market_votes')
          .select('market_id')
        for (const v of votes ?? []) {
          voteCounts[v.market_id] = (voteCounts[v.market_id] ?? 0) + 1
        }
      }

      data.active_markets = (markets ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        current_probability: m.current_probability,
        prediction_count: voteCounts[m.id] ?? 0,
      }))
    } catch (e) {
      data.active_markets = 'error'
    }

    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: history } = await supabase
        .from('prediction_market_history')
        .select('market_id, probability, recorded_at')
        .gte('recorded_at', cutoff24h)
        .order('recorded_at', { ascending: false })

      const byMarket = new Map<string, number[]>()
      for (const h of history ?? []) {
        if (!byMarket.has(h.market_id)) byMarket.set(h.market_id, [])
        byMarket.get(h.market_id)!.push(Number(h.probability))
      }
      const changes: Array<{ market_id: string; old_prob: number; new_prob: number; change: number }> = []
      for (const [mid, probs] of byMarket) {
        if (probs.length >= 2) {
          const oldP = probs[probs.length - 1]
          const newP = probs[0]
          changes.push({ market_id: mid, old_prob: oldP, new_prob: newP, change: newP - oldP })
        }
      }
      changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      const topIds = changes.slice(0, 5).map((c) => c.market_id)
      const { data: mktTitles } = await supabase
        .from('prediction_markets')
        .select('id, title')
        .in('id', topIds)
      const titleMap: Record<string, string> = {}
      for (const m of mktTitles ?? []) {
        titleMap[m.id] = m.title
      }
      data.probability_shifts_24h = changes.slice(0, 5).map((c) => ({
        ...c,
        title: titleMap[c.market_id] ?? c.market_id,
      }))
    } catch (e) {
      data.probability_shifts_24h = 'error'
    }

    // b. RECENTLY RESOLVED markets (last 48h)
    try {
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const { data: resolved } = await supabase
        .from('prediction_markets')
        .select('id, title, resolution, resolved_at')
        .eq('status', 'resolved')
        .gte('resolved_at', cutoff48h)

      const resolvedWithCorrect = await Promise.all(
        (resolved ?? []).map(async (m) => {
          const { data: outcomes } = await supabase
            .from('market_outcomes')
            .select('id, label, is_winner')
            .eq('market_id', m.id)
          const winner = outcomes?.find((o) => o.is_winner === true)
          const winningLabel = winner?.label ?? m.resolution ?? 'Unknown'
          const { data: votes } = await supabase
            .from('market_votes')
            .select('id, is_correct')
            .eq('market_id', m.id)
          const correct = (votes ?? []).filter((v) => v.is_correct === true).length
          const total = (votes ?? []).length
          return {
            title: m.title,
            outcome: winningLabel,
            correct_predictors: correct,
            total_predictors: total,
          }
        })
      )
      data.recently_resolved = resolvedWithCorrect
    } catch (e) {
      data.recently_resolved = 'error'
    }

    // c. HOT INBOX items
    try {
      const { data: top3 } = await supabase
        .from('conscious_inbox')
        .select('id, title, upvotes, status')
        .in('status', ['pending', 'approved'])
        .order('upvotes', { ascending: false })
        .limit(3)
      data.hot_inbox_items = top3 ?? []
    } catch (e) {
      data.hot_inbox_items = 'error'
    }

    // d. CONSCIOUS FUND
    try {
      const cycle = getCurrentCycle()
      const { data: causes } = await supabase
        .from('fund_causes')
        .select('id, name')
        .eq('active', true)
      const { data: votes } = await supabase
        .from('fund_votes')
        .select('cause_id')
        .eq('cycle', cycle)
      const byCause: Record<string, number> = {}
      for (const v of votes ?? []) {
        byCause[v.cause_id] = (byCause[v.cause_id] ?? 0) + 1
      }
      data.fund_causes_with_votes = (causes ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        vote_count: byCause[c.id] ?? 0,
      }))

      const { data: fund } = await supabase
        .from('conscious_fund')
        .select('total_collected, total_disbursed')
        .limit(1)
        .single()
      const legacyBalance = Math.max(
        0,
        Number(fund?.total_collected ?? 0) - Number(fund?.total_disbursed ?? 0)
      )
      const { data: sponsorMarkets } = await supabase
        .from('prediction_markets')
        .select('sponsor_contribution')
        .not('sponsor_name', 'is', null)
        .gt('sponsor_contribution', 0)
      const totalFromSponsors =
        (sponsorMarkets ?? []).reduce(
          (sum, m) =>
            sum +
            Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0) *
              CONSCIOUS_FUND_PERCENT,
          0
        ) ?? 0
      data.total_fund_value = legacyBalance + totalFromSponsors
    } catch (e) {
      data.fund_causes_with_votes = 'error'
      data.total_fund_value = 'error'
    }

    // e. LEADERBOARD
    try {
      const { data: xpRows } = await supabase
        .from('user_xp')
        .select('user_id, total_xp')
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(5)

      const userIds = (xpRows ?? []).map((r) => r.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name || 'Anonymous'])
      )

      data.leaderboard_top_3 = (xpRows ?? []).slice(0, 3).map((r, i) => ({
        rank: i + 1,
        user_id: r.user_id,
        username: profileMap.get(r.user_id) ?? 'Anonymous',
        total_xp: Number(r.total_xp),
      }))
    } catch (e) {
      data.leaderboard_top_3 = 'error'
    }

    const systemMessage = `You are the social media content strategist for Crowd Conscious (crowdconscious.app), a free-to-play opinion platform in Mexico City. You create engaging social media content that drives people to the platform. Your tone is: smart but accessible, community-driven, slightly provocative (asking questions people want to answer), and always ties back to social impact. You write in BOTH Spanish and English. The platform is gearing up for FIFA World Cup 2026 — opening match is June 11 at Estadio Azteca, Mexico City.`

    const userMessage = `Here is today's platform activity data (JSON):

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

Based on today's platform activity, generate exactly 6 social media posts:

POST 1 — Instagram carousel caption (Spanish): About the hottest market or biggest probability shift. Hook people into giving their opinion. Include relevant emojis. End with CTA to crowdconscious.app

POST 2 — Instagram carousel caption (English): Same topic adapted for English audience

POST 3 — Twitter/X (Spanish, max 280 chars): Punchy one-liner about the most interesting market. Include the question. Link to crowdconscious.app

POST 4 — Twitter/X (English, max 280 chars): Same adapted for English

POST 5 — LinkedIn (Spanish): Professional tone. Focus on the social impact angle — the Conscious Fund, community governance, or how collective intelligence works. 2-3 short paragraphs.

POST 6 — Community Highlight (Spanish): Celebrate the top predictor or most active community member, or a trending inbox submission. Make people feel seen.

For each post return a JSON object with: { platform, language, post_type, hook, body, hashtags, cta }

Return as a JSON array of 6 objects. No markdown wrapping. Just raw JSON.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.SOCIAL_CONTENT,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let parsedArray: Array<Record<string, unknown>> = []

    try {
      parsedArray = parseAgentJSON(rawText)
      if (!Array.isArray(parsedArray)) {
        parsedArray = [parsedArray]
      }
    } catch (parseErr) {
      console.error('Content creator parse error:', parseErr)
      try {
        await supabase.from('agent_content').insert({
          market_id: null,
          agent_type: 'content_creator',
          content_type: 'social_post',
          title: 'Social Raw (parse failed)',
          body: rawText,
          language: 'es',
          metadata: {
            platform: 'raw',
            raw: true,
            parse_error: String(parseErr),
            model: MODELS.CREATIVE,
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
          },
          published: false,
        })
      } catch (saveErr) {
        console.error('Failed to save raw content:', saveErr)
      }
      await logAgentRun({
        agentName: 'content-creator',
        status: 'success',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { posts_generated: 0, parse_failed: true },
      })
      return {
        success: true,
        posts_generated: 0,
        tokens: { input: usage.input_tokens, output: usage.output_tokens },
      }
    }

    for (const post of parsedArray) {
      if (!post || typeof post !== 'object') continue
      const platform = String(post.platform ?? 'unknown').toLowerCase()
      const hook = String(post.hook ?? 'Untitled')
      const metadata: Record<string, unknown> = {
        platform: post.platform,
        language: post.language,
        post_type: post.post_type,
        model: MODELS.CREATIVE,
        tokens_input: usage.input_tokens,
        tokens_output: usage.output_tokens,
        hashtags: post.hashtags,
      }

      try {
        await supabase.from('agent_content').insert({
          market_id: null,
          agent_type: 'content_creator',
          content_type: 'social_post',
          title: hook,
          body: JSON.stringify(post),
          language: String(post.language ?? 'es'),
          metadata,
          published: false,
        })
      } catch (insertErr) {
        console.error('Failed to insert post:', insertErr)
      }
    }

    await logAgentRun({
      agentName: 'content-creator',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: { posts_generated: parsedArray.length },
    })

    return {
      success: true,
      posts_generated: parsedArray.length,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const fullError = error instanceof Error ? `${error.message} | ${error.stack ?? ''}` : String(error)
    console.error('Content creator agent error:', err)

    try {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: fullError,
        summary: { step: 'identify which step failed', posts_generated: 0 },
      })
    } catch (logErr) {
      console.error('Failed to log agent run:', logErr)
    }

    return { success: false, error: err.message }
  }
}
