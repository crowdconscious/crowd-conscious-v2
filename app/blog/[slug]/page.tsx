import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { SITE_URL } from '@/lib/seo/site'
import { BlogPostBody } from './BlogPostBody'
import { BlogDraftBar } from './BlogDraftBar'
import { EmbeddedMarketCard } from '@/components/blog/EmbeddedMarketCard'
import { BlogComments } from '@/components/blog/BlogComments'
import { truncateMarkdownPreview } from '@/lib/blog-truncate-preview'

type Props = { params: Promise<{ slug: string }> }

const CATEGORY_LABEL: Record<string, string> = {
  insight: 'Insight',
  pulse_analysis: 'Pulse analysis',
  market_story: 'Market story',
  world_cup: 'World Cup',
  behind_data: 'Behind the data',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, meta_title, meta_description, excerpt, cover_image_url, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) {
    return { title: 'Artículo' }
  }

  const title = post.meta_title || post.title
  const description = post.meta_description || post.excerpt
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
  const content = post.content || ''
  const { preview, needsGate } = truncateMarkdownPreview(content, 300)
  const showGate = !isAuthenticated && needsGate

  const relatedMarketIds = (post.related_market_ids ?? []).filter(Boolean) as string[]

  const catLabel = CATEGORY_LABEL[post.category] ?? post.category

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      {isAdmin && post.status === 'draft' && <BlogDraftBar postId={post.id} />}
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
        {catLabel.toUpperCase()} · {formatDate(post.published_at)}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">{post.title}</h1>
      <p className="mt-4 text-lg text-slate-400">{post.excerpt}</p>

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
        <BlogPostBody
          slug={slug}
          locale="es"
          previewMarkdown={preview}
          fullMarkdown={content}
          needsGate={showGate}
        />
      </div>

      {relatedMarketIds.length > 0 && (
        <section className="mt-16 border-t border-[#2d3748] pt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">
            📊 Mercados relacionados
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedMarketIds.map((marketId) => (
              <EmbeddedMarketCard key={marketId} marketId={marketId} locale="es" />
            ))}
          </div>
        </section>
      )}

      <BlogComments blogPostId={post.id} locale="es" />
    </article>
  )
}
