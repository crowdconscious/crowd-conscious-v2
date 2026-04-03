import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import NewsletterForm from '@/components/NewsletterForm'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights de inteligencia colectiva, predicciones y opinión pública en CDMX — Crowd Conscious.',
  openGraph: {
    title: 'Blog | Crowd Conscious',
    description:
      'Insights de inteligencia colectiva, predicciones y opinión pública en CDMX.',
  },
}

const CATEGORY_LABEL: Record<string, string> = {
  insight: 'Insight',
  pulse_analysis: 'Pulse analysis',
  market_story: 'Market story',
  world_cup: 'World Cup',
  behind_data: 'Behind the data',
}

function formatDate(iso: string | null, locale: 'en' | 'es') {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const cookieStore = await cookies()
  const locale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select(
      'id, slug, title, title_en, excerpt, excerpt_en, cover_image_url, category, published_at, tags'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(12)

  const list = posts ?? []
  const featured = list[0]
  const rest = list.slice(1)

  const postTitle = (p: (typeof list)[0]) =>
    locale === 'en' && p.title_en?.trim() ? p.title_en : p.title
  const postExcerpt = (p: (typeof list)[0]) =>
    locale === 'en' && p.excerpt_en?.trim() ? p.excerpt_en : p.excerpt

  const readMore = locale === 'es' ? 'Leer más →' : 'Read more →'
  const emptyMsg =
    locale === 'es' ? 'Pronto publicaremos el primer artículo.' : 'First article coming soon.'

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Blog</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          {locale === 'es'
            ? 'Insights de inteligencia colectiva y opinión pública — CDMX y más allá.'
            : 'Collective intelligence and public opinion — CDMX and beyond.'}
        </p>
      </header>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mb-12 block overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-emerald-500/30"
        >
          {featured.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.cover_image_url}
              alt=""
              className="h-48 w-full object-cover"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-emerald-900/20 to-[#1a2029]">
              <span className="text-sm font-medium uppercase tracking-wider text-emerald-500/40">
                Crowd Conscious
              </span>
            </div>
          )}
          <div className="p-5">
            <span className="text-xs font-bold uppercase text-emerald-400">
              {CATEGORY_LABEL[featured.category] ?? featured.category} ·{' '}
              {formatDate(featured.published_at, locale)}
            </span>
            <h2 className="mt-2 text-xl font-bold text-white group-hover:text-emerald-200 md:text-2xl">
              {postTitle(featured)}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-gray-400">{postExcerpt(featured)}</p>
            <span className="mt-3 inline-block text-sm text-emerald-400">{readMore}</span>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-emerald-500/30"
            >
              {post.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.cover_image_url}
                  alt=""
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-emerald-900/20 to-[#1a2029]">
                  <span className="text-sm font-medium uppercase tracking-wider text-emerald-500/40">
                    Crowd Conscious
                  </span>
                </div>
              )}
              <div className="p-5">
                <span className="text-xs font-bold uppercase text-emerald-400">
                  {CATEGORY_LABEL[post.category] ?? post.category} ·{' '}
                  {formatDate(post.published_at, locale)}
                </span>
                <h3 className="mt-2 text-lg font-bold text-white group-hover:text-emerald-200">
                  {postTitle(post)}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-400">{postExcerpt(post)}</p>
                <span className="mt-3 inline-block text-sm text-emerald-400">{readMore}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {list.length === 0 && <p className="text-center text-slate-500">{emptyMsg}</p>}

      <div className="mx-auto mt-16 max-w-xl rounded-xl border border-[#2d3748] bg-[#141a22] p-6 text-center">
        <p className="font-medium text-white">
          {locale === 'es' ? '¿Quieres recibir análisis semanales?' : 'Want weekly analysis in your inbox?'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {locale === 'es'
            ? 'Solo tu correo — sin cuenta obligatoria.'
            : 'Email only — no account required.'}
        </p>
        <div className="mt-4 flex justify-center">
          <NewsletterForm source="blog_listing" locale={locale} />
        </div>
      </div>
    </div>
  )
}
