import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
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
      'title, title_en, meta_title, meta_description, excerpt, excerpt_en, cover_image_url, published_at, updated_at, pulse_market_id'
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
  const description =
    locale === 'en' && post.excerpt_en?.trim()
      ? post.excerpt_en
      : post.meta_description || post.excerpt

  const rawCover = post.cover_image_url
  const absoluteCover =
    rawCover && /^https?:\/\//i.test(rawCover) ? rawCover : rawCover ? `${SITE_URL}${rawCover}` : null
  /**
   * og:image priority: author-provided cover → dynamic Pulse card →
   * site default. Putting the cover first ensures WhatsApp / LinkedIn /
   * Twitter show the editorial thumbnail that matches the article, even
   * when a Pulse market is embedded. Auto-generated Pulse-analysis posts
   * (where content-creator sets cover_image_url to /api/og/blog/{slug})
   * still render the Pulse card because their cover IS that URL —
   * self-consistent.
   */
  const ogImage =
    absoluteCover ||
    (post.pulse_market_id
      ? `${SITE_URL}/api/og/blog/${encodeURIComponent(slug)}`
      : `${SITE_URL}/opengraph-image`)

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
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: [{ url: ogImage, alt: title }],
    },
  }
}

export default async function BlogPostPage(props: Props) {
  const { slug } = await props.params
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const supabase = await createClient()

  const user = await getCurrentUser()
  let isAdmin = false
  if (user) {
    const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
    isAdmin = prof?.user_type === 'admin'
  }

  const { data: publishedPost } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  let post = publishedPost
  if (!post && isAdmin) {
    const { data: draftRow } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle()
    post = draftRow
  }

  if (!post) notFound()

  if (post.status === 'published') {
    void supabase.rpc('increment_blog_post_view', { p_slug: slug }).then(() => {})
  }

  const isAuthenticated = !!user
  const displayTitle =
    locale === 'en' && post.title_en?.trim() ? post.title_en : post.title
  const displayExcerpt =
    locale === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt
  const content =
    locale === 'en' && post.content_en?.trim() ? post.content_en : post.content || ''

  const pulseMarketId = (post as { pulse_market_id?: string | null }).pulse_market_id ?? null
  const embedPosition = parsePulseEmbedPosition(
    (post as { pulse_embed_position?: string | null }).pulse_embed_position
  )
  const pulseComponents = normalizePulseEmbedComponents(
    (post as { pulse_embed_components?: unknown }).pulse_embed_components
  )

  const pulseData =
    pulseMarketId && typeof pulseMarketId === 'string' ? await fetchPulseEmbedDataForBlog(pulseMarketId) : null

  const relatedMarketIds = (post.related_market_ids ?? []).filter(Boolean) as string[]

  const catLabel =
    CATEGORY_LABEL[post.category]?.[locale] ?? CATEGORY_LABEL[post.category]?.en ?? post.category

  const relatedSectionTitle =
    locale === 'es' ? 'Mercados relacionados' : 'Related markets'

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      {isAdmin && post.status === 'draft' && <BlogDraftBar postId={post.id} />}
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

      {post.cover_image_url && (
        <div className="relative mt-8 aspect-[2/1] w-full overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="mt-10">
        {pulseMarketId && pulseData ? (
          (() => {
            const split = splitMarkdownForPulseEmbed(content, embedPosition)
            if (split.position === 'full_section') {
              return (
                <>
                  <BlogPostBody markdown={split.before} />
                  <PulseEmbed
                    data={pulseData}
                    locale={locale}
                    components={pulseComponents}
                    showOwnHeading
                  />
                </>
              )
            }
            return (
              <>
                {split.before ? <BlogPostBody markdown={split.before} /> : null}
                <PulseEmbed
                  data={pulseData}
                  locale={locale}
                  components={pulseComponents}
                  showOwnHeading={false}
                />
                {split.after ? <BlogPostBody markdown={split.after} /> : null}
              </>
            )
          })()
        ) : (
          <BlogPostBody markdown={content} />
        )}
      </div>

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
    </article>
  )
}
