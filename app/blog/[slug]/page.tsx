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
      'title, title_en, meta_title, meta_description, excerpt, excerpt_en, cover_image_url, published_at'
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
  const ogImage = post.cover_image_url || `${SITE_URL}/opengraph-image`

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 200),
      type: 'article',
      publishedTime: post.published_at ?? undefined,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 200),
      images: [ogImage],
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

  const relatedMarketIds = (post.related_market_ids ?? []).filter(Boolean) as string[]

  const catLabel =
    CATEGORY_LABEL[post.category]?.[locale] ?? CATEGORY_LABEL[post.category]?.en ?? post.category

  const relatedSectionTitle =
    locale === 'es' ? 'Mercados relacionados' : 'Related markets'

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      {isAdmin && post.status === 'draft' && <BlogDraftBar postId={post.id} />}
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
        {catLabel.toUpperCase()} · {formatDate(post.published_at, locale)}
      </p>
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
        <BlogPostBody markdown={content} />
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
