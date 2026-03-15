import Parser from 'rss-parser'
import { RSS_FEEDS, Signal } from '../sources-config'

const parser = new Parser({ timeout: 10000 })
const SIX_HOURS = 6 * 60 * 60 * 1000

export async function fetchRSSSignals(
  categories?: string[],
  maxAge: number = SIX_HOURS
): Promise<Signal[]> {
  const feeds = categories
    ? RSS_FEEDS.filter((f) => categories.includes(f.category))
    : RSS_FEEDS

  const results: Signal[] = []
  let errors = 0
  const cutoff = new Date(Date.now() - maxAge)

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const item of (parsed.items || []).slice(0, 10)) {
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date()
        if (pubDate < cutoff) continue

        results.push({
          source_type: 'rss',
          source_name: feed.name,
          category: feed.category,
          title: (item.title || '').trim(),
          text: (item.contentSnippet || item.content || item.summary || '')
            .trim()
            .substring(0, 500),
          url: item.link,
          published_at: pubDate.toISOString(),
        })
      }
    } catch (err) {
      errors++
      console.warn(`[RSS] Failed to fetch ${feed.name}:`, err instanceof Error ? err.message : err)
    }
  }

  // Deduplicate by title similarity (>80% word overlap)
  const deduped = deduplicateSignals(results)

  // Sort by date, limit
  deduped.sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  )

  console.log(
    `[RSS] Fetched ${deduped.length} articles from ${feeds.length - errors}/${feeds.length} feeds`
  )
  return deduped.slice(0, 50)
}

function deduplicateSignals(signals: Signal[]): Signal[] {
  const seen: Signal[] = []
  for (const signal of signals) {
    const words = new Set(signal.title.toLowerCase().split(/\s+/))
    const isDupe = seen.some((s) => {
      const sWords = new Set(s.title.toLowerCase().split(/\s+/))
      const overlap = [...words].filter(
        (w) => sWords.has(w) && w.length > 3
      ).length
      return overlap / Math.max(words.size, sWords.size) > 0.8
    })
    if (!isDupe) seen.push(signal)
  }
  return seen
}
