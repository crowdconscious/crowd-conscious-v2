import { SITE_URL } from '@/lib/seo/site'

const base = () => SITE_URL.replace(/\/$/, '')

/** Categories that read as essays / opinion → schema.org Article. */
const ARTICLE_CATEGORIES = new Set([
  'insight',
  'culture',
  'consciousness',
  'creators',
])

export function blogSchemaType(category: string | null | undefined): 'NewsArticle' | 'Article' {
  if (category && ARTICLE_CATEGORIES.has(category)) return 'Article'
  return 'NewsArticle'
}

export type BlogArticleJsonLdInput = {
  slug: string
  headline: string
  description: string
  datePublished?: string | null
  dateModified?: string | null
  category?: string | null
  inLanguage?: 'es-MX' | 'en'
  /** Prefer Person when a named human author exists. */
  authorName?: string | null
}

export function buildBlogArticleJsonLd(input: BlogArticleJsonLdInput): Record<string, unknown> {
  const b = base()
  const url = `${b}/blog/${input.slug}`
  const type = blogSchemaType(input.category)
  const authorName = input.authorName?.trim()
  const author = authorName
    ? { '@type': 'Person', name: authorName }
    : { '@type': 'Organization', name: 'Crowd Conscious', url: b }

  return {
    '@context': 'https://schema.org',
    '@type': type,
    headline: input.headline,
    description: input.description,
    url,
    mainEntityOfPage: url,
    inLanguage: input.inLanguage ?? 'es-MX',
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? input.datePublished ?? undefined,
    image: [`${b}/api/og/blog/${encodeURIComponent(input.slug)}`],
    author,
    publisher: {
      '@type': 'Organization',
      name: 'Crowd Conscious',
      url: b,
      logo: {
        '@type': 'ImageObject',
        url: `${b}/images/logo-small.png`,
      },
    },
    isAccessibleForFree: true,
  }
}

export function buildBlogBreadcrumbJsonLd(input: {
  slug: string
  title: string
}): Record<string, unknown> {
  const b = base()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: `${b}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${b}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: input.title,
        item: `${b}/blog/${input.slug}`,
      },
    ],
  }
}

export function buildBlogCollectionJsonLd(): Record<string, unknown> {
  const b = base()
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Blog | Crowd Conscious',
    url: `${b}/blog`,
    isPartOf: { '@type': 'WebSite', url: b },
  }
}
