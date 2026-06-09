import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase-server'
import LandingNav from '@/app/components/landing/LandingNav'
import type { CreatorLocale } from '@/lib/i18n/creator'
import BlogSponsorCheckoutForm from './BlogSponsorCheckoutForm'

const Footer = nextDynamic(() => import('@/components/Footer'))

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ postId: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Patrocinar publicación | Crowd Conscious', robots: { index: false } }
}

export default async function SponsorBlogPage(props: Props) {
  const { postId } = await props.params
  const { ref } = await props.searchParams
  const cookieStore = await cookies()
  const locale: CreatorLocale = cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'

  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blog_posts')
    .select('id, title, title_en, excerpt, cover_image_url, status')
    .eq('id', postId)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) notFound()

  const title = locale === 'en' && post.title_en?.trim() ? post.title_en : post.title

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <LandingNav />
      <main className="px-4 pb-16 pt-24">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            {locale === 'es' ? 'Patrocinio' : 'Sponsorship'}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {locale === 'es' ? 'Patrocina esta publicación' : 'Sponsor this post'}
          </h1>
          <div className="mt-4 rounded-xl border border-[#2d3748] bg-[#1a2029] p-4">
            {post.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_image_url}
                alt={title}
                className="mb-3 h-32 w-full rounded-lg object-cover"
              />
            )}
            <p className="font-medium text-white">{title}</p>
            {post.excerpt && <p className="mt-1 text-sm text-slate-400">{post.excerpt}</p>}
          </div>

          <p className="mt-4 text-sm text-slate-400">
            {locale === 'es'
              ? 'Tu marca aparecerá en una tarjeta de patrocinio acotada y siempre etiquetada como “Patrocinado”. El 20% del bruto va al Fondo Consciente.'
              : 'Your brand will appear in a constrained sponsor card always labelled “Patrocinado.” 20% of gross goes to the Conscious Fund.'}
          </p>

          <BlogSponsorCheckoutForm postId={post.id} refParam={ref ?? null} locale={locale} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
