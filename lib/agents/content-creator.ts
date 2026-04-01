/**
 * Content Creator: generates bilingual blog drafts + social snippets for review.
 * Saves to `blog_posts` (draft) and `agent_content` (blog_post + social JSON).
 */
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
import {
  emptyPlatformIntelligence,
  formatContentCreatorPlatformContext,
  getPlatformIntelligence,
} from '@/lib/agents/intelligence-bridge'

const ALLOWED_CATEGORIES = new Set([
  'pulse_analysis',
  'market_story',
  'world_cup',
  'behind_data',
  'insight',
])

function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
  return s || 'post'
}

async function uniqueSlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  base: string
): Promise<string> {
  let candidate = base
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from('blog_posts').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

const CONTENT_CREATOR_SYSTEM = `You are the Content Creator for Crowd Conscious, a collective intelligence platform in Mexico City.

Your job: Generate a BLOG POST draft based on the platform's current data and recent news signals.

OUTPUT FORMAT (respond in this exact JSON structure only — no markdown fences):
{
  "title": "Blog post title in Spanish",
  "title_en": "Blog post title in English",
  "slug": "url-friendly-slug",
  "excerpt": "2-3 sentence teaser in Spanish",
  "excerpt_en": "2-3 sentence teaser in English",
  "content": "Full blog post in Spanish (markdown format, 400-800 words)",
  "content_en": "Full blog post in English (markdown format)",
  "category": "one of: pulse_analysis, market_story, world_cup, behind_data, insight",
  "tags": ["tag1", "tag2", "tag3"],
  "meta_description": "SEO description in Spanish (150 chars max)",
  "related_market_ids": ["uuid-from-platform-data-list", "optional-second-uuid"],
  "related_market_titles": ["fallback title 1 if ids unknown"],
  "social_posts": {
    "twitter_es": "Short Spanish tweet with insight (280 chars)",
    "twitter_en": "Short English tweet with insight (280 chars)",
    "instagram_es": "Longer Spanish caption for Instagram"
  }
}

CONTENT GUIDELINES:
- Lead with a SURPRISING insight, not a summary
- Use confidence / vote data to tell stories (e.g. more votes vs higher certainty)
- Connect platform data to real-world news when possible
- Include the Galton ox story or collective intelligence concept periodically
- Always end with a CTA to vote on a specific market
- Set related_market_ids to 1–3 UUIDs from the PLATFORM DATA market list (exact ids); use related_market_titles only if no id fits
- Write for Mexico City: local references, neighborhoods, landmarks, current events
- SEO: Spanish-language searches about CDMX, World Cup, public opinion, participation
- Bilingual: Spanish primary, English secondary
- Tone: data-driven but accessible

DO NOT:
- Write generic "prediction markets are cool" content
- Repeat the same insight across posts
- Use corporate language ("leverage", "synergize")
- Write more than 800 words in Spanish body`

export async function runContentCreator(): Promise<{
  success: boolean
  error?: string
  blog_post_id?: string
  tokens?: { input: number; output: number }
}> {
  const startTime = Date.now()

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()
    const today = mexicoCityNow()
    const todayFormatted = formatDateMX(today)

    let platformIntel = emptyPlatformIntelligence()
    try {
      platformIntel = await getPlatformIntelligence()
    } catch (e) {
      console.warn('[Content Creator] getPlatformIntelligence failed:', e)
    }
    const platformLiveBlock = formatContentCreatorPlatformContext(platformIntel)

    const since24h = new Date(Date.now() - 86400000).toISOString()

    const [
      { data: markets },
      { data: recentVotes },
      { data: newsRow },
      { data: pulseMarkets },
      { count: profileCount },
    ] = await Promise.all([
      supabase
        .from('prediction_markets')
        .select('id, title, category, total_votes, current_probability, status, is_pulse')
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
        .order('total_votes', { ascending: false, nullsFirst: false })
        .limit(10),
      supabase
        .from('market_votes')
        .select('market_id, confidence, created_at')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('agent_content')
        .select('body, content_type, created_at')
        .eq('agent_type', 'news_monitor')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('prediction_markets')
        .select('id, title, total_votes, current_probability, is_pulse')
        .eq('is_pulse', true)
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
        .limit(5),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    const marketList = markets ?? []
    const voteList = recentVotes ?? []
    const voteMarketIds = [...new Set(voteList.map((v) => v.market_id).filter(Boolean))]
    let voteTitles: Record<string, string> = {}
    if (voteMarketIds.length > 0) {
      const { data: vm } = await supabase
        .from('prediction_markets')
        .select('id, title')
        .in('id', voteMarketIds)
      voteTitles = Object.fromEntries((vm ?? []).map((m) => [m.id, m.title]))
    }

    let newsSnippet = ''
    if (newsRow?.body) {
      const b = newsRow.body
      newsSnippet = typeof b === 'string' ? b.slice(0, 1200) : JSON.stringify(b).slice(0, 1200)
    }

    const dataBrief = `
PLATFORM DATA (${todayFormatted}):
- Registered users (approx): ${profileCount ?? 'N/A'}
- Active markets (sample, use these ids for related_market_ids): ${marketList
      .map(
        (m) =>
          `"${m.title}" id=${m.id} (${m.total_votes ?? 0} votes, ${Math.round((m.current_probability ?? 0) * 100)}% prob.)`
      )
      .join(' | ')}
- Votes in last 24h: ${voteList.length}
- Recent vote activity (sample): ${voteList
      .slice(0, 15)
      .map((v) => `${voteTitles[v.market_id] ?? v.market_id} (conf ${v.confidence})`)
      .join('; ')}
${pulseMarkets?.length ? `\nACTIVE PULSE: ${pulseMarkets.map((p) => `"${p.title}" (${p.total_votes ?? 0} votes)`).join(' | ')}` : ''}
${newsSnippet ? `\nNEWS SIGNALS (latest monitor output):\n${newsSnippet}` : ''}

${platformLiveBlock}
`

    const userMessage = `${dataBrief}

Respond with a single JSON object exactly as specified in your instructions.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.BLOG,
      system: CONTENT_CREATOR_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let blogObj: Record<string, unknown>
    try {
      const parsed = parseAgentJSON(rawText)
      blogObj = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>
    } catch (parseErr) {
      console.error('[Content Creator] JSON parse failed:', parseErr)
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'content_creator',
        content_type: 'social_post',
        title: 'Blog draft (parse failed)',
        body: rawText.slice(0, 120000),
        language: 'es',
        metadata: { parse_error: String(parseErr), model: MODELS.CREATIVE },
        published: false,
      })
      await logAgentRun({
        agentName: 'content-creator',
        status: 'success',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { parse_failed: true },
      })
      return {
        success: true,
        tokens: { input: usage.input_tokens, output: usage.output_tokens },
      }
    }

    const title = String(blogObj.title ?? 'Sin título').trim()
    const excerpt = String(blogObj.excerpt ?? '').trim()
    const content = String(blogObj.content ?? '').trim()
    if (!content || !excerpt) {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'missing_content_or_excerpt' },
      })
      return { success: false, error: 'missing_content_or_excerpt' }
    }

    const slugBase = slugify(String(blogObj.slug ?? title))
    const slug = await uniqueSlug(supabase, slugBase)

    let category = String(blogObj.category ?? 'insight').trim()
    if (!ALLOWED_CATEGORIES.has(category)) category = 'insight'

    const tags = Array.isArray(blogObj.tags) ? (blogObj.tags as unknown[]).map((t) => String(t)) : []

    const allowedMarketIds = new Set(marketList.map((m) => m.id))
    const fromModelIds = Array.isArray(blogObj.related_market_ids)
      ? (blogObj.related_market_ids as unknown[])
          .map((x) => String(x).trim())
          .filter((id) => allowedMarketIds.has(id))
      : []
    const relatedIds: string[] = [...new Set(fromModelIds)].slice(0, 5)

    const relatedTitles = Array.isArray(blogObj.related_market_titles)
      ? (blogObj.related_market_titles as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : []

    const titleToId = new Map(marketList.map((m) => [m.title.trim().toLowerCase(), m.id]))
    if (relatedIds.length === 0) {
      for (const rt of relatedTitles) {
        const id = titleToId.get(rt.toLowerCase())
        if (id) relatedIds.push(id)
      }
      for (const m of marketList) {
        if (relatedIds.length >= 5) break
        const fuzzy = relatedTitles.some(
          (rt) =>
            m.title.toLowerCase().includes(rt.toLowerCase()) ||
            rt.toLowerCase().includes(m.title.toLowerCase().slice(0, 20))
        )
        if (fuzzy && !relatedIds.includes(m.id)) relatedIds.push(m.id)
      }
    }

    const metaDesc = String(blogObj.meta_description ?? excerpt).slice(0, 160)

    const { data: inserted, error: insErr } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        title_en: String(blogObj.title_en ?? '').trim() || null,
        excerpt,
        excerpt_en: String(blogObj.excerpt_en ?? '').trim() || null,
        content,
        content_en: String(blogObj.content_en ?? '').trim() || null,
        category: category as
          | 'insight'
          | 'pulse_analysis'
          | 'market_story'
          | 'world_cup'
          | 'behind_data',
        tags,
        meta_title: title,
        meta_description: metaDesc,
        related_market_ids: relatedIds,
        generated_by: 'content-creator',
        status: 'draft',
      })
      .select('id')
      .single()

    if (insErr || !inserted) {
      console.error('[Content Creator] blog_posts insert', insErr)
      return { success: false, error: insErr?.message ?? 'blog_insert_failed' }
    }

    const blogId = inserted.id as string

    const socialPosts = blogObj.social_posts && typeof blogObj.social_posts === 'object'
      ? blogObj.social_posts
      : {}

    const { data: agentRow, error: agentErr } = await supabase
      .from('agent_content')
      .insert({
        market_id: relatedIds[0] ?? null,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title,
        body: JSON.stringify({
          blog_post_id: blogId,
          slug,
          social_posts: socialPosts,
        }),
        language: 'es',
        metadata: {
          blog_post_id: blogId,
          slug,
          category,
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
      .select('id')
      .single()

    if (agentErr) {
      console.error('[Content Creator] agent_content insert', agentErr)
    } else if (agentRow?.id) {
      await supabase.from('blog_posts').update({ agent_content_id: agentRow.id }).eq('id', blogId)
    }

    await logAgentRun({
      agentName: 'content-creator',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: { blog_post_id: blogId, slug },
    })

    return {
      success: true,
      blog_post_id: blogId,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Content creator agent error:', err)
    await logAgentRun({
      agentName: 'content-creator',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: err.message,
    })
    return { success: false, error: err.message }
  }
}
