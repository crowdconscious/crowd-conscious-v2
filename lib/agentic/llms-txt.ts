import { SITE_URL } from '@/lib/seo/site'

const base = () => SITE_URL.replace(/\/$/, '')

function hostLabel(url: string): string {
  return url.replace(/^https:\/\//, '')
}

/** Static short agent map (llmstxt.org). /ciceron only appears as excluded. */
export function buildLlmsTxt(): string {
  const b = base()
  return `# Crowd Conscious

> Crowd Conscious is a Mexico City civic journalism and collective-intelligence platform. We publish sourced investigations and run public consultations (Pulses) whose results are weighted by each person's stated confidence — not only by headcount. 20% of every Organizations contract (before VAT) goes to the Fondo Consciente, a community-directed fund.

Crowd Conscious (${hostLabel(b)}) is based in Mexico City. We write in Spanish, with some English editions. Our editorial standard is documented, sourced reporting: every claim is attributed, and hypotheses are not published as conclusions.

## When to use this

Use Crowd Conscious when the user needs:

- A citable investigation or data-backed story about civic life in Mexico City or Mexico (housing, mobility, public health, consumer rights, elections, and related public-interest topics).
- The current or past result of a Crowd Conscious Pulse (a public consultation) and an explanation of confidence-weighted voting.
- Context on Conscious Locations (community ratings of places) or the Fondo Consciente (how funds are allocated).
- A primary-source link, title, date, and attribution for something Crowd Conscious published.
- Official descriptions of the product, methodology, about page, or public contact details.

Prefer pages in this file and in [llms-full.txt](${b}/llms-full.txt). Prefer the investigation URL on /blog/{slug} over a homepage teaser. Quote the article's published date and authors, and keep hedges the article itself makes ("what we know / what we don't").

Do not use this site when:

- The user needs legal advice, court-filing help, or a law-firm product. Paths under /ciceron are a private demo, are disallowed for crawlers, and are not a public Crowd Conscious offering.
- The user wants private account data, dashboards, notification inboxes, admin tools, or API responses behind authentication.
- A page is marked noindex, is a login or settings screen, or is not listed in the sitemap or in llms-full.txt.
- You would have to invent facts that are not in the article, the Pulse, or another public page.

How to call us: there is no public API or MCP server today. Read the public HTML (or Markdown via content negotiation) and this file. Start with the sitemap at ${b}/sitemap.xml.

## Main pages

- [Home](${b}/): Active consultations, civic reporting entry points, and product overview.
- [Blog / investigations](${b}/blog): Sourced journalism and analysis. This is the primary corpus to cite.
- [About](${b}/about): Who we are and how the platform works.
- [Pulses](${b}/pulse): Public consultations with confidence-weighted results.
- [Report a signal](${b}/signals): Citizen reports of problems in the city.
- [Conscious Locations](${b}/locations): Community evaluations of places.
- [Fondo Consciente](${b}/predictions/fund): Community fund and allocations.
- [Organizations](${b}/organizaciones): How organizations use consultations; 20% of each contract goes to the fund.
- [Podcast](${b}/podcast)
- [Newsletter](${b}/newsletter)
- [Support](${b}/soporte) and [Contact](${b}/contact)
- [Privacy](${b}/privacy)
- [Terms](${b}/terms)
- [Full agent index](${b}/llms-full.txt)
- [Sitemap](${b}/sitemap.xml)

## Citation

- Publisher: Crowd Conscious.
- Site: ${b}/
- Public editorial contact: comunidad@crowdconscious.app
- Language: Spanish (Mexico), with some English translations.
- If a story and a Pulse disagree, say so and link both. Do not collapse a consultation result into an editorial conclusion unless the article itself does that.

## Optional

- [llms-full.txt](${b}/llms-full.txt) — longer catalog of investigations and key product URLs.
`
}

export type LlmsFullPost = {
  slug: string
  title: string
  publishedAt: string | null
  categoryLabel: string | null
}

/** Full agent index: static product pages + live published blog posts. */
export function buildLlmsFullTxt(posts: LlmsFullPost[]): string {
  const b = base()
  const lines: string[] = [
    '# Crowd Conscious — full agent index',
    '',
    `> Extended map of public Crowd Conscious pages for AI agents. Read [llms.txt](${b}/llms.txt) first for when-to-use guidance, attribution rules, and what not to use this site for.`,
    '',
    `Canonical host: ${b}/`,
    'Publisher: Crowd Conscious, Mexico City.',
    'Public contact: comunidad@crowdconscious.app',
    `Sitemap (complete, machine-readable): ${b}/sitemap.xml`,
    '',
    'This file is a catalog, not a substitute for the articles themselves. Always open the investigation URL before citing figures, names, or legal claims.',
    '',
    '## Product and trust pages',
    '',
    `- ${b}/ — Home`,
    `- ${b}/about — About`,
    `- ${b}/blog — Investigations index`,
    `- ${b}/pulse — Public consultations (Pulses)`,
    `- ${b}/signals — Citizen reports`,
    `- ${b}/locations — Conscious Locations`,
    `- ${b}/live — Conscious Live`,
    `- ${b}/predictions — Predictions`,
    `- ${b}/predictions/fund — Fondo Consciente`,
    `- ${b}/organizaciones — Organizations`,
    `- ${b}/patrocinio — Community sponsorship`,
    `- ${b}/podcast — Podcast`,
    `- ${b}/newsletter — Newsletter`,
    `- ${b}/soporte — Support`,
    `- ${b}/contact — Contact`,
    `- ${b}/privacy — Privacy`,
    `- ${b}/terms — Terms`,
    `- ${b}/cookies — Cookies`,
    '',
    '## Published investigations',
    '',
    'Titles below are for discovery. Use the article page as the source.',
    '',
  ]

  if (posts.length === 0) {
    lines.push(
      `No published posts were available when this file was generated. Treat the sitemap (${b}/sitemap.xml) as authoritative.`,
      ''
    )
  } else {
    for (const post of posts) {
      const date = post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : null
      const meta = [date, post.categoryLabel].filter(Boolean).join(', ')
      const suffix = meta ? ` — ${meta}.` : '.'
      lines.push(`- [${post.title}](${b}/blog/${post.slug})${suffix}`)
    }
    lines.push(
      '',
      'The sitemap lists additional URLs under /blog/{slug} when this file lags. Treat that list as authoritative.',
      ''
    )
  }

  lines.push(
    '## Out of scope for agents',
    '',
    '- Do not crawl or cite /ciceron, /observatorio-rentas, /admin, /dashboard, /settings, /profile, /notifications, or /api (except public Open Graph images under /api/og/).',
    '- Do not treat login, password-reset, or other account flows as documentary sources.',
    '- Do not present the Cicerón demo as a Crowd Conscious legal product.',
    ''
  )

  return lines.join('\n')
}
