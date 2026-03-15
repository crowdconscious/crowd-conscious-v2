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

    // 0. NEWS MONITOR INTELLIGENCE (content briefs + market suggestions)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    let briefs: Array<{ id: string; body: string; created_at: string }> = []
    let suggestions: Array<{ id: string; title: string; body: string; created_at: string }> = []

    try {
      const { data: briefRows } = await supabase
        .from('agent_content')
        .select('id, body, created_at')
        .eq('agent_type', 'news_monitor')
        .eq('content_type', 'content_brief')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(3)
      briefs = (briefRows ?? []) as typeof briefs
      if (briefs.length === 0) {
        const { data: fallback } = await supabase
          .from('agent_content')
          .select('id, body, created_at, metadata')
          .eq('agent_type', 'news_monitor')
          .eq('content_type', 'market_insight')
          .gte('created_at', since24h)
          .order('created_at', { ascending: false })
          .limit(5)
        const withType = (fallback ?? []).filter(
          (r: { metadata?: { type?: string } }) => (r as { metadata?: { type?: string } }).metadata?.type === 'content_brief'
        )
        briefs = withType.slice(0, 3).map(({ id, body, created_at }) => ({ id, body, created_at })) as typeof briefs
      }
    } catch (e) {
      console.warn('[Content Creator] content_brief fetch failed:', e)
    }

    try {
      const { data: sugRows } = await supabase
        .from('agent_content')
        .select('id, title, body, created_at, content_type, metadata')
        .eq('agent_type', 'news_monitor')
        .in('content_type', ['market_suggestion', 'market_insight'])
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(8)
      const rows = (sugRows ?? []) as Array<{ id: string; title: string; body: string; created_at: string; content_type?: string; metadata?: { type?: string } }>
      suggestions = rows
        .filter((r) => r.content_type === 'market_suggestion' || r.metadata?.type === 'market_suggestion')
        .slice(0, 5)
    } catch (e) {
      console.warn('[Content Creator] market_suggestion fetch failed:', e)
    }

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    let newMarkets: Array<{ id: string; title: string; description?: string; tags?: string[]; current_probability?: number }> = []
    try {
      const { data: mktRows } = await supabase
        .from('prediction_markets')
        .select('id, title, description, tags, current_probability')
        .gte('created_at', twoDaysAgo)
        .in('status', ['active', 'trading'])
        .limit(5)
      newMarkets = (mktRows ?? []) as typeof newMarkets
    } catch (e) {
      console.warn('[Content Creator] new markets fetch failed:', e)
    }

    data.news_monitor_briefs = briefs.length
    data.news_monitor_suggestions = suggestions.length
    data.new_markets_count = newMarkets.length

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
      const { data: history, error: historyErr } = await supabase
        .from('prediction_market_history')
        .select('market_id, probability, recorded_at')
        .gte('recorded_at', cutoff24h)
        .order('recorded_at', { ascending: false })

      if (historyErr) {
        console.warn('[Content Creator] prediction_market_history not found, skipping:', historyErr.message)
        data.probability_shifts_24h = []
      } else {
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
      }
    } catch (e) {
      console.warn('[Content Creator] probability_shifts_24h failed:', e)
      data.probability_shifts_24h = []
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

    // d. CONSCIOUS FUND (fund_causes, fund_votes, conscious_fund may not exist)
    try {
      const cycle = getCurrentCycle()
      let causesData: Array<{ id: string; name: string; vote_count: number }> = []
      try {
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
        causesData = (causes ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          vote_count: byCause[c.id] ?? 0,
        }))
      } catch {
        console.warn('[Content Creator] fund_causes/fund_votes not found, skipping')
      }
      data.fund_causes_with_votes = causesData

      let totalFromSponsors = 0
      try {
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
        totalFromSponsors =
          (sponsorMarkets ?? []).reduce(
            (sum, m) =>
              sum +
              Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0) *
                CONSCIOUS_FUND_PERCENT,
            0
          ) ?? 0
        data.total_fund_value = legacyBalance + totalFromSponsors
      } catch (e) {
        console.warn('[Content Creator] conscious_fund not found, skipping:', e)
        data.total_fund_value = 0
      }
    } catch (e) {
      data.fund_causes_with_votes = []
      data.total_fund_value = 0
    }

    // e. LEADERBOARD (profiles may not exist - use display names from user_xp only)
    try {
      const { data: xpRows, error: xpErr } = await supabase
        .from('user_xp')
        .select('user_id, total_xp')
        .gt('total_xp', 0)
        .order('total_xp', { ascending: false })
        .limit(5)

      if (xpErr || !xpRows?.length) {
        data.leaderboard_top_3 = []
      } else {
        const userIds = xpRows.map((r) => r.user_id)
        let profileMap = new Map<string, string>()
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds)
          profileMap = new Map(
            (profiles ?? []).map((p) => [p.id, p.full_name || 'Anonymous'])
          )
        } catch {
          // profiles table may not exist - use Predictor N
        }
        data.leaderboard_top_3 = xpRows.slice(0, 3).map((r, i) => ({
          rank: i + 1,
          user_id: r.user_id,
          username: profileMap.get(r.user_id) ?? `Predictor #${i + 1}`,
          total_xp: Number(r.total_xp),
        }))
      }
    } catch (e) {
      console.warn('[Content Creator] leaderboard failed:', e)
      data.leaderboard_top_3 = []
    }

    const systemMessage = `You are the social media content strategist for Crowd Conscious (crowdconscious.app), a free-to-play opinion platform in Mexico City. You create engaging social media content that drives people to the platform. Your tone is: smart but accessible, community-driven, slightly provocative (asking questions people want to answer), and always ties back to social impact. You write in BOTH Spanish and English. The platform is gearing up for FIFA World Cup 2026 — opening match is June 11 at Estadio Azteca, Mexico City.

For each Instagram post, also provide:
1. IMAGE_PROMPT: A detailed prompt for generating an image with Leonardo AI or Midjourney. Be specific: describe the composition, colors (use our brand: dark navy #0a1628, emerald #10b981), mood, and style. Example: "Dark navy gradient background, large emerald green percentage number 54% floating in center, subtle soccer ball pattern overlay, minimal text, futuristic data visualization aesthetic, 1080x1080"
2. CAROUSEL_IDEA: If this would work as a carousel (multiple slides), describe 3-4 slides: Slide 1: Hook (the question or bold stat), Slide 2: Context (what's happening, why it matters), Slide 3: Data (the probability, how it changed), Slide 4: CTA (what do you think? crowdconscious.app)
3. MEME_SUGGESTION: If there's a relevant meme format, describe it. Example: "Drake meme — rejecting: checking news for election predictions / accepting: checking Crowd Conscious for collective intelligence". Only suggest memes culturally relevant to Mexican/LATAM audience.

For Twitter posts, also provide:
1. THREAD_OPTION: A 3-tweet thread version if the topic deserves deeper explanation
2. QUOTE_TWEET_HOOK: A one-liner designed to go viral if someone quotes the original tweet

For LinkedIn posts, also provide:
1. HOOK_VARIATIONS: 3 alternative first lines (the hook determines 80% of engagement)`

    const briefContext = briefs?.length
      ? (() => {
          try {
            const b = JSON.parse(briefs[0].body) as {
              trending_topics?: string[]
              new_market_suggestions?: string[]
              sentiment_snapshot?: unknown
            }
            return `
Temas trending: ${(b.trending_topics ?? []).join(', ') || 'N/A'}
Sugerencias de mercados nuevos: ${(b.new_market_suggestions ?? []).join(', ') || 'N/A'}
Snapshot de sentimiento: ${JSON.stringify(b.sentiment_snapshot ?? {})}`
          } catch {
            return 'No hay briefs recientes del News Monitor.'
          }
        })()
      : 'No hay briefs recientes del News Monitor.'

    const newMarketsContext =
      newMarkets?.length > 0
        ? newMarkets
            .map(
              (m) =>
                `• "${m.title}" (${m.current_probability ?? 50}% YES) — tags: ${(m.tags ?? []).join(', ') || 'N/A'}`
            )
            .join('\n')
        : 'No hay mercados nuevos.'

    const suggestionsContext =
      suggestions?.length > 0
        ? suggestions
            .map((s) => {
              try {
                const body = JSON.parse(s.body) as { reasoning?: string }
                return `• "${s.title}" — ${body.reasoning ?? 'N/A'}`
              } catch {
                return `• "${s.title}"`
              }
            })
            .join('\n')
        : 'No hay sugerencias pendientes.'

    const userMessage = `CONTEXTO DE INTELIGENCIA (del News Monitor):
${briefContext}

MERCADOS NUEVOS O RECIENTES (últimas 48h):
${newMarketsContext}

SUGERENCIAS PENDIENTES DE APROBACIÓN:
${suggestionsContext}

INSTRUCCIONES ADICIONALES:
- Si hay mercados nuevos, genera AL MENOS 1 social post que los promocione
- Si hay temas trending, úsalos como gancho para el contenido
- Los social posts deben mencionar @crowdconscious y usar #CrowdConscious
- Genera contenido en ESPAÑOL e INGLÉS (bilingual posts)
- Formato para Instagram: usa emojis, pregunta directa, CTA a votar
- Formato para Twitter/X: conciso, dato + pregunta, link implícito
- NO generes contenido genérico — cada post debe referenciar datos reales

Para cada social post, especifica además:
- platform: "instagram" | "twitter" | "both"
- language: "es" | "en" | "both"
- text_es: texto en español
- text_en: texto en inglés
- hook: dato o noticia que conecta con el mercado
- market_reference: título del mercado que promociona (si aplica)
- suggested_image: breve descripción de imagen para acompañar

---

Here is today's platform activity data (JSON):

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

Based on today's platform activity AND the News Monitor context above, generate exactly 6 social media posts:

POST 1 — Instagram carousel caption (Spanish): About the hottest market or biggest probability shift. Hook people into giving their opinion. Include relevant emojis. End with CTA to crowdconscious.app

POST 2 — Instagram carousel caption (English): Same topic adapted for English audience

POST 3 — Twitter/X (Spanish, max 280 chars): Punchy one-liner about the most interesting market. Include the question. Link to crowdconscious.app

POST 4 — Twitter/X (English, max 280 chars): Same adapted for English

POST 5 — LinkedIn (Spanish): Professional tone. Focus on the social impact angle — the Conscious Fund, community governance, or how collective intelligence works. 2-3 short paragraphs.

POST 6 — Community Highlight (Spanish): Celebrate the top predictor or most active community member, or a trending inbox submission. Make people feel seen.

For each post return a JSON object with:
- Base: platform, language, post_type, hook, body, hashtags, cta
- Instagram posts add: image_prompt, carousel_idea, meme_suggestion
- Twitter posts add: thread_option, quote_tweet_hook
- LinkedIn posts add: hook_variations (array of 3 strings)

Return as a JSON array of 6 objects. No markdown wrapping. Just raw JSON.`

    const userPrompt = userMessage?.trim() ?? ''
    if (!userPrompt) {
      console.error('[Content Creator] Empty prompt, skipping API call')
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'empty_prompt' },
      })
      return { success: false, error: 'empty_prompt' }
    }

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.SOCIAL_CONTENT,
      system: systemMessage,
      messages: [{ role: 'user', content: userPrompt }],
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

    const activeMarketsArr = Array.isArray(data.active_markets)
      ? (data.active_markets as Array<{ id: string; title: string }>)
      : []
    const allMarkets = [...(newMarkets ?? []), ...activeMarketsArr]
    const marketByTitle = new Map<string, string>()
    for (const m of allMarkets) {
      const t = (m.title ?? '').trim()
      if (t && !marketByTitle.has(t)) marketByTitle.set(t, m.id)
    }

    for (const post of parsedArray) {
      if (!post || typeof post !== 'object') continue
      const platform = String(post.platform ?? 'unknown').toLowerCase()
      const hook = String(post.hook ?? 'Untitled')
      const marketRef = String(post.market_reference ?? '').trim()
      let marketId: string | null = null
      if (marketRef) {
        marketId = marketByTitle.get(marketRef) ?? null
        if (!marketId) {
          const match = allMarkets.find(
            (m) =>
              (m.title ?? '').toLowerCase().includes(marketRef.toLowerCase()) ||
              marketRef.toLowerCase().includes((m.title ?? '').toLowerCase())
          )
          if (match) marketId = match.id
        }
      }

      const suggestionRef = suggestions?.find((s) =>
        (post.market_reference && s.title && String(s.title).includes(String(post.market_reference).slice(0, 30))) ||
        (post.hook && s.title && String(s.title).includes(String(post.hook).slice(0, 30)))
      )
      const postBody = { ...post } as Record<string, unknown>
      if (suggestionRef) {
        postBody.suggestion_id = suggestionRef.id
        postBody.suggestion_title = suggestionRef.title
      }

      const metadata: Record<string, unknown> = {
        platform: post.platform,
        language: post.language,
        post_type: post.post_type,
        model: MODELS.CREATIVE,
        tokens_input: usage.input_tokens,
        tokens_output: usage.output_tokens,
        hashtags: post.hashtags,
        image_prompt: post.image_prompt,
        carousel_idea: post.carousel_idea,
        meme_suggestion: post.meme_suggestion,
        thread_option: post.thread_option,
        quote_tweet_hook: post.quote_tweet_hook,
        hook_variations: post.hook_variations,
        hook: post.hook,
        market_reference: post.market_reference,
        suggested_image: post.suggested_image,
        text_es: post.text_es,
        text_en: post.text_en,
      }

      try {
        await supabase.from('agent_content').insert({
          market_id: marketId,
          agent_type: 'content_creator',
          content_type: 'social_post',
          title: hook,
          body: JSON.stringify(postBody),
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
    const apiErr = error as { status?: number; error?: { type?: string; error?: { message?: string }; message?: string }; message?: string }
    console.error('[Content Creator] Anthropic API error:', JSON.stringify({
      status: apiErr?.status,
      type: apiErr?.error?.type,
      message: apiErr?.error?.error?.message ?? apiErr?.error?.message ?? apiErr?.message,
      full: apiErr?.error ?? apiErr,
    }, null, 2))
    console.error('Content creator agent error:', err)

    try {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `API ${apiErr?.status ?? '?'}: ${apiErr?.error?.error?.message ?? apiErr?.error?.message ?? err.message}`,
        summary: { step: 'identify which step failed', posts_generated: 0 },
      })
    } catch (logErr) {
      console.error('Failed to log agent run:', logErr)
    }

    return { success: false, error: err.message }
  }
}
