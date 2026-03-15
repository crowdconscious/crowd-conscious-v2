import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
} from '@/lib/agents/config'

type NewsArticle = {
  title: string
  description: string
  source: string
  url: string
  published_at: string
}

function extractSearchTerms(title: string, tags: string[] = [], category?: string): string[] {
  const terms: string[] = []
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
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w)
      terms.push(w)
    }
  }
  if (category) terms.push(category)
  terms.push('Mexico')
  return terms.slice(0, 5)
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
    size: String(Math.min(limit, 10)), // Free tier max 10/request
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
    console.log(`[NEWS-MONITOR] NewsData.io response status: ${res.status}`, 'results:', raw.length, 'query:', query.slice(0, 50), 'filters:', { country: options.country ?? 'none', language: options.language ?? 'none' })
    if (raw.length === 0) {
      console.log('[NEWS-MONITOR] NewsData.io empty - full response:', JSON.stringify({ status: data.status, totalResults: data.totalResults, message: data.message, error: data.error, code: data.code }))
    }
    if (raw.length > 0) {
      console.log('[NEWS-MONITOR] Article titles:', raw.slice(0, 3).map((r: Record<string, unknown>) => String(r.title ?? '')))
    }
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
    console.log(`[NEWS-MONITOR] GNews response status: ${res.status}`, 'articles:', raw.length, 'query:', query.slice(0, 50))
    if (raw.length === 0 && (data as { errors?: unknown }).errors) {
      console.log('[NEWS-MONITOR] GNews error response:', JSON.stringify((data as { errors?: unknown }).errors))
    }
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

export async function runNewsMonitor(): Promise<{
  success: boolean
  error?: string
  summary?: { articles_fetched: number; brief_saved: boolean; suggestions_saved: number; relevance_saved: boolean }
}> {
  const startTime = Date.now()
  console.log('[NEWS-MONITOR] Starting run...')

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()

    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title, category, tags')
      .in('status', ['active', 'trading'])

    const activeMarkets = (markets ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      tags: (m.tags ?? []) as string[],
    }))

    console.log('[NEWS-MONITOR] Active markets found:', activeMarkets.length, activeMarkets.map((m) => m.title).slice(0, 3))

    const newsArticles: NewsArticle[] = []
    const newsDataKey = process.env.NEWSDATA_API_KEY
    const gnewsKey = process.env.GNEWS_API_KEY

    if (!newsDataKey && !gnewsKey) {
      console.warn(
        'No news API keys found. Skipping external news. Add NEWSDATA_API_KEY or GNEWS_API_KEY to env.'
      )
    } else {
      const searchQueries = new Set<string>()
      for (const m of activeMarkets) {
        const terms = extractSearchTerms(m.title, m.tags, m.category)
        if (terms.length > 0) {
          searchQueries.add(terms.slice(0, 4).join(' '))
        }
      }
      if (searchQueries.size === 0) {
        searchQueries.add('Mexico World Cup 2026 economia')
      }

      // NewsData.io free tier: country+language filters often return 0. Use NO filters to maximize results.
      // extractSearchTerms already adds "Mexico" to queries, so results stay relevant.
      for (const q of Array.from(searchQueries).slice(0, 5)) {
        console.log('[NEWS-MONITOR] Search query:', q)
        let articles: NewsArticle[] = []
        if (newsDataKey) {
          articles = await fetchNewsData(q, 5, {}) // No country/language — free tier is restrictive
        }
        if (articles.length === 0 && gnewsKey) {
          articles = await fetchGNews(q, 5)
        }
        console.log('[NEWS-MONITOR] Articles found for query:', articles.length)
        newsArticles.push(...articles)
      }

      // FALLBACK: If all queries return 0, try broad "Mexico" query.
      if (newsArticles.length === 0 && newsDataKey) {
        console.log('[NEWS-MONITOR] All queries returned 0 — fallback: q=Mexico')
        const fallbackArticles = await fetchNewsData('Mexico', 10, {})
        newsArticles.push(...fallbackArticles)
      }
    }

    const dedupedArticles = deduplicateArticles(newsArticles)
    console.log('[NEWS-MONITOR] Articles fetched (deduped):', dedupedArticles.length, '(NEWSDATA_API_KEY:', !!newsDataKey, 'GNEWS_API_KEY:', !!gnewsKey, ')')

    const systemMessage = `You are a news analyst for Crowd Conscious, a free-to-play opinion platform in Mexico City. Analyze news stories and identify which ones are relevant to our active markets. Also suggest new market ideas based on trending news. Write in Spanish for the main content.`

    const hasArticles = dedupedArticles.length > 0
    const briefInstruction = hasArticles
      ? `3. BRIEF: Write a 3-sentence summary of today's most relevant news for our audience (Mexico City, World Cup, economy, sustainability). Use the actual news stories provided.`
      : `3. BRIEF: Since no external news articles were provided, write a 3-sentence summary of what's trending on our active markets and what our Mexico City audience should watch. Focus on World Cup 2026, economy (Banxico, employment), sustainability, and local issues. Make it engaging and useful—never say "no hay noticias" or "no recent news."`

    const userMessage = `Active markets on our platform:
${JSON.stringify(activeMarkets.map((m) => ({ title: m.title, category: m.category, tags: m.tags })), null, 2)}

Recent news stories:
${JSON.stringify(dedupedArticles.map((a) => ({ title: a.title, description: a.description, source: a.source, url: a.url })), null, 2)}

Do three things:
1. RELEVANCE CHECK: For each active market, list any news stories that are relevant to it (by title/url). Rate relevance 1-5.
2. MARKET SUGGESTIONS: Based on stories NOT related to existing markets (or from active markets if no stories), suggest up to 3 new market ideas. REQUIRED: every suggestion MUST have ALL of these fields:
   - title: question format in Spanish (e.g. "¿Superará el desempleo en México el 4% durante 2026?")
   - title_en: English translation of the title
   - category: one of world_cup, world, government, sustainability, corporate, community, cause
   - description: 2-4 sentences of context in Spanish (why it matters, who cares, what's at stake)
   - description_en: English translation of the description
   - resolution_criteria: how to resolve in Spanish (official source, date, threshold)
   - resolution_criteria_en: English translation of resolution criteria
   - resolution_date: suggested date (YYYY-MM-DD)
   - source_urls: array of {url, label} - use URLs from the news stories when available; if no stories, use placeholder URLs like https://example.com/source
   - tags: comma-separated keywords in Spanish (e.g. "economia, banxico, empleo")
   - why_interesting: 1 sentence on engagement potential
${briefInstruction}

Return as JSON: { relevance: [...], suggestions: [...], brief: '...' }`

    const userPrompt = userMessage?.trim() ?? ''
    if (!userPrompt) {
      console.error('[News Monitor] Empty prompt, skipping API call')
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'empty_prompt' },
      })
      return { success: false, error: 'empty_prompt' }
    }

    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: TOKEN_LIMITS.NEWS,
      system: systemMessage,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let parsed: { relevance?: unknown[]; suggestions?: unknown[]; brief?: string }
    try {
      const raw = parseAgentJSON(rawText)
      // parseAgentJSON may return [obj] when JSON is wrapped; unwrap for object responses
      parsed = Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object'
        ? (raw[0] as { relevance?: unknown[]; suggestions?: unknown[]; brief?: string })
        : (raw as { relevance?: unknown[]; suggestions?: unknown[]; brief?: string })
    } catch (e) {
      console.error('News monitor parse error:', e)
      await logAgentRun({
        agentName: 'news-monitor',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `JSON parse failed: ${String(e)}`,
        summary: { articles_fetched: dedupedArticles.length },
      })
      return { success: false, error: `Parse failed: ${String(e)}` }
    }

    const relevance = Array.isArray(parsed.relevance) ? parsed.relevance : []
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const brief = String(parsed.brief ?? '').trim()

    console.log('[NEWS-MONITOR] Parsed:', { suggestionsCount: suggestions.length, briefLen: brief.length, hasRelevance: relevance.length > 0 })
    console.log('[NEWS-MONITOR] Brief preview:', brief.slice(0, 150) + (brief.length > 150 ? '...' : ''))

    let briefSaved = false
    let suggestionsSaved = 0
    let relevanceSaved = false

    // When Articles: 0, the fallback prompt is our ONLY output — we must save it.
    // When Articles > 0, we can be slightly more selective.
    // Never block substantive analysis that mentions "no recent news" in passing
    // (e.g. "No recent news in the feed, but our markets reflect Mexico City, Banxico, World Cup...").
    const hasNoArticles = dedupedArticles.length === 0
    const isPurelyNoNews = /^(no hay noticias|no recent news|no news in the feed|empty feed)[.\s]*$/i.test(brief.trim())
    const isNoNewsPlaceholder = hasNoArticles
      ? !brief || brief.length < 40
      : !brief ||
        brief.length < 60 ||
        (brief.length < 120 && (isPurelyNoNews || /no hay noticias|no recent news|no news in the feed|empty feed/i.test(brief)))

    if (isNoNewsPlaceholder) {
      console.log('[NEWS-MONITOR] Brief rejected as placeholder:', { briefLen: brief.length, hasNoArticles, isPurelyNoNews, reason: !brief ? 'empty' : brief.length < (hasNoArticles ? 40 : 60) ? 'too_short' : 'short_and_contains_no_news' })
    }

    if (brief && !isNoNewsPlaceholder) {
      console.log('[NEWS-MONITOR] Saving to agent_content (published: true)...')
      const { data: insertData, error: briefErr } = await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Resumen de noticias del día',
        body: brief,
        language: 'es',
        metadata: { type: 'news_brief', model: MODELS.FAST, tokens_input: usage.input_tokens, tokens_output: usage.output_tokens },
        published: true,
      })
      .select('id')
      .single()
      if (briefErr) {
        console.error('[NEWS-MONITOR] Failed to save brief:', briefErr)
        throw new Error(`Failed to save brief: ${briefErr.message}`)
      }
      console.log('[NEWS-MONITOR] Insert result:', insertData ? { id: insertData.id } : 'no data')
      briefSaved = true
    }

    for (const s of suggestions) {
      if (!s || typeof s !== 'object') continue
      const obj = s as Record<string, unknown>
      const title = String(obj.title ?? 'Nueva sugerencia')
      const { error: sugErr } = await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'market_insight',
        title,
        body: JSON.stringify(obj),
        language: 'es',
        metadata: { type: 'market_suggestion', model: MODELS.FAST },
        published: false,
      })
      if (sugErr) {
        console.error('[News Monitor] Failed to save suggestion:', sugErr)
        throw new Error(`Failed to save suggestion: ${sugErr.message}`)
      }
      suggestionsSaved++
    }

    if (relevance.length > 0) {
      const { error: relErr } = await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'news_summary',
        title: 'Relevancia noticias-mercados',
        body: JSON.stringify(relevance),
        language: 'es',
        metadata: { type: 'news_relevance', model: MODELS.FAST },
        published: false,
      })
      if (relErr) {
        console.error('[News Monitor] Failed to save relevance:', relErr)
        // Non-fatal: relevance is optional
      } else {
        relevanceSaved = true
      }
    }

    await logAgentRun({
      agentName: 'news-monitor',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        articles_fetched: dedupedArticles.length,
        brief_saved: briefSaved,
        suggestions_saved: suggestionsSaved,
        relevance_saved: relevanceSaved,
      },
    })

    return {
      success: true,
      summary: {
        articles_fetched: dedupedArticles.length,
        brief_saved: briefSaved,
        suggestions_saved: suggestionsSaved,
        relevance_saved: relevanceSaved,
      },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as { status?: number; error?: { type?: string; error?: { message?: string }; message?: string }; message?: string }
    console.error('[News Monitor] Anthropic API error:', JSON.stringify({
      status: apiErr?.status,
      type: apiErr?.error?.type,
      message: apiErr?.error?.error?.message ?? apiErr?.error?.message ?? apiErr?.message,
      full: apiErr?.error ?? apiErr,
    }, null, 2))
    console.error('News monitor agent error:', err)

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
