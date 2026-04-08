import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { PULSE_EMBED_POSITIONS, type PulseEmbedPosition } from '@/lib/pulse-embed-constants'

type Status = 'draft' | 'published' | 'archived'

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

const ALLOWED_CATEGORIES = [
  'insight',
  'pulse_analysis',
  'market_story',
  'world_cup',
  'behind_data',
] as const

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params
    const body = await request.json()

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.title === 'string') {
      const t = body.title.trim()
      if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      patch.title = t
      if (typeof body.meta_title !== 'string') patch.meta_title = t
    }
    if (typeof body.title_en === 'string') patch.title_en = body.title_en.trim() || null
    if (typeof body.excerpt === 'string') {
      const e = body.excerpt.trim()
      if (!e) return NextResponse.json({ error: 'Excerpt cannot be empty' }, { status: 400 })
      patch.excerpt = e
    }
    if (typeof body.excerpt_en === 'string') patch.excerpt_en = body.excerpt_en.trim() || null
    if (typeof body.content === 'string') {
      const c = body.content.trim()
      if (!c) return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
      patch.content = c
    }
    if (typeof body.content_en === 'string') patch.content_en = body.content_en.trim() || null
    if (typeof body.meta_title === 'string') patch.meta_title = body.meta_title.trim() || null
    if (typeof body.meta_description === 'string') patch.meta_description = body.meta_description.trim().slice(0, 160) || null

    if (typeof body.category === 'string') {
      const c = body.category.trim()
      patch.category = ALLOWED_CATEGORIES.includes(c as (typeof ALLOWED_CATEGORIES)[number])
        ? c
        : 'insight'
    }

    if (body.tags !== undefined) {
      const tagsRaw = body.tags
      patch.tags =
        typeof tagsRaw === 'string'
          ? tagsRaw
              .split(',')
              .map((t: string) => t.trim().toLowerCase())
              .filter(Boolean)
          : Array.isArray(tagsRaw)
            ? tagsRaw.map((t: unknown) => String(t).trim().toLowerCase()).filter(Boolean)
            : []
    }

    if (Array.isArray(body.related_market_ids)) {
      patch.related_market_ids = (body.related_market_ids as unknown[])
        .map((x) => String(x).trim())
        .filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    }

    if (typeof body.slug === 'string' && body.slug.trim()) {
      const newSlug = slugify(body.slug.trim())
      const { data: conflict } = await admin.from('blog_posts').select('id').eq('slug', newSlug).neq('id', id).maybeSingle()
      if (conflict) {
        return NextResponse.json({ error: 'Slug already in use' }, { status: 400 })
      }
      patch.slug = newSlug
    }

    const status = body.status as Status | undefined
    if (typeof status === 'string' && ['draft', 'published', 'archived'].includes(status)) {
      patch.status = status
      if (status === 'published') {
        const { data: existing } = await admin.from('blog_posts').select('published_at').eq('id', id).maybeSingle()
        if (existing && !(existing as { published_at?: string | null }).published_at) {
          patch.published_at = new Date().toISOString()
        }
      }
    }

    if ('cover_image_url' in body) {
      const raw = body.cover_image_url
      patch.cover_image_url = typeof raw === 'string' ? raw.trim() || null : null
    }

    if ('pulse_market_id' in body) {
      const v = body.pulse_market_id
      if (v === null || v === '') {
        patch.pulse_market_id = null
      } else if (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v.trim())) {
        patch.pulse_market_id = v.trim()
      }
    }

    if (typeof body.pulse_embed_position === 'string') {
      const p = body.pulse_embed_position.trim()
      if ((PULSE_EMBED_POSITIONS as readonly string[]).includes(p)) {
        patch.pulse_embed_position = p as PulseEmbedPosition
      }
    }

    if (body.pulse_embed_components !== undefined) {
      const arr = Array.isArray(body.pulse_embed_components)
        ? body.pulse_embed_components.map((x: unknown) => String(x).trim()).filter(Boolean)
        : []
      patch.pulse_embed_components = arr.length > 0 ? arr : []
    }

    const keys = Object.keys(patch).filter((k) => k !== 'updated_at')
    if (keys.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data, error } = await admin.from('blog_posts').update(patch).eq('id', id).select('*').single()

    if (error) {
      console.error('[admin/blog-posts PATCH]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: data })
  } catch (e) {
    console.error('[admin/blog-posts]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
