import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/seo/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const [{ data: markets }, { data: events }] = await Promise.all([
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

  return [...staticPages, ...marketPages, ...eventPages]
}
