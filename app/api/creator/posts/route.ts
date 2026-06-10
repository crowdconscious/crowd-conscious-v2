import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerAuth } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { isValidBlogCategory } from '@/lib/blog-categories'

function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 110)
  return s || 'post'
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8)
}

function sanitizeSources(raw: unknown): { label: string; url: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => {
      const item = s as { label?: unknown; url?: unknown }
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      const label = typeof item.label === 'string' ? item.label.trim() : ''
      return { label: label || url, url }
    })
    .filter((s) => s.url.length > 0)
    .slice(0, 20)
}

/**
 * POST /api/creator/posts — create a blog draft owned by the current creator.
 *
 * The insert runs through the user's own session (createServerAuth) so the
 * blog RLS policies are the source of truth: author_id = auth.uid() and status
 * limited to draft/pending_review on insert. Self-publish (status='published')
 * is applied as a follow-up UPDATE which the RLS publish gate only permits when
 * creator_trust_level >= 2.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isBlogEditorUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    if (!title || !excerpt || !content) {
      return NextResponse.json({ error: 'Title, excerpt and content (ES) are required.' }, { status: 400 })
    }

    const requestedStatus = body.status === 'pending_review' || body.status === 'published' ? body.status : 'draft'
    // Insert status must be draft/pending_review (RLS). Publishing happens below.
    const insertStatus = requestedStatus === 'published' ? 'draft' : requestedStatus

    const category =
      typeof body.category === 'string' && isValidBlogCategory(body.category)
        ? body.category
        : 'insight'
    const baseSlug = typeof body.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(title)
    const slug = `${baseSlug}-${randomSuffix()}`

    const row = {
      title,
      title_en: typeof body.title_en === 'string' ? body.title_en.trim() || null : null,
      slug,
      excerpt,
      excerpt_en: typeof body.excerpt_en === 'string' ? body.excerpt_en.trim() || null : null,
      content,
      content_en: typeof body.content_en === 'string' ? body.content_en.trim() || null : null,
      category,
      cover_image_url:
        typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null,
      sources: sanitizeSources(body.sources),
      author_id: user.id,
      status: insertStatus,
      meta_title: title,
    }

    const supabase = await createServerAuth()
    const { data: created, error } = await supabase
      .from('blog_posts')
      .insert(row)
      .select('id, slug, status')
      .single()

    if (error || !created) {
      console.error('[creator/posts POST]', error)
      return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
    }

    let finalStatus = created.status as string
    let publishBlocked = false
    if (requestedStatus === 'published') {
      const { error: pubErr } = await supabase
        .from('blog_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', created.id)
      if (pubErr) {
        // RLS publish gate (trust < 2) — the draft is saved, just not published.
        publishBlocked = true
      } else {
        finalStatus = 'published'
      }
    }

    return NextResponse.json({
      ok: true,
      id: created.id,
      slug: created.slug,
      status: finalStatus,
      publishBlocked,
    })
  } catch (e) {
    console.error('[creator/posts POST] Exception:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
