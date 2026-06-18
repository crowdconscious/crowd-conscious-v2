import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'
import { scheduleNotifyBlogPublished } from '@/lib/expo-push'

/**
 * POST /api/admin/blog/[id]/approve
 *
 * Admin-only. Publishes a creator's pending_review post AND increments the
 * author's `creator_trust_level`. The trust bump is the mechanism that moves a
 * new creator (trust 0, review-gated) toward self-publish (trust >= 2). Both
 * writes use the service-role admin client because `creator_trust_level` is
 * admin-only to change and the RLS publish gate would otherwise block a
 * trust-0 author from being published.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await context.params
    const admin = createAdminClient()

    const { data: post, error: loadErr } = await admin
      .from('blog_posts')
      .select('id, author_id, status, published_at, slug, title')
      .eq('id', id)
      .maybeSingle()

    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isFirstPublish = post.status !== 'published' && !post.published_at
    const patch: Record<string, unknown> = {
      status: 'published',
      updated_at: new Date().toISOString(),
      edited_by: user.id,
    }
    if (isFirstPublish) patch.published_at = new Date().toISOString()

    const { error: updErr } = await admin.from('blog_posts').update(patch).eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Increment the author's creator trust level (review approval = trust bump).
    let newTrust: number | null = null
    if (post.author_id) {
      const { data: author } = await admin
        .from('profiles')
        .select('creator_trust_level')
        .eq('id', post.author_id)
        .maybeSingle()
      const current = Number(author?.creator_trust_level ?? 0)
      newTrust = current + 1
      const { error: trustErr } = await admin
        .from('profiles')
        .update({ creator_trust_level: newTrust })
        .eq('id', post.author_id)
      if (trustErr) {
        console.warn('[admin/blog approve] trust increment failed:', trustErr.message)
        newTrust = current
      }
    }

    if (isFirstPublish && post.slug && post.title) {
      scheduleNotifyBlogPublished(admin, { slug: post.slug, title: post.title })
    }

    return NextResponse.json({ ok: true, slug: post.slug, newTrust })
  } catch (e) {
    console.error('[admin/blog approve] Exception:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
