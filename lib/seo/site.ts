/**
 * Canonical site origin for metadata, sitemap, and JSON-LD.
 * Default www so sitemap <loc> and robots Sitemap agree with the live host
 * (apex 307-redirects to www). Env still wins if set.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.crowdconscious.app'
