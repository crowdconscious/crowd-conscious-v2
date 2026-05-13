import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { moderateRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Upload evidence file for a draft Citizen Signal. The route returns a
 * `storage_path` that the client passes back to POST /api/signals as part
 * of the evidence[] array. We don't write a citizen_signal_evidence row
 * here — the parent row may not exist yet when the user is partway through
 * the wizard.
 *
 * Auth: signed-in user only. Rate limit: moderate (uploads can be heavy).
 * Bucket: citizen-signals-evidence (private; signed URLs handed out at read).
 */

// Pilot scope is images-only. The storage bucket (`citizen-signals-evidence`,
// migration 219) allows a slightly wider mime list at the storage layer, but
// the application contract is enforced here: anything outside this set is
// rejected with a 400 before it ever reaches Supabase Storage. HEIC/HEIF
// support is included for iPhone users (default camera format).
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB; matches storage bucket limit.

function flagOn() {
  return process.env.SIGNALS_ENABLED === 'true'
}

export async function POST(request: NextRequest) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (moderateRateLimit) {
      const id = await getRateLimitIdentifier(request, user.id)
      const rate = await moderateRateLimit.limit(`signals-upload:${id}`)
      if (!rate.success) {
        return NextResponse.json(
          { error: 'Too many uploads, try again in a minute' },
          { status: 429 }
        )
      }
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const cleanExt = /^[a-z0-9]{1,8}$/.test(ext) ? ext : 'bin'

    // Group uploads by user so we can prune orphans (files that never made
    // it into a citizen_signal_evidence row) in a future janitor cron.
    const path = `${user.id}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${cleanExt}`

    const admin = createSignalsAdminClient()
    const { error } = await admin.storage
      .from('citizen-signals-evidence')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      console.error('[api/signals/upload]', error)
      return NextResponse.json(
        { error: 'Upload failed', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      storage_path: path,
      kind: 'image',
      size: file.size,
      content_type: file.type,
    })
  } catch (err) {
    console.error('[api/signals/upload] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
