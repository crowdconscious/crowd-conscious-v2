import { ApifyClient } from 'apify-client'
import {
  TWITTER_ACCOUNTS,
  INSTAGRAM_ACCOUNTS,
  Signal,
} from '../sources-config'
import { getSupabaseAdmin } from '@/lib/agents/config'

const TWO_HOURS_MS = 2 * 60 * 60 * 1000
const TWITTER_TIMEOUT_MS = 60_000
const INSTAGRAM_TIMEOUT_MS = 90_000

// Build handle→category lookup
const TWITTER_BY_HANDLE = Object.fromEntries(
  TWITTER_ACCOUNTS.map((a) => [a.handle.toLowerCase(), a])
)
const INSTAGRAM_BY_HANDLE = Object.fromEntries(
  INSTAGRAM_ACCOUNTS.map((a) => [a.handle.toLowerCase(), a])
)

/**
 * Check if we should skip social scraping (budget: max 1 run per 2 hours).
 */
async function shouldSkipSocialScrape(): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('agent_content')
      .select('created_at')
      .eq('agent_type', 'news_monitor')
      .eq('content_type', 'social_scrape_log')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('[SOCIAL] Error checking last scrape:', error.message)
      return false // allow run on DB error to avoid blocking
    }
    if (!data?.created_at) return false

    const lastAt = new Date(data.created_at).getTime()
    const elapsed = Date.now() - lastAt
    if (elapsed < TWO_HOURS_MS) {
      console.log(
        `[SOCIAL] Skipping: last scrape ${Math.round(elapsed / 60000)} min ago (< 2h)`
      )
      return true
    }
    return false
  } catch (e) {
    console.warn('[SOCIAL] shouldSkipSocialScrape error:', e)
    return false
  }
}

/**
 * Save a log entry after successful social scrape (for budget throttling).
 */
async function saveSocialScrapeLog(counts: {
  twitter: number
  instagram: number
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('agent_content').insert({
      market_id: null,
      agent_type: 'news_monitor',
      content_type: 'social_scrape_log',
      title: 'Social scrape completed',
      body: JSON.stringify(counts),
      language: 'es',
      metadata: { type: 'social_scrape_log' },
      published: false,
    })
    if (error) {
      console.warn('[SOCIAL] Failed to save scrape log:', error.message)
    }
  } catch (e) {
    console.warn('[SOCIAL] saveSocialScrapeLog error:', e)
  }
}

/**
 * Fetch tweets from high-priority Twitter accounts via Apify.
 */
async function fetchTwitterSignals(
  client: ApifyClient,
  categories?: string[]
): Promise<Signal[]> {
  const high = TWITTER_ACCOUNTS.filter((a) => a.priority === 'high')
  let accounts = high
  if (categories?.length) {
    accounts = high.filter((a) => categories.includes(a.category))
  }
  if (accounts.length === 0) return []

  // Batch of 5 handles per query (budget: maxItems 30)
  const BATCH_SIZE = 5
  const batches: string[][] = []
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    batches.push(accounts.slice(i, i + BATCH_SIZE).map((a) => a.handle))
  }

  const allSignals: Signal[] = []
  for (const batch of batches) {
    const searchTerms = batch.map((h) => `from:${h}`)
    const query = searchTerms.join(' OR ')

    try {
      const run = await client
        .actor('apidojo/tweet-scraper')
        .call(
          {
            searchTerms: [query],
            maxItems: 30,
            sort: 'Latest',
          },
          { timeout: Math.floor(TWITTER_TIMEOUT_MS / 1000) }
        )

      const { items } = await client.dataset(run.defaultDatasetId).listItems()
      for (const item of items || []) {
        const t = item as {
          text?: string
          author?: { userName?: string }
          likeCount?: number
          retweetCount?: number
          replyCount?: number
          createdAt?: string
          url?: string
        }
        const username = (t.author?.userName ?? '').toLowerCase()
        const config = TWITTER_BY_HANDLE[username]
        const engagement =
          (t.likeCount ?? 0) + (t.retweetCount ?? 0) + (t.replyCount ?? 0)

        allSignals.push({
          source_type: 'twitter',
          source_name: t.author?.userName ?? username,
          category: config?.category ?? 'general',
          title: (t.text ?? '').substring(0, 100),
          text: (t.text ?? '').trim().substring(0, 500),
          url: t.url,
          published_at: t.createdAt
            ? new Date(t.createdAt).toISOString()
            : new Date().toISOString(),
          engagement,
        })
      }
    } catch (err) {
      console.warn(
        '[SOCIAL] Twitter scrape failed:',
        err instanceof Error ? err.message : err
      )
      // Continue with other batches / Instagram
    }
  }

  return allSignals
}

/**
 * Fetch Instagram posts from high-priority accounts via Apify.
 */
async function fetchInstagramSignals(
  client: ApifyClient,
  categories?: string[]
): Promise<Signal[]> {
  const high = INSTAGRAM_ACCOUNTS.filter((a) => a.priority === 'high')
  let accounts = high
  if (categories?.length) {
    accounts = high.filter((a) => categories.includes(a.category))
  }
  if (accounts.length === 0) return []

  const usernames = accounts.slice(0, 4).map((a) => a.handle) // 4 accounts × 3 posts = 12 results

  try {
    const run = await client
      .actor('apify/instagram-post-scraper')
      .call(
        {
          username: usernames,
          resultsLimit: 3,
        },
        { timeout: Math.floor(INSTAGRAM_TIMEOUT_MS / 1000) }
      )

    const { items } = await client.dataset(run.defaultDatasetId).listItems()
    const signals: Signal[] = []

    for (const item of items || []) {
      const p = item as {
        caption?: string
        ownerUsername?: string
        likesCount?: number
        commentsCount?: number
        timestamp?: string
        url?: string
      }
      const username = (p.ownerUsername ?? '').toLowerCase()
      const config = INSTAGRAM_BY_HANDLE[username]
      const likes = Math.max(0, p.likesCount ?? 0)
      const comments = Math.max(0, p.commentsCount ?? 0)
      const engagement = likes + comments

      signals.push({
        source_type: 'instagram',
        source_name: p.ownerUsername ?? username,
        category: config?.category ?? 'general',
        title: (p.caption ?? '').substring(0, 100),
        text: (p.caption ?? '').trim().substring(0, 500),
        url: p.url,
        published_at: p.timestamp
          ? new Date(p.timestamp).toISOString()
          : new Date().toISOString(),
        engagement,
      })
    }

    return signals
  } catch (err) {
    console.warn(
      '[SOCIAL] Instagram scrape failed:',
      err instanceof Error ? err.message : err
    )
    return []
  }
}

/**
 * Fetch social signals from Twitter and Instagram via Apify.
 * Budget: only runs if 2+ hours since last scrape. Merges, sorts by engagement, returns top 30.
 */
export async function fetchSocialSignals(
  categories?: string[]
): Promise<Signal[]> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    console.warn(
      '[SOCIAL] APIFY_API_TOKEN not set. Add it to .env.local and Vercel env vars. Get from apify.com/account/integrations'
    )
    return []
  }

  if (await shouldSkipSocialScrape()) {
    return []
  }

  const client = new ApifyClient({ token })
  const results: Signal[] = []

  try {
    const [twitterSignals, instagramSignals] = await Promise.all([
      fetchTwitterSignals(client, categories),
      fetchInstagramSignals(client, categories),
    ])

    results.push(...twitterSignals, ...instagramSignals)

    // Sort by engagement DESC, take top 30
    results.sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0))
    const top = results.slice(0, 30)

    await saveSocialScrapeLog({
      twitter: twitterSignals.length,
      instagram: instagramSignals.length,
    })

    console.log(
      `[SOCIAL] Fetched ${twitterSignals.length} Twitter + ${instagramSignals.length} Instagram → top ${top.length}`
    )
    return top
  } catch (err) {
    console.warn(
      '[SOCIAL] fetchSocialSignals error:',
      err instanceof Error ? err.message : err
    )
    return results // return whatever we got
  }
}
