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
import { CATEGORY_TO_TAGS, Signal } from '@/lib/agents/sources-config'

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

function extractKeywords(title: string, tags: string[] = [], category?: string): string[] {
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'a', 'al', 'en', 'y', 'o',
    'que', 'se', 'por', 'para', 'con', 'the', 'a', 'an', 'is', 'are', 'will', 'would', 'who', 'what',
    'when', 'where', 'how', '¿', '?', 'bajara', 'bajará',
  ])
  const words = (title + ' ' + (tags || []).join(' '))
    .toLowerCase()
    .replace(/[¿?¡!.,;:()"']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
  const seen = new Set<string>()
  const result: string[] = []
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w)
      result.push(w)
    }
  }
  if (category) result.push(category.toLowerCase())
  result.push('mexico')
  return result
}

function scoreSignalForMarket(
  signal: Signal,
  keywords: string[],
  marketCategory: string,
  categoryTags: string[]
): number {
  let score = 0
  const titleLower = signal.title.toLowerCase()
  const textLower = signal.text.toLowerCase()
  const signalCatLower = signal.category.toLowerCase()

  for (const kw of keywords) {
    if (titleLower.includes(kw)) score += 3
    if (textLower.includes(kw)) score += 1
  }
  if (categoryTags.some((t) => signalCatLower.includes(t) || titleLower.includes(t) || textLower.includes(t))) {
    score += 2
  }
  score += (signal.engagement ?? 0) * 0.001
  return score
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

type NewsDataFetchOptions = { country?: string; language?: string }

async function fetchNewsData(
  query: string,
  limit: number,
  options: NewsDataFetchOptions = {}
): Promise<NewsArticle[]> {
  const key = process.env.NEWSDATA_API_KEY
  if (!key) {
    console.warn('[NEWS-MONITOR] NEWSDATA_API_KEY not found in env')
    return []
  }
  const params = new URLSearchParams({
    apikey: key,
    q: query,
    size: String(Math.min(limit, 10)),
  })
  if (options.country) params.set('country', options.country)
  if (options.language) params.set('language', options.language)
  const url = `https://newsdata.io/api/1/latest?${params.toString()}`
  try {
    const res = await fetch(url)
    const data = (await res.json()) as {
      results?: Array<Record<string, unknown>>
      status?: string
      totalResults?: number
      message?: string
      error?: string
      code?: string
    }
    const raw = Array.isArray(data) ? data : (data.results ?? [])
    console.log(`[NEWS-MONITOR] NewsData.io response:`, raw.length, 'query:', query.slice(0, 50))
    return raw.slice(0, limit).map((r: Record<string, unknown>) => ({
      title: String(r.title ?? ''),
      description: String(r.description ?? r.content ?? ''),
      source: String(r.source_id ?? r.source_name ?? ''),
      url: String(r.link ?? r.url ?? ''),
      published_at: String(r.pubDate ?? r.publishedAt ?? ''),
    }))
  } catch (e) {
    console.warn('[NEWS-MONITOR] NewsData fetch error:', e)
    return []
  }
}

async function fetchGNews(query: string, limit: number): Promise<NewsArticle[]> {
  const key = process.env.GNEWS_API_KEY
  if (!key) {
    console.log('[NEWS-MONITOR] GNEWS_API_KEY not set, skipping GNews')
    return []
  }
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=es&country=mx&max=${limit}&apikey=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url)
    const data = (await res.json()) as { articles?: Array<Record<string, unknown>>; errors?: unknown }
    const raw = data.articles ?? []
    console.log(`[NEWS-MONITOR] GNews response:`, raw.length, 'query:', query.slice(0, 50))
    return raw.slice(0, limit).map((a: Record<string, unknown>) => ({
      title: String(a.title ?? ''),
      description: String(a.description ?? a.content ?? ''),
      source: String((a.source as { name?: string })?.name ?? ''),
      url: String(a.url ?? ''),
      published_at: String(a.publishedAt ?? ''),
    }))
  } catch (e) {
    console.warn('[NEWS-MONITOR] GNews fetch error:', e)
    return []
  }
}

/** Fallback: fetch from NewsData.io + GNews when RSS+social returns < 3 signals */
async function fetchFallbackSignals(activeMarkets: { title: string; tags: string[]; category?: string }[]): Promise<Signal[]> {
  const newsDataKey = process.env.NEWSDATA_API_KEY
  const gnewsKey = process.env.GNEWS_API_KEY
  if (!newsDataKey && !gnewsKey) return []

  const searchQueries = new Set<string>()
  for (const m of activeMarkets) {
    const terms = extractKeywords(m.title, m.tags, m.category).slice(0, 4)
    if (terms.length > 0) searchQueries.add(terms.join(' '))
  }
  if (searchQueries.size === 0) searchQueries.add('Mexico World Cup 2026 economia')

  const newsArticles: NewsArticle[] = []
  for (const q of Array.from(searchQueries).slice(0, 5)) {
    let articles: NewsArticle[] = []
    if (newsDataKey) articles = await fetchNewsData(q, 5, {})
    if (articles.length === 0 && gnewsKey) articles = await fetchGNews(q, 5)
    newsArticles.push(...articles)
  }

  if (newsArticles.length === 0 && newsDataKey) {
    const fallback = await fetchNewsData('Mexico', 10, {})
    newsArticles.push(...fallback)
  }

  const deduped = deduplicateArticles(newsArticles)
  return deduped.map(articleToSignal)
}

type MarketAnalysis = {
  market_analysis: {
    summary: string
    sentiment_score: number
    relevance: 'high' | 'medium' | 'low'
    probability_suggestion: number
  }
  suggested_markets: Array<{
    title_es: string
    title_en: string
    description_es: string
    description_en: string
    category: string
    resolution_criteria_es: string
    resolution_criteria_en: string
    resolution_date: string
    initial_probability: number
    tags: string[]
    reasoning: string
    source_signals: string[]
  }>
}

export async function runNewsMonitor(options?: {
  includeSocial?: boolean
  forceRun?: boolean
}): Promise<{
  success: boolean
  error?: string
  summary?: {
    articles_fetched: number
    brief_saved: boolean
    suggestions_saved: number
    relevance_saved: boolean
  }
}> {
  const startTime = Date.now()
  console.log('[NEWS-MONITOR] Starting run...', { includeSocial: options?.includeSocial })

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()

    // Step 1: Fetch signals (parallel)
    const [rssSignals, socialSignals] = await Promise.all([
      fetchRSSSignals(),
      options?.includeSocial ? fetchSocialSignals() : Promise.resolve([]),
    ])
    let allSignals: Signal[] = [...rssSignals, ...socialSignals]
    console.log('[NEWS-MONITOR] Signals:', { rss: rssSignals.length, social: socialSignals.length, total: allSignals.length })

    // Step 2: Get active markets
    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title, category, tags, resolution_criteria, current_probability')
      .in('status', ['active', 'trading'])

    const activeMarkets = (markets ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      tags: (m.tags ?? []) as string[],
      resolution_criteria: m.resolution_criteria ?? '',
      current_probability: Number(m.current_probability ?? 50),
    }))

    console.log('[NEWS-MONITOR] Active markets:', activeMarkets.length)

    // Fallback: if < 3 signals, use NewsData/GNews
    if (allSignals.length < 3) {
      console.log('[NEWS-MONITOR] Few signals, falling back to NewsData/GNews')
      const fallback = await fetchFallbackSignals(activeMarkets)
      allSignals = [...allSignals, ...fallback]
      console.log('[NEWS-MONITOR] After fallback:', allSignals.length, 'signals')
    }

    // Step 3: Match signals to markets
    const marketSignals: Record<string, Signal[]> = {}
    for (const market of activeMarkets) {
      const keywords = extractKeywords(market.title, market.tags, market.category)
      const categoryTags = CATEGORY_TO_TAGS[market.category] ?? []
      const scored = allSignals
        .map((s) => ({ signal: s, score: scoreSignalForMarket(s, keywords, market.category, categoryTags) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((x) => x.signal)
      marketSignals[market.id] = scored
    }

    const marketsWithSignals = activeMarkets.filter((m) => (marketSignals[m.id]?.length ?? 0) >= 2)
    console.log('[NEWS-MONITOR] Markets with 2+ signals:', marketsWithSignals.length)

    let totalTokensInput = 0
    let totalTokensOutput = 0
    const marketAnalyses: Array<{
      market_id: string
      market_title: string
      analysis: MarketAnalysis['market_analysis']
      suggestions: MarketAnalysis['suggested_markets']
    }> = []
    const allSuggestions: MarketAnalysis['suggested_markets'] = []

    // Step 4: Analyze with Claude (per market with 2+ signals)
    for (const market of marketsWithSignals) {
      const matchedSignals = marketSignals[market.id] ?? []
      const signalsText = matchedSignals
        .map(
          (s) =>
            `[${s.source_type.toUpperCase()} | ${s.source_name}] ${s.title}\n   ${s.text.substring(0, 200)}\n   Engagement: ${s.engagement ?? 'N/A'} | ${s.published_at}`
        )
        .join('\n\n')

      const userMessage = `Eres el analista de inteligencia de Crowd Conscious, una plataforma de predicciones en México. Tu trabajo NO es solo resumir noticias — es identificar oportunidades de mercados de predicción.

MERCADO EXISTENTE: ${market.title}
CRITERIO: ${market.resolution_criteria}
PROBABILIDAD ACTUAL: ${market.current_probability}%
TAGS: ${market.tags?.join(', ') ?? ''}

SEÑALES RECIENTES:
${signalsText}

Responde SOLO en JSON válido:
{
  "market_analysis": {
    "summary": "2-3 párrafos en español: qué dicen las señales sobre este mercado",
    "sentiment_score": <número de -100 a 100>,
    "relevance": "high|medium|low",
    "probability_suggestion": <número 1-99, tu estimación basada en las señales>
  },
  "suggested_markets": [
    {
      "title_es": "¿Pregunta de predicción en español?",
      "title_en": "Prediction question in English?",
      "description_es": "2-3 oraciones explicando el contexto y por qué es relevante",
      "description_en": "2-3 sentences explaining context and relevance",
      "category": "sports|politics|economy|culture|world|technology",
      "resolution_criteria_es": "Criterio claro y verificable de cómo se resuelve este mercado",
      "resolution_criteria_en": "Clear, verifiable criteria for how this market resolves",
      "resolution_date": "YYYY-MM-DD (fecha razonable para resolución)",
      "initial_probability": <número 1-99, tu estimación inicial>,
      "tags": ["tag1", "tag2", "tag3"],
      "reasoning": "Por qué este mercado sería interesante para la comunidad",
      "source_signals": ["fuente 1", "fuente 2"]
    }
  ]
}

REGLAS PARA suggested_markets:
- Sugiere 0-2 mercados NUEVOS que NO existan ya en la plataforma
- Solo sugiere si las señales realmente lo justifican (no inventes)
- El título DEBE ser una pregunta con ¿? que se responda Sí/No
- resolution_criteria debe ser VERIFICABLE con fuentes públicas
- resolution_date debe ser realista (no más de 6 meses en el futuro)
- initial_probability debe reflejar lo que sugieren las señales
- tags deben ser lowercase, sin acentos, separados por coma
- Si no hay buenas sugerencias, devuelve "suggested_markets": []`

      try {
        const response = await anthropic.messages.create({
          model: MODELS.FAST,
          max_tokens: TOKEN_LIMITS.NEWS,
          messages: [{ role: 'user', content: userMessage }],
        })

        const textBlock = response.content.find((b) => b.type === 'text')
        const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
        const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }
        totalTokensInput += usage.input_tokens
        totalTokensOutput += usage.output_tokens

        const raw = parseAgentJSON(rawText)
        const parsed = (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object'
          ? raw[0]
          : raw) as MarketAnalysis

        if (parsed?.market_analysis) {
          marketAnalyses.push({
            market_id: market.id,
            market_title: market.title,
            analysis: parsed.market_analysis,
            suggestions: parsed.suggested_markets ?? [],
          })
          if (Array.isArray(parsed.suggested_markets)) {
            allSuggestions.push(...parsed.suggested_markets)
          }
        }
      } catch (e) {
        console.warn('[NEWS-MONITOR] Claude error for market', market.title, e)
      }
    }

    // Step 5: Save analysis
    let briefSaved = false
    let relevanceSaved = false

    // Build brief from first analysis (or generic if none)
    const firstAnalysis = marketAnalyses[0]?.analysis
    const brief = firstAnalysis?.summary ?? (allSignals.length > 0
      ? `Se han recopilado ${allSignals.length} señales recientes. Revisa el análisis por mercado en los detalles.`
      : 'No hay señales recientes suficientes para generar un resumen.')

    const hasNoSignals = allSignals.length === 0
    const isPurelyNoNews = /^(no hay noticias|no recent news|no news in the feed|empty feed)[.\s]*$/i.test(brief.trim())
    const isNoNewsPlaceholder = hasNoSignals
      ? !brief || brief.length < 40
      : !brief ||
        brief.length < 60 ||
        (brief.length < 120 && (isPurelyNoNews || /no hay noticias|no recent news|no news in the feed|empty feed/i.test(brief)))

    if (brief && !isNoNewsPlaceholder) {
      const { error: briefErr } = await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen de noticias del día',
        body: brief,
        language: 'es',
        metadata: {
          type: 'news_brief',
          model: MODELS.FAST,
          tokens_input: totalTokensInput,
          tokens_output: totalTokensOutput,
        },
        published: true,
      })
      if (!briefErr) briefSaved = true
    }

    // Save sentiment_scores and relevance per market
    for (const ma of marketAnalyses) {
      const { error: sentErr } = await supabase.from('sentiment_scores').insert({
        market_id: ma.market_id,
        score: Math.max(-100, Math.min(100, ma.analysis.sentiment_score)),
        source: 'news_monitor',
        keywords: [],
      })
      if (!sentErr) relevanceSaved = true

      // Save market-specific relevance
      const relBody = JSON.stringify({
        market_id: ma.market_id,
        relevance: ma.analysis.relevance,
        probability_suggestion: ma.analysis.probability_suggestion,
        summary: ma.analysis.summary,
      })
      await supabase.from('agent_content').insert({
        market_id: ma.market_id,
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: `Análisis: ${ma.market_title}`,
        body: relBody,
        language: 'es',
        metadata: { type: 'market_analysis', relevance: ma.analysis.relevance },
        published: false,
      })
    }

    // Step 6: Save market suggestions (market_suggestion or market_insight fallback)
    let suggestionsSaved = 0
    for (const s of allSuggestions) {
      if (!s?.title_es) continue
      const body = JSON.stringify({
        title_es: s.title_es,
        title_en: s.title_en,
        description_es: s.description_es,
        description_en: s.description_en,
        category: s.category,
        resolution_criteria_es: s.resolution_criteria_es,
        resolution_criteria_en: s.resolution_criteria_en,
        resolution_date: s.resolution_date,
        initial_probability: s.initial_probability,
        tags: s.tags ?? [],
        reasoning: s.reasoning,
        source_signals: s.source_signals ?? [],
        created_by_agent: true,
      })
      const payload = {
        market_id: null,
        agent_type: 'news_monitor' as const,
        title: s.title_es,
        body,
        language: 'es',
        metadata: { type: 'market_suggestion', model: MODELS.FAST },
        published: false,
      }
      let { error } = await supabase.from('agent_content').insert({
        ...payload,
        content_type: 'market_suggestion',
      })
      if (error) {
        // Fallback if migration not run: use market_insight
        const fallback = await supabase.from('agent_content').insert({
          ...payload,
          content_type: 'market_insight',
        })
        error = fallback.error
      }
      if (!error) suggestionsSaved++
    }

    // Step 7: Signal to Content Creator (content_brief)
    const approvedOrHighRelevanceContent = marketAnalyses.filter(
      (a) => a.analysis.relevance === 'high' || a.analysis.relevance === 'medium'
    )
    if (approvedOrHighRelevanceContent.length > 0 || allSuggestions.length > 0) {
      const briefPayload = {
        market_id: null,
        agent_type: 'news_monitor' as const,
        title: 'Brief para Content Creator',
        body: JSON.stringify({
          trending_topics: allSignals.slice(0, 5).map((s) => s.title),
          new_market_suggestions: allSuggestions.map((s) => s.title_es),
          sentiment_snapshot: marketAnalyses.map((a) => ({
            market: a.market_title,
            sentiment: a.analysis.sentiment_score,
            probability_suggestion: a.analysis.probability_suggestion,
          })),
          generated_at: new Date().toISOString(),
        }),
        language: 'es',
        metadata: { type: 'content_brief' },
        published: false,
      }
      const { error } = await supabase.from('agent_content').insert({
        ...briefPayload,
        content_type: 'content_brief',
      })
      if (error) {
        // Fallback if migration not run
        await supabase.from('agent_content').insert({
          ...briefPayload,
          content_type: 'market_insight',
        })
      }
    }

    await logAgentRun({
      agentName: 'news-monitor',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: totalTokensInput,
      tokensOutput: totalTokensOutput,
      summary: {
        signals_fetched: allSignals.length,
        brief_saved: briefSaved,
        suggestions_saved: suggestionsSaved,
        relevance_saved: relevanceSaved,
      },
    })

    return {
      success: true,
      summary: {
        articles_fetched: allSignals.length,
        brief_saved: briefSaved,
        suggestions_saved: suggestionsSaved,
        relevance_saved: relevanceSaved,
      },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as {
      status?: number
      error?: { type?: string; error?: { message?: string }; message?: string }
      message?: string
    }
    console.error('[News Monitor] Error:', err)

    try {
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `API ${apiErr?.status ?? '?'}: ${apiErr?.error?.error?.message ?? apiErr?.error?.message ?? err.message}`,
        summary: { step: 'identify which step failed' },
      })
    } catch (logErr) {
      console.error('Failed to log agent run:', logErr)
    }

    return { success: false, error: err.message }
  }
}
