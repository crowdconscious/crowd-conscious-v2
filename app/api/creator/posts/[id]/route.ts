import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createServerAuth } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'
import { isValidBlogCategory } from '@/lib/blog-categories'
import { scheduleNotifyBlogPublished } from '@/lib/expo-push'

function parseTags(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  }
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
  }
  return []
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
 * PATCH /api/creator/posts/[id] — update a creator's OWN post.
 *
 * Runs through the user's session so blog RLS enforces ownership and the
 * self-publish gate (status='published' only succeeds when
 * creator_trust_level >= 2 and the post isn't already published).
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isBlogEditorUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const body = await request.json()

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.title === 'string') {
      const t = body.title.trim()
      if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      patch.title = t
    }
    if (typeof body.title_en === 'string') patch.title_en = body.title_en.trim() || null
    if (typeof body.excerpt === 'string') {
      const e = body.excerpt.trim()
      if (!e) return NextResponse.json({ error: 'Excerpt cannot be empty' }, { status: 400 })
      patch.excerpt = e
    }
    if (typeof body.excerpt_en === 'string') patch.excerpt_en = body.excerpt_en.trim() || null
    if (typeof body.tldr === 'string') patch.tldr = body.tldr.trim() || null
    if (typeof body.tldr_en === 'string') patch.tldr_en = body.tldr_en.trim() || null
    if ('tags' in body) patch.tags = parseTags(body.tags)
    if (typeof body.content === 'string') {
      const c = body.content.trim()
      if (!c) return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
      patch.content = c
    }
    if (typeof body.content_en === 'string') patch.content_en = body.content_en.trim() || null
    if (typeof body.category === 'string') {
      patch.category = isValidBlogCategory(body.category) ? body.category : 'insight'
    }
    if ('cover_image_url' in body) {
      patch.cover_image_url =
        typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null
    }
    if ('sources' in body) {
      patch.sources = sanitizeSources(body.sources)
    }

    const wantsPublish = body.status === 'published'
    const wantsReview = body.status === 'pending_review'
    const wantsDraft = body.status === 'draft'
    if (wantsDraft || wantsReview) {
      patch.status = body.status
    }

    const supabase = await createServerAuth()

    const { data: existing, error: loadErr } = await supabase
      .from('blog_posts')
      .select('status, published_at, slug, title')
      .eq('id', id)
      .maybeSingle()
    if (loadErr) {
      console.error('[creator/posts PATCH load]', loadErr)
      return NextResponse.json({ error: loadErr.message }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isFirstPublish =
      wantsPublish && existing.status !== 'published' && !existing.published_at

    if (wantsPublish) {
      patch.status = 'published'
      if (isFirstPublish) {
        patch.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(patch)
      .eq('id', id)
      .select('id, slug, status')
      .maybeSingle()

    if (error) {
      console.error('[creator/posts PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      // RLS rejected the write (not owner, already published, or publish gate).
      return NextResponse.json({ error: 'forbidden_or_locked' }, { status: 403 })
    }

    if (isFirstPublish && data.slug) {
      const notifyTitle =
        typeof patch.title === 'string' ? patch.title : existing.title
      if (notifyTitle) {
        scheduleNotifyBlogPublished(createAdminClient(), {
          slug: data.slug,
          title: notifyTitle,
        })
      }
    }

    return NextResponse.json({ ok: true, id: data.id, slug: data.slug, status: data.status })
  } catch (e) {
    console.error('[creator/posts PATCH] Exception:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/** DELETE /api/creator/posts/[id] — delete an own draft/pending post (RLS). */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isBlogEditorUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const supabase = await createServerAuth()
    const { error } = await supabase.from('blog_posts').delete().eq('id', id)
    if (error) {
      console.error('[creator/posts DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[creator/posts DELETE] Exception:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
