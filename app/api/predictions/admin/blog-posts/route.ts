import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
  return s || 'post'
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const title = String(body.title ?? '').trim()
    const excerpt = String(body.excerpt ?? '').trim()
    const content = String(body.content ?? '').trim()
    if (!title || !excerpt || !content) {
      return NextResponse.json({ error: 'title, excerpt, and content are required' }, { status: 400 })
    }

    let slug = String(body.slug ?? '').trim()
    if (!slug) slug = slugify(title)
    else slug = slugify(slug)

    const publishNow = Boolean(body.publish_now)
    const category = String(body.category ?? 'insight').trim()
    const allowed = ['insight', 'pulse_analysis', 'market_story', 'world_cup', 'behind_data']
    const cat = allowed.includes(category) ? category : 'insight'

    const tagsRaw = body.tags
    const tags: string[] =
      typeof tagsRaw === 'string'
        ? tagsRaw
            .split(',')
            .map((t: string) => t.trim().toLowerCase())
            .filter(Boolean)
        : Array.isArray(tagsRaw)
          ? tagsRaw.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
          : []

    const relatedIds = Array.isArray(body.related_market_ids)
      ? (body.related_market_ids as string[]).filter((id) => typeof id === 'string' && id.length > 0)
      : []

    for (let i = 0; i < 30; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i + 1}`
      const { data: exists } = await admin.from('blog_posts').select('id').eq('slug', candidate).maybeSingle()
      if (!exists) {
        slug = candidate
        break
      }
    }

    const metaDesc = String(body.meta_description ?? excerpt).slice(0, 160)
    const now = new Date().toISOString()

    const { data: row, error } = await admin
      .from('blog_posts')
      .insert({
        slug,
        title,
        title_en: String(body.title_en ?? '').trim() || null,
        excerpt,
        excerpt_en: String(body.excerpt_en ?? '').trim() || null,
        content,
        content_en: String(body.content_en ?? '').trim() || null,
        cover_image_url: typeof body.cover_image_url === 'string' ? body.cover_image_url.trim() || null : null,
        category: cat as 'insight' | 'pulse_analysis' | 'market_story' | 'world_cup' | 'behind_data',
        tags,
        meta_title: title,
        meta_description: metaDesc,
        related_market_ids: relatedIds,
        generated_by: 'manual',
        status: publishNow ? 'published' : 'draft',
        published_at: publishNow ? now : null,
      })
      .select('id, slug')
      .single()

    if (error) {
      console.error('[admin blog POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: row })
  } catch (e) {
    console.error('[admin blog POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
