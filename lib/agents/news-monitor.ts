/**
 * News Monitor — daily Pulse-opportunity scout.
 *
 * v2 (Apr 2026 re-prompting): one Haiku call. Outputs three buckets the
 * founder actually uses:
 *   1. pulse_opportunities[] — 0-3 actionable Pulse pitches (segment, hook,
 *      product+price, draft message). Drives the "Generate content" button
 *      in the admin dashboard.
 *   2. blog_topic_ideas[] — 0-3 weekly-topical seeds. Each is a topic the
 *      founder can hand straight to Content Creator v4.
 *   3. skip_summary — one line saying "X signals scanned, Y skipped because
 *      <reason>" so the absence of items is a SIGNAL not a bug.
 *
 * If nothing meets the bar in either bucket, returns empty arrays. We
 * explicitly do NOT pad with weak topics.
 *
 * Manual trigger only (Run Now). Cron removed in vercel.json. Cost: ~1
 * Haiku call per run, 4k token cap, ~$0.005/run.
 */
import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
} from '@/lib/agents/config'
import { fetchRSSSignals } from '@/lib/agents/fetchers/rss-fetcher'
import { fetchSocialSignals } from '@/lib/agents/fetchers/social-fetcher'
import { Signal } from '@/lib/agents/sources-config'
import {
  emptyPlatformIntelligence,
  formatNewsMonitorPlatformContext,
  getPlatformIntelligence,
} from '@/lib/agents/intelligence-bridge'

type NewsArticle = {
  title: string
  description: string
  source: string
  url: string
  published_at: string
}

function articleToSignal(a: NewsArticle): Signal {
  return {
    source_type: 'rss',
    source_name: a.source,
    category: 'general',
    title: a.title,
    text: a.description,
    url: a.url,
    published_at: a.published_at,
  }
}

function diversifySignals(signals: Signal[], maxPerCategory: number = 4): Signal[] {
  const byCategory: Record<string, Signal[]> = {}
  for (const signal of signals) {
    const cat = signal.category?.trim() || 'general'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(signal)
  }
  const diverse: Signal[] = []
  for (const [, catSignals] of Object.entries(byCategory)) {
    diverse.push(...catSignals.slice(0, maxPerCategory))
  }
  return diverse
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 30)
}

function normalizeTitleForDedup(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSimilarTitle(a: string, b: string): boolean {
  const na = normalizeTitleForDedup(a)
  const nb = normalizeTitleForDedup(b)
  if (na === nb) return true
  const wordsA = new Set(na.split(' ').filter((w) => w.length > 3))
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 3))
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length
  const minLen = Math.min(wordsA.size, wordsB.size)
  return minLen > 0 && overlap / minLen >= 0.6
}

function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const result: NewsArticle[] = []
  for (const a of articles) {
    if (!result.some((r) => isSimilarTitle(r.title, a.title))) {
      result.push(a)
    }
  }
  return result
}

async function fetchNewsData(query: string, limit: number): Promise<NewsArticle[]> {
  const key = process.env.NEWSDATA_API_KEY
  if (!key) return []
  const params = new URLSearchParams({
    apikey: key,
    q: query,
    size: String(Math.min(limit, 10)),
  })
  const url = `https://newsdata.io/api/1/latest?${params.toString()}`
  try {
    const res = await fetch(url)
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    const raw = Array.isArray(data) ? data : (data.results ?? [])
    return raw.slice(0, limit).map((r: Record<string, unknown>) => ({
      title: String(r.title ?? ''),
      description: String(r.description ?? r.content ?? ''),
      source: String(r.source_id ?? r.source_name ?? ''),
      url: String(r.link ?? r.url ?? ''),
      published_at: String(r.pubDate ?? r.publishedAt ?? ''),
    }))
  } catch {
    return []
  }
}

async function fetchGNews(query: string, limit: number): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) return []
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=es&country=mx&max=${limit}&apikey=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url)
    const data = (await res.json()) as { articles?: Array<Record<string, unknown>> }
    const raw = data.articles ?? []
    return raw.slice(0, limit).map((a: Record<string, unknown>) => ({
      title: String(a.title ?? ''),
      description: String(a.description ?? a.content ?? ''),
      source: String((a.source as { name?: string })?.name ?? ''),
      url: String(a.url ?? ''),
      published_at: String(a.publishedAt ?? ''),
    }))
  } catch {
    return []
  }
}

async function fetchFallbackSignals(): Promise<Signal[]> {
  const newsDataKey = process.env.NEWSDATA_API_KEY
  const gnewsKey = process.env.GNEWS_API_KEY
  if (!newsDataKey && !gnewsKey) return []

  const queries = [
    'Mexico CDMX politica',
    'Mexico economia Banxico',
    'Mexico Mundial 2026',
    'Mexico sustentabilidad',
  ]
  const newsArticles: NewsArticle[] = []
  for (const q of queries) {
    let articles: NewsArticle[] = []
    if (newsDataKey) articles = await fetchNewsData(q, 5)
    if (articles.length === 0 && gnewsKey) articles = await fetchGNews(q, 5)
    newsArticles.push(...articles)
  }
  if (newsArticles.length === 0 && newsDataKey) {
    const fallback = await fetchNewsData('Mexico', 10)
    newsArticles.push(...fallback)
  }
  return deduplicateArticles(newsArticles).map(articleToSignal)
}

const SYSTEM_PROMPT = `You are the News Monitor for Crowd Conscious, a collective intelligence + opinion platform in Mexico City. You scan today's news signals and surface ONLY items that translate into platform value: a Pulse opportunity, or a blog topic worth writing about this week.

Your job is to be USEFUL TO ONE PERSON (the founder) — not exhaustive. Quality over volume. Empty arrays are fine. Do not pad.

OUTPUT FORMAT — respond with ONLY a single JSON object, no markdown fences, no preamble:

{
  "summary": "Single short sentence: signals scanned, why most were skipped",
  "skip_reason": "Single phrase explaining the dominant skip reason (e.g. 'mostly partido reports', 'mostly national politics without CDMX angle')",
  "pulse_opportunities": [
    {
      "title": "Short ES title (~12 words). The Pulse question someone could ask.",
      "category": "world_cup | government | sustainability | corporate | community | cause | culture",
      "target_segment": "Who would sponsor this Pulse — be specific. e.g. 'Bares deportivos en CDMX', 'Alcaldía Cuauhtémoc', 'Fintech mexicanas'.",
      "urgency": "high | medium | low",
      "rationale": "1-2 ES sentences: why now, what makes the segment care.",
      "suggested_product": "Pulse Single | Pulse Pilot | Mundial Pulse Pack",
      "source_url": "Primary source URL from the signals provided.",
      "draft_whatsapp_message": "3 sentences max in Spanish, casual-professional, includes one Pulse question. Sponsor outreach copy ready to send."
    }
  ],
  "blog_topic_ideas": [
    {
      "title_es": "ES title in question form (~12 words).",
      "title_en": "EN parallel title.",
      "angle": "1 ES sentence: the non-obvious angle that makes this worth writing.",
      "weekly_topical": true,
      "mexican_angle": "1 ES sentence: the CDMX/Mexico hook.",
      "tied_to_market_id": "(optional) UUID of an active market this story connects to. Pulled from ACTIVE MARKETS list. Empty if none.",
      "source_url": "Primary source URL.",
      "expected_reader_question": "1 ES sentence: the question this post would answer."
    }
  ]
}

HARD RULES
- "pulse_opportunities" — emit 0-3 items. Each must satisfy ALL of:
  * Real news signal in the input (cite source_url).
  * Identifiable buyer segment (no "everyone", no "general public").
  * Concrete urgency (deadline, event date, or news cycle window <14 days).
  * If you cannot satisfy all three for at least one item, return [].
- "blog_topic_ideas" — emit 0-3 items. Each must satisfy ALL of:
  * Real news event in the last 7 days OR an evergreen angle with a fresh data point.
  * Mexican angle (CDMX preferred but national OK if specific).
  * NOT a repeat of an active market topic from the platform context above.
  * If you cannot satisfy all three for at least one item, return [].
- Skip the World Cup unless the signal is non-obvious (don't include match recaps).
- Skip US politics, Trump quotes, foreign-only news.
- "summary" + "skip_reason" must reflect what you ACTUALLY did — if you returned 0 items, say so.

PLATFORM PRICING (use suggested_product field):
- Pulse Pilot — $1,500 MXN — for cold prospects / first-time buyers (cafés, bars, small NGOs).
- Pulse Single — $5,000 MXN — single-question survey for medium brands or institutions.
- Mundial Pulse Pack — $25,000-50,000 MXN — for brands with World Cup activation.`

export interface NewsMonitorOutput {
  summary: string
  skip_reason?: string
  pulse_opportunities: Array<{
    title: string
    category: string
    target_segment: string
    urgency: 'high' | 'medium' | 'low'
    rationale: string
    suggested_product?: string
    source_url?: string
    draft_whatsapp_message?: string
  }>
  blog_topic_ideas: Array<{
    title_es: string
    title_en?: string
    angle: string
    weekly_topical?: boolean
    mexican_angle?: string
    tied_to_market_id?: string | null
    source_url?: string
    expected_reader_question?: string
  }>
}

export async function runNewsMonitor(options?: { includeSocial?: boolean }): Promise<{
  success: boolean
  error?: string
  summary?: {
    signals_fetched: number
    pulse_opportunities: number
    blog_topic_ideas: number
    skip_reason?: string
  }
}> {
  const startTime = Date.now()
  console.log('[NEWS-MONITOR v2] Starting run...')

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()

    let platformIntel = emptyPlatformIntelligence()
    try {
      platformIntel = await getPlatformIntelligence()
    } catch (e) {
      console.warn('[NEWS-MONITOR] getPlatformIntelligence failed:', e)
    }
    const platformBlock = formatNewsMonitorPlatformContext(platformIntel)

    const [rssSignals, socialSignals] = await Promise.all([
      fetchRSSSignals(),
      options?.includeSocial ? fetchSocialSignals() : Promise.resolve([]),
    ])
    let allSignals: Signal[] = [...rssSignals, ...socialSignals]
    console.log('[NEWS-MONITOR] Signals:', {
      rss: rssSignals.length,
      social: socialSignals.length,
      total: allSignals.length,
    })

    if (allSignals.length < 3) {
      const fallback = await fetchFallbackSignals()
      allSignals = [...allSignals, ...fallback]
    }
    allSignals = diversifySignals(allSignals)

    if (allSignals.length === 0) {
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'no_signals' },
      })
      return {
        success: true,
        summary: {
          signals_fetched: 0,
          pulse_opportunities: 0,
          blog_topic_ideas: 0,
          skip_reason: 'no_signals',
        },
      }
    }

    const { data: activeMarkets } = await supabase
      .from('prediction_markets')
      .select('id, title, category, is_pulse')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .eq('is_draft', false)
      .order('total_votes', { ascending: false })
      .limit(15)

    const activeBlock = (activeMarkets ?? [])
      .map((m) => `- [${m.id}] (${m.is_pulse ? 'PULSE' : m.category}) ${m.title}`)
      .join('\n')

    const signalsBlock = allSignals
      .slice(0, 18)
      .map(
        (s, i) =>
          `${i + 1}. [${s.source_name}] (${s.category ?? 'general'}) ${s.title}\n   ${(s.text || '').slice(0, 200)}\n   URL: ${s.url}`
      )
      .join('\n\n')

    const userMessage = `${platformBlock}

ACTIVE MARKETS (use these IDs for "tied_to_market_id"):
${activeBlock || '(none)'}

SIGNALS FROM TODAY (${allSignals.length} total, showing first 18):
${signalsBlock}

Produce the JSON exactly per your system instructions. If a bucket has no items that pass the hard rules, return []. Do not pad.`

    let totalTokensInput = 0
    let totalTokensOutput = 0
    let parsed: NewsMonitorOutput | null = null

    try {
      const response = await anthropic.messages.create({
        model: MODELS.FAST,
        max_tokens: TOKEN_LIMITS.NEWS_BRIEF,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      })
      const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }
      totalTokensInput = usage.input_tokens
      totalTokensOutput = usage.output_tokens

      const textBlock = response.content.find((b) => b.type === 'text')
      const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
      const raw = parseAgentJSON(rawText)
      const candidate = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>
      parsed = {
        summary: String(candidate.summary ?? ''),
        skip_reason: candidate.skip_reason ? String(candidate.skip_reason) : undefined,
        pulse_opportunities: Array.isArray(candidate.pulse_opportunities)
          ? (candidate.pulse_opportunities as NewsMonitorOutput['pulse_opportunities'])
          : [],
        blog_topic_ideas: Array.isArray(candidate.blog_topic_ideas)
          ? (candidate.blog_topic_ideas as NewsMonitorOutput['blog_topic_ideas'])
          : [],
      }
    } catch (e) {
      console.error('[NEWS-MONITOR] Generate/parse failed:', e)
    }

    if (!parsed) {
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'error',
        durationMs: Date.now() - startTime,
        tokensInput: totalTokensInput,
        tokensOutput: totalTokensOutput,
        errorMessage: 'parse_failed_or_empty_response',
      })
      return { success: false, error: 'parse_failed_or_empty_response' }
    }

    // Persist as a single agent_content row with metadata.type='pulse_opportunities'
    // so the admin dashboard renders the new card. We keep agent_type='news_monitor'
    // and content_type='news_summary' for compatibility with existing tabs.
    try {
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Brief diario — oportunidades Pulse + ideas blog',
        body: JSON.stringify(parsed),
        language: 'es',
        metadata: {
          type: 'pulse_opportunities',
          model: MODELS.FAST,
          signal_count: allSignals.length,
          pulse_opportunity_count: parsed.pulse_opportunities.length,
          blog_topic_count: parsed.blog_topic_ideas.length,
          tokens_input: totalTokensInput,
          tokens_output: totalTokensOutput,
        },
        published: true,
      })
    } catch (e) {
      console.error('[NEWS-MONITOR] Failed to save brief:', e)
    }

    await logAgentRun({
      agentName: 'news-monitor',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: totalTokensInput,
      tokensOutput: totalTokensOutput,
      summary: {
        signals_fetched: allSignals.length,
        pulse_opportunities: parsed.pulse_opportunities.length,
        blog_topic_ideas: parsed.blog_topic_ideas.length,
        skip_reason: parsed.skip_reason,
      },
    })

    return {
      success: true,
      summary: {
        signals_fetched: allSignals.length,
        pulse_opportunities: parsed.pulse_opportunities.length,
        blog_topic_ideas: parsed.blog_topic_ideas.length,
        skip_reason: parsed.skip_reason,
      },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as {
      status?: number
      error?: { type?: string; error?: { message?: string }; message?: string }
      message?: string
    }
    console.error('[News Monitor v2] Error:', err)

    try {
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `API ${apiErr?.status ?? '?'}: ${apiErr?.error?.error?.message ?? apiErr?.error?.message ?? err.message}`,
      })
    } catch {
      /* ignore */
    }

    return { success: false, error: err.message }
  }
}
