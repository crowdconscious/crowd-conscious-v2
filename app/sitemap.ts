import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/seo/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: markets }, { data: events }, { data: posts }] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, updated_at')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('live_events')
      .select('id, updated_at')
      .neq('status', 'cancelled')
      .order('match_date', { ascending: false }),
    supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
  ])

  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/sponsor`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${SITE_URL}/markets`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    {
      url: `${SITE_URL}/predictions/leaderboard`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/predictions/fund`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/predictions/markets`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.85,
    },
    { url: `${SITE_URL}/live`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/newsletter`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.25 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const marketPages: MetadataRoute.Sitemap = (markets ?? []).map((m) => ({
    url: `${SITE_URL}/predictions/markets/${m.id}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }))

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${SITE_URL}/live/${e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: 'hourly' as const,
    priority: 0.85,
  }))

  const blogPostPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : p.published_at ? new Date(p.published_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...marketPages, ...eventPages, ...blogPostPages]
}
