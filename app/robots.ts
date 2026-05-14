import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/og/'],
      disallow: [
        '/api/',
        '/admin/',
        '/dashboard/',
        '/settings/',
        '/profile/',
        '/notifications/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
