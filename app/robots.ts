import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

const ALLOW = ['/', '/api/og/'] as const

/**
 * Private / demo paths. Named AI crawler groups must repeat these —
 * robots.txt groups do not inherit from User-agent: *.
 */
const DISALLOW = [
  '/api/',
  '/admin/',
  '/dashboard/',
  '/settings/',
  '/profile/',
  '/notifications/',
  '/auth/',
  '/login',
  '/forgot-password',
  '/reset-password',
  // Meeting demo (simulated data): hidden from crawlers; pages also send noindex/nofollow.
  '/observatorio-rentas',
  // Cicéron legal demo: noindex; pages also send robots noindex/nofollow.
  '/ciceron',
] as const

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-User',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'Amazonbot',
] as const

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [...ALLOW],
        disallow: [...DISALLOW],
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: [...ALLOW],
        disallow: [...DISALLOW],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
