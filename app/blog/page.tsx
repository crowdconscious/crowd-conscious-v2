import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

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

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, cover_image_url, category, published_at, tags'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(12)

  const list = posts ?? []
  const featured = list[0]
  const rest = list.slice(1)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Blog</h1>
        <p className="mt-3 max-w-2xl mx-auto text-slate-400">
          Insights de inteligencia colectiva y opinión pública — CDMX y más allá.
        </p>
      </header>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mb-12 block overflow-hidden rounded-2xl border border-[#2d3748] bg-[#141a22] transition-colors hover:border-emerald-500/40"
        >
          <div className="grid gap-0 md:grid-cols-2">
            <div className="relative aspect-[16/10] bg-[#1a2029] md:min-h-[280px]">
              {featured.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600">
                  Crowd Conscious
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                {(CATEGORY_LABEL[featured.category] ?? featured.category).toUpperCase()} ·{' '}
                {formatDate(featured.published_at)}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white group-hover:text-emerald-200">
                {featured.title}
              </h2>
              <p className="mt-3 line-clamp-4 text-slate-400">{featured.excerpt}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-emerald-400">
                Leer más →
              </span>
            </div>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-[#2d3748] bg-[#141a22] p-5 transition-colors hover:border-emerald-500/30"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500/90">
                {CATEGORY_LABEL[post.category] ?? post.category} · {formatDate(post.published_at)}
              </p>
              <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white group-hover:text-emerald-200">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-400">{post.excerpt}</p>
              <span className="mt-4 text-sm font-medium text-emerald-400">Leer más →</span>
            </Link>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <p className="text-center text-slate-500">Pronto publicaremos el primer artículo.</p>
      )}

      <div className="mt-16 rounded-xl border border-[#2d3748] bg-[#141a22] p-6 text-center">
        <p className="text-white font-medium">¿Quieres recibir análisis semanales?</p>
        <p className="mt-1 text-sm text-slate-500">Únete y recibe novedades en tu correo.</p>
        <Link
          href="/signup?redirect=/blog"
          className="mt-4 inline-flex rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Suscribirse
        </Link>
      </div>
    </div>
  )
}
