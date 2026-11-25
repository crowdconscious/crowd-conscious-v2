import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getBlogCategoryLabel } from '@/lib/blog-categories'
import {
  blogPostMarkdown,
  homepageMarkdown,
  markdownResponseHeaders,
  notFoundMarkdown,
} from '@/lib/agentic/markdown-bodies'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ path?: string[] }> }

function joinPath(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return '/'
  return `/${segments.join('/')}`
}

function markdownOk(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: markdownResponseHeaders(),
  })
}

/**
 * Internal Markdown negotiation target. Middleware rewrites
 * `Accept: text/markdown` requests here. Not linked from the public IA —
 * agents hit the normal URL and get this body via content negotiation.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { path } = await params
  const pathname = joinPath(path)

  if (pathname === '/') {
    return markdownOk(homepageMarkdown())
  }

  const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/)
  if (blogMatch) {
    const slug = decodeURIComponent(blogMatch[1])
    const supabase = await createClient()
    const { data: post } = await supabase
      .from('blog_posts')
      .select(
        'title, title_en, excerpt, excerpt_en, tldr, tldr_en, content, published_at, updated_at, category, status'
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (!post) {
      return markdownOk(notFoundMarkdown(pathname), 404)
    }

    const description =
      post.tldr?.trim() ||
      post.excerpt?.trim() ||
      post.tldr_en?.trim() ||
      post.excerpt_en?.trim() ||
      null

    return markdownOk(
      blogPostMarkdown({
        title: post.title,
        slug,
        description,
        publishedAt: post.published_at,
        updatedAt: post.updated_at,
        categoryLabel: post.category
          ? getBlogCategoryLabel(post.category, 'es')
          : null,
        // Prefer Spanish body; agents can still open the HTML for EN.
        content: post.content,
      })
    )
  }

  // Blog index — short map pointing at the corpus.
  if (pathname === '/blog' || pathname === '/blog/') {
    const baseBody = [
      '# Blog | Crowd Conscious',
      '',
      'Sourced investigations and analysis. Prefer individual `/blog/{slug}` pages when citing.',
      '',
      'See [llms-full.txt](/llms-full.txt) for the catalog and [sitemap.xml](/sitemap.xml) for all URLs.',
      '',
    ].join('\n')
    return markdownOk(baseBody)
  }

  return markdownOk(notFoundMarkdown(pathname), 404)
}
