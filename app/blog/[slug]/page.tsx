import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/seo/site'
import { BlogPostBody } from './BlogPostBody'

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

function splitMarkdownWords(content: string, maxWords: number) {
  const words = content.trim().split(/\s+/)
  if (words.length <= maxWords) {
    return { preview: content, needsGate: false }
  }
  return {
    preview: words.slice(0, maxWords).join(' '),
    needsGate: true,
  }
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

  const [{ data: post }, { data: userData }] = await Promise.all([
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle(),
    supabase.auth.getUser(),
  ])

  if (!post) notFound()

  void supabase.rpc('increment_blog_post_view', { p_slug: slug }).then(() => {})

  const isAuthenticated = !!userData.user
  const content = post.content || ''
  const { preview, needsGate } = splitMarkdownWords(content, 300)
  const showGate = !isAuthenticated && needsGate

  let related: Array<{ id: string; title: string; category: string | null; total_votes: number | null }> =
    []
  const ids = (post.related_market_ids ?? []).filter(Boolean)
  if (ids.length > 0) {
    const { data: markets } = await supabase
      .from('prediction_markets')
      .select('id, title, category, total_votes')
      .in('id', ids)
    related = markets ?? []
  }

  const catLabel = CATEGORY_LABEL[post.category] ?? post.category

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
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

      {related.length > 0 && (
        <section className="mt-16 border-t border-[#2d3748] pt-10">
          <h2 className="text-lg font-semibold text-white">Mercados relacionados</h2>
          <ul className="mt-4 space-y-3">
            {related.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/predictions/markets/${m.id}`}
                  className="block rounded-lg border border-[#2d3748] bg-[#141a22] px-4 py-3 transition-colors hover:border-emerald-500/40"
                >
                  <span className="font-medium text-white">{m.title}</span>
                  <p className="mt-1 text-xs text-slate-500">
                    {m.total_votes ?? 0} opiniones · {m.category}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
