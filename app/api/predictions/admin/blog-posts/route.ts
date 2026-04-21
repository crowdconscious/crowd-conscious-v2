import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  DEFAULT_PULSE_EMBED_COMPONENTS,
  PULSE_EMBED_POSITIONS,
  type PulseEmbedPosition,
} from '@/lib/pulse-embed-constants'

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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    if (profile?.user_type !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const allowedStatuses = ['draft', 'published', 'archived']

    let query = admin
      .from('blog_posts')
      .select(
        'id, slug, title, title_en, category, status, published_at, updated_at, view_count, cover_image_url, generated_by, pulse_market_id, tags'
      )
      .order('updated_at', { ascending: false })
      .limit(500)

    if (statusParam && allowedStatuses.includes(statusParam)) {
      query = query.eq('status', statusParam)
    }

    const { data: posts, error } = await query
    if (error) {
      console.error('[admin blog GET]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: posts ?? [] })
  } catch (e) {
    console.error('[admin blog GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
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

    let pulse_market_id: string | null = null
    if (body.pulse_market_id != null && body.pulse_market_id !== '') {
      const pid = String(body.pulse_market_id).trim()
      pulse_market_id = /^[0-9a-f-]{36}$/i.test(pid) ? pid : null
    }

    let pulse_embed_position: PulseEmbedPosition = 'before_cta'
    const rawPos = String(body.pulse_embed_position ?? 'before_cta').trim()
    if ((PULSE_EMBED_POSITIONS as readonly string[]).includes(rawPos)) {
      pulse_embed_position = rawPos as PulseEmbedPosition
    }

    let pulse_embed_components: string[] = [...DEFAULT_PULSE_EMBED_COMPONENTS]
    if (Array.isArray(body.pulse_embed_components)) {
      const arr = body.pulse_embed_components.map((x: unknown) => String(x).trim()).filter(Boolean)
      if (arr.length > 0) pulse_embed_components = arr
    }

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
        pulse_market_id,
        pulse_embed_position,
        pulse_embed_components,
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
