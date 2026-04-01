import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'

type Status = 'draft' | 'published' | 'archived'

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

    const status = body.status as Status | undefined
    const hasStatus = typeof status === 'string' && ['draft', 'published', 'archived'].includes(status)
    const hasCover = 'cover_image_url' in body

    if (!hasStatus && !hasCover) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (hasStatus) {
      patch.status = status
      if (status === 'published') {
        patch.published_at = new Date().toISOString()
      }
    }

    if (hasCover) {
      const raw = body.cover_image_url
      patch.cover_image_url = typeof raw === 'string' ? raw.trim() || null : null
    }

    const { data, error } = await admin.from('blog_posts').update(patch).eq('id', id).select('id, status, cover_image_url').single()

    if (error) {
      console.error('[admin/blog-posts]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, post: data })
  } catch (e) {
    console.error('[admin/blog-posts]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
