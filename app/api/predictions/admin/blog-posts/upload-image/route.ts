import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { isAdminUser } from '@/lib/auth/is-admin'

export const maxDuration = 30

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024
const BUCKET = 'blog-images'

/**
 * Admin-only image upload used by the blog MarkdownEditor's
 * "Insert image" button, drag-and-drop, and paste-from-clipboard.
 *
 * Uploads land in the `blog-images` bucket under `inline/<timestamp>_<rand>.<ext>`
 * and the public URL is returned so the editor can insert markdown
 * (`![](url)`) at the caret without a second round-trip.
 *
 * Unlike `/api/sponsor/upload-logo` (which is intentionally unauthenticated
 * because it's called during the public sponsor onboarding flow), this
 * endpoint requires an admin session. Inline blog images are a write
 * surface we don't want to expose to anonymous callers.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type, email')
      .eq('id', user.id)
      .single()
    if (!isAdminUser(profile)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image must be under ${Math.round(MAX_BYTES / 1024 / 1024)}MB` },
        { status: 400 }
      )
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 6)
    const path = `inline/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('[blog upload-image] upload failed:', uploadError)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({ ok: true, url: publicUrl, path })
  } catch (err) {
    console.error('[blog upload-image]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
