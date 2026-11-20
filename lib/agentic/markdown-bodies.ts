import { SITE_URL } from '@/lib/seo/site'

const BASE = () => SITE_URL.replace(/\/$/, '')

/** Homepage Markdown body for Accept: text/markdown negotiation. */
export function homepageMarkdown(): string {
  const base = BASE()
  return [
    '# Crowd Conscious',
    '',
    '> Consultas públicas con confianza ponderada — tu voto y tu certeza importan.',
    '',
    'Crowd Conscious is a Mexico City civic journalism and collective-intelligence platform.',
    'We publish sourced investigations and run public consultations (Pulses) whose results',
    'are weighted by each person\'s stated confidence — not only by headcount.',
    '20% of every Organizations contract (before VAT) goes to the Fondo Consciente.',
    '',
    '## Main entry points',
    '',
    `- [Investigations / Blog](${base}/blog)`,
    `- [Active Pulses](${base}/pulse)`,
    `- [About](${base}/about)`,
    `- [Conscious Live](${base}/live)`,
    `- [Agent map (llms.txt)](${base}/llms.txt)`,
    `- [Sitemap](${base}/sitemap.xml)`,
    '',
  ].join('\n')
}

/** Markdown 404 body — must stay ≥20 chars and link sitemap / llms.txt. */
export function notFoundMarkdown(pathname?: string): string {
  const base = BASE()
  const pathLine = pathname
    ? `The path \`${pathname}\` was not found on Crowd Conscious.`
    : 'The requested path was not found on Crowd Conscious.'
  return [
    '# Not found',
    '',
    pathLine,
    '',
    'This URL is not a public Crowd Conscious page. Try:',
    '',
    `- [Sitemap](${base}/sitemap.xml)`,
    `- [Agent map (llms.txt)](${base}/llms.txt)`,
    `- [Home](${base}/)`,
    `- [Investigations](${base}/blog)`,
    '',
  ].join('\n')
}

export type BlogMarkdownInput = {
  title: string
  description?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  categoryLabel?: string | null
  slug: string
  content?: string | null
}

/** Investigation / blog post Markdown for Accept: text/markdown. */
export function blogPostMarkdown(post: BlogMarkdownInput): string {
  const base = BASE()
  const url = `${base}/blog/${post.slug}`
  const lines = [
    `# ${post.title}`,
    '',
    `URL: ${url}`,
  ]
  if (post.publishedAt) lines.push(`Published: ${post.publishedAt}`)
  if (post.updatedAt) lines.push(`Updated: ${post.updatedAt}`)
  if (post.categoryLabel) lines.push(`Category: ${post.categoryLabel}`)
  lines.push('', `Publisher: Crowd Conscious (${base}/)`, '')
  if (post.description?.trim()) {
    lines.push('## Summary', '', post.description.trim(), '')
  }
  if (post.content?.trim()) {
    lines.push('## Article', '', post.content.trim(), '')
  } else {
    lines.push(
      `Full article HTML: ${url}`,
      '',
      `See also [llms.txt](${base}/llms.txt) and the [sitemap](${base}/sitemap.xml).`,
      ''
    )
  }
  return lines.join('\n')
}

export function markdownResponseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/markdown; charset=utf-8',
    Vary: 'Accept',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  }
}
