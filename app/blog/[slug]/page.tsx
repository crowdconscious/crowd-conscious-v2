import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { BlogByline } from '@/components/blog/BlogByline'
import { BlogSources } from '@/components/blog/BlogSources'
import {
  BlogSponsorCard,
  SponsorShoutout,
  SponsorBylineCredit,
  type BlogSponsorData,
} from '@/components/sponsor/BlogSponsorCard'
import { isSponsorshipTier, sponsorSlotPlan } from '@/lib/sponsorship-tiers'
import { getCreatorCopy } from '@/lib/i18n/creator'
import { canManageBlogPost } from '@/lib/auth/blog-post-access'
import { SITE_URL } from '@/lib/seo/site'
import { BlogPostBody } from './BlogPostBody'
import { BlogDraftBar } from './BlogDraftBar'
import { EmbeddedMarketCard } from '@/components/blog/EmbeddedMarketCard'
import { BlogComments } from '@/components/blog/BlogComments'
import { BlogSoftSignupCta } from './BlogSoftSignupCta'
import { BlogShareButton } from '@/components/blog/BlogShareButton'
import PulseEmbed from '@/components/blog/PulseEmbed'
import { splitMarkdownForPulseEmbed } from '@/lib/blog-pulse-insert'
import { fetchPulseEmbedDataForBlog } from '@/lib/blog-fetch-pulse-embed'
import { normalizePulseEmbedComponents, parsePulseEmbedPosition } from '@/lib/pulse-embed-constants'
import BlogTldrCard from '@/components/blog/BlogTldrCard'
import BlogPulseStickyCta from '@/components/blog/BlogPulseStickyCta'
import BlogCoverWithQuestion from '@/components/blog/BlogCoverWithQuestion'
import { getMarketText } from '@/lib/i18n/market-translations'

const PULSE_EMBED_ANCHOR_ID = 'pulse-vote'

type Props = { params: Promise<{ slug: string }> }

const CATEGORY_LABEL: Record<string, { en: string; es: string }> = {
  insight: { en: 'Insight', es: 'Insight' },
  pulse_analysis: { en: 'Pulse analysis', es: 'Análisis Pulse' },
  market_story: { en: 'Market story', es: 'Historia de mercado' },
  world_cup: { en: 'World Cup', es: 'Mundial' },
  behind_data: { en: 'Behind the data', es: 'Detrás de los datos' },
}

function formatDate(iso: string | null, locale: 'en' | 'es') {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select(
      'title, title_en, meta_title, meta_description, excerpt, excerpt_en, tldr, tldr_en, cover_image_url, published_at, updated_at, pulse_market_id'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) {
    return { title: locale === 'en' ? 'Article' : 'Artículo' }
  }

  const headTitle =
    locale === 'en' && post.title_en?.trim()
      ? post.title_en
      : post.meta_title || post.title
  const title = headTitle

  // Description priority for share previews:
  //   1. Author-set meta_description (explicit override)
  //   2. TL;DR (joined into a single line — purpose-built for share blurbs)
  //   3. Excerpt (the historic fallback)
  // We prefer TL;DR over excerpt because it's denser, action-oriented, and
  // matches what a share-receiver actually needs to decide whether to click.
  const tldrRaw =
    locale === 'en' && post.tldr_en?.trim()
      ? post.tldr_en
      : post.tldr?.trim() || null
  const tldrSingleLine = tldrRaw
    ? tldrRaw
        .split(/\r?\n+/)
        .map((l: string) => l.replace(/^\s*[-*•·]\s*/, '').trim())
        .filter((l: string) => l.length > 0)
        .join(' · ')
    : null

  const description =
    post.meta_description ||
    tldrSingleLine ||
    (locale === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt)

  /**
   * og:image — always the dynamic /api/og/blog/[slug] endpoint.
   *
   * Why this is the source of truth (and not cover_image_url):
   *   - Editor-uploaded covers come in any aspect ratio + dimension.
   *     WhatsApp / Facebook downgrade to the small thumbnail layout
   *     when the image is < 600×315, and Instagram drops the preview
   *     entirely. The dynamic endpoint always returns a 1200×630 PNG.
   *   - Even when a cover is large enough, declaring explicit width /
   *     height / type in the meta tag is what convinces scrapers to
   *     render the large-preview variant. The dynamic URL guarantees
   *     those dimensions match reality.
   *   - The endpoint itself decides whether to use the cover photo as
   *     a background (Layout 2 in route.tsx) or fall back to a title
   *     card. So the editorial photo still shows up in the preview —
   *     just inside a frame that's always the right size.
   */
  const ogImage = `${SITE_URL}/api/og/blog/${encodeURIComponent(slug)}${
    locale === 'en' ? '?lang=en' : ''
  }`

  const canonicalUrl = `${SITE_URL}/blog/${slug}`
  const ogLocale = locale === 'en' ? 'en_US' : 'es_MX'

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description: description.slice(0, 200),
      url: canonicalUrl,
      siteName: 'Crowd Conscious',
      type: 'article',
      locale: ogLocale,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? post.published_at ?? undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  }
}

export default async function BlogPostPage(props: Props) {
  const { slug } = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const supabase = await createClient()

  const user = await getCurrentUser()
  const isBlogEditor = isBlogEditorUser(user)
  const profile = user
    ? (
        await supabase.from('profiles').select('user_type, email').eq('id', user.id).maybeSingle()
      ).data
    : null

  const { data: publishedPost } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  let post = publishedPost
  if (!post && isBlogEditor && user) {
    const { data: draftRow } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle()
    if (draftRow && canManageBlogPost(profile, user.id, draftRow)) {
      post = draftRow
    }
  }

  if (!post) notFound()

  if (post.status === 'published') {
    void supabase.rpc('increment_blog_post_view', { p_slug: slug }).then(() => {})
  }

  const isAuthenticated = !!user

  // Author byline data. Posts with an influencer author render a "Creador"
  // badge; legacy/platform posts (no author_id) render "Editorial".
  const authorId = (post as { author_id?: string | null }).author_id ?? null
  let bylineName: string | null = null
  let bylineAvatar: string | null = null
  let bylineRole: 'creator' | 'editorial' = 'editorial'

  // Active sponsor card data. creator_sponsorships has no public RLS read, so
  // we read it server-side with the admin client (read-only, scoped to this
  // published post). The webhook writes the row; we only render it.
  let sponsorData: BlogSponsorData | null = null

  if (post.status === 'published' || authorId) {
    const admin = createAdminClient()
    if (authorId) {
      const { data: author } = await admin
        .from('profiles')
        .select('full_name, avatar_url, user_type')
        .eq('id', authorId)
        .maybeSingle()
      if (author) {
        bylineName = author.full_name ?? null
        bylineAvatar = author.avatar_url ?? null
        bylineRole = author.user_type === 'influencer' ? 'creator' : 'editorial'
      }
    }
    if (post.status === 'published') {
      const { data: sponsorship } = await admin
        .from('creator_sponsorships')
        .select('sponsor_name, sponsor_logo_url, sponsor_contact, tier, supporter_message')
        .eq('surface_type', 'blog')
        .eq('source_id', post.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sponsorship?.sponsor_name) {
        const tierRaw = (sponsorship as { tier?: string | null }).tier ?? null
        sponsorData = {
          sponsorName: sponsorship.sponsor_name,
          logoUrl: sponsorship.sponsor_logo_url ?? null,
          targetUrl: sponsorship.sponsor_contact ?? null,
          tier: isSponsorshipTier(tierRaw) ? tierRaw : null,
          supporterMessage:
            (sponsorship as { supporter_message?: string | null }).supporter_message ?? null,
        }
      }
    }
  }

  const displayTitle =
    locale === 'en' && post.title_en?.trim() ? post.title_en : post.title
  const displayExcerpt =
    locale === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt
  const content =
    locale === 'en' && post.content_en?.trim() ? post.content_en : post.content || ''

  const tldrRaw = post as { tldr?: string | null; tldr_en?: string | null }
  const displayTldr =
    (locale === 'en' && tldrRaw.tldr_en?.trim()
      ? tldrRaw.tldr_en
      : tldrRaw.tldr?.trim()
        ? tldrRaw.tldr
        : null) ?? null

  const pulseMarketId = (post as { pulse_market_id?: string | null }).pulse_market_id ?? null
  const embedPosition = parsePulseEmbedPosition(
    (post as { pulse_embed_position?: string | null }).pulse_embed_position
  )
  const pulseComponents = normalizePulseEmbedComponents(
    (post as { pulse_embed_components?: unknown }).pulse_embed_components
  )

  const pulseData =
    pulseMarketId && typeof pulseMarketId === 'string' ? await fetchPulseEmbedDataForBlog(pulseMarketId) : null

  // Localized question text + lightweight live stats for the TL;DR card.
  // Both are derived purely from data we already fetched above (no extra
  // queries) so this is essentially free.
  const pulseQuestion = pulseData
    ? getMarketText(
        {
          title: pulseData.title,
          description: pulseData.description ?? undefined,
          translations: pulseData.translations as Parameters<typeof getMarketText>[0]['translations'],
        },
        'title',
        locale
      )
    : null

  const pulseLiveStats = pulseData
    ? (() => {
        const totalVotes = pulseData.votes.length
        const confidences = pulseData.votes
          .map((v) => Number(v.confidence))
          .filter((n) => Number.isFinite(n))
        const avgConfidence =
          confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : null
        const closed = ['resolved', 'cancelled', 'disputed'].includes(pulseData.status)
        return {
          marketId: pulseData.marketId,
          totalVotes,
          avgConfidence,
          status: closed ? ('closed' as const) : ('active' as const),
        }
      })()
    : null

  const relatedMarketIds = (post.related_market_ids ?? []).filter(Boolean) as string[]

  const catLabel =
    CATEGORY_LABEL[post.category]?.[locale] ?? CATEGORY_LABEL[post.category]?.en ?? post.category

  const relatedSectionTitle =
    locale === 'es' ? 'Pulse relacionados' : 'Related Pulse'

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      {user && canManageBlogPost(profile, user.id, post) && post.status === 'draft' && (
        <BlogDraftBar postId={post.id} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
          {catLabel.toUpperCase()} · {formatDate(post.published_at, locale)}
        </p>
        <BlogShareButton
          postId={post.id}
          slug={slug}
          title={displayTitle}
          excerpt={displayExcerpt}
          locale={locale}
          surface="blog_post_top"
        />
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{displayTitle}</h1>
      <p className="mt-4 text-lg text-slate-400">{displayExcerpt}</p>

      <BlogByline
        authorName={bylineName}
        avatarUrl={bylineAvatar}
        role={bylineRole}
        dateLabel={formatDate(post.published_at, locale)}
        locale={locale}
      />

      {sponsorData && sponsorSlotPlan(sponsorData.tier).byline ? (
        <SponsorBylineCredit sponsor={sponsorData} locale={locale} />
      ) : null}

      {post.cover_image_url && (
        <BlogCoverWithQuestion
          imageUrl={post.cover_image_url}
          question={pulseQuestion}
          locale={locale}
        />
      )}

      {displayTldr ? (
        <BlogTldrCard
          tldr={displayTldr}
          locale={locale}
          voteAnchorId={pulseMarketId && pulseData ? PULSE_EMBED_ANCHOR_ID : null}
          blogSlug={slug}
          stats={pulseLiveStats}
        />
      ) : null}

      {sponsorData && sponsorSlotPlan(sponsorData.tier).shoutout ? (
        <SponsorShoutout sponsor={sponsorData} locale={locale} />
      ) : null}
      {sponsorData && sponsorSlotPlan(sponsorData.tier).inlineCard ? (
        <BlogSponsorCard sponsor={sponsorData} locale={locale} slot="inline" />
      ) : null}

      <div className="mt-10">
        {pulseMarketId && pulseData ? (
          (() => {
            const split = splitMarkdownForPulseEmbed(content, embedPosition)
            if (split.position === 'full_section') {
              return (
                <>
                  <BlogPostBody markdown={split.before} />
                  <div id={PULSE_EMBED_ANCHOR_ID} className="scroll-mt-24">
                    <PulseEmbed
                      data={pulseData}
                      locale={locale}
                      components={pulseComponents}
                      showOwnHeading
                    />
                  </div>
                </>
              )
            }
            return (
              <>
                {split.before ? <BlogPostBody markdown={split.before} /> : null}
                <div id={PULSE_EMBED_ANCHOR_ID} className="scroll-mt-24">
                  <PulseEmbed
                    data={pulseData}
                    locale={locale}
                    components={pulseComponents}
                    showOwnHeading={false}
                  />
                </div>
                {split.after ? <BlogPostBody markdown={split.after} /> : null}
              </>
            )
          })()
        ) : (
          <BlogPostBody markdown={content} />
        )}
      </div>

      <BlogSources sources={(post as { sources?: unknown }).sources} locale={locale} />

      {sponsorData && sponsorSlotPlan(sponsorData.tier).footerCard ? (
        <BlogSponsorCard sponsor={sponsorData} locale={locale} slot="footer" />
      ) : !sponsorData && post.status === 'published' ? (
        <div className="mt-10 flex flex-col items-start gap-2 rounded-xl border border-dashed border-[#2d3748] p-4">
          <p className="text-sm text-slate-400">
            {locale === 'es'
              ? '¿Tu marca quiere apoyar este contenido?'
              : 'Does your brand want to support this content?'}
          </p>
          <a
            href={`/sponsor/blog/${post.id}`}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {getCreatorCopy(locale).sponsorThisPost}
          </a>
        </div>
      ) : null}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[#2d3748] pt-6">
        <p className="text-sm text-slate-400">
          {locale === 'es'
            ? '¿Te gustó este artículo? Compártelo.'
            : 'Enjoyed this article? Share it.'}
        </p>
        <BlogShareButton
          postId={post.id}
          slug={slug}
          title={displayTitle}
          excerpt={displayExcerpt}
          locale={locale}
          surface="blog_post_bottom"
        />
      </div>

      {relatedMarketIds.length > 0 && (
        <section className="mt-16 border-t border-[#2d3748] pt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            📊 {relatedSectionTitle}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedMarketIds.map((marketId) => (
              <EmbeddedMarketCard key={marketId} marketId={marketId} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {!isAuthenticated && <BlogSoftSignupCta slug={slug} />}

      <BlogComments blogPostId={post.id} locale={locale} />

      {pulseMarketId && pulseData ? (
        <BlogPulseStickyCta
          embedAnchorId={PULSE_EMBED_ANCHOR_ID}
          locale={locale}
          blogSlug={slug}
          marketId={pulseData.marketId}
        />
      ) : null}
    </article>
  )
}
