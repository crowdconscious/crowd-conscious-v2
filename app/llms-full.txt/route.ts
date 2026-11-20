import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getBlogCategoryLabel } from '@/lib/blog-categories'
import { buildLlmsFullTxt } from '@/lib/agentic/llms-txt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, published_at, category')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(200)

  const body = buildLlmsFullTxt(
    (posts ?? []).map((p) => ({
      slug: p.slug,
      title: p.title,
      publishedAt: p.published_at,
      categoryLabel: p.category ? getBlogCategoryLabel(p.category, 'es') : null,
    }))
  )

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
