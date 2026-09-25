import { createAdminClient } from '@/lib/supabase-admin'
// Service-role client — bypasses RLS for intake + moderation writes.
import { STORAGE_BUCKET } from './constants'
import type { RecognitionInsert, RecognitionPublic, RecognitionRow } from './types'

function db() {
  return createAdminClient()
}

export async function insertRecognition(row: RecognitionInsert) {
  const { data, error } = await db()
    .from('recognitions')
    .insert(row)
    .select('id, share_slug, status')
    .single()
  if (error) throw error
  return data as Pick<RecognitionRow, 'id' | 'share_slug' | 'status'>
}

export async function getPublicRecognitionBySlug(
  slug: string
): Promise<RecognitionPublic | null> {
  const { data, error } = await db()
    .from('recognitions_public')
    .select(
      'id, created_at, photo_path, what, where_text, who_type, how_known, credit_handle, src, share_slug, reviewed_at'
    )
    .eq('share_slug', slug)
    .maybeSingle()
  if (error) throw error
  return (data as RecognitionPublic | null) ?? null
}

export async function getRecognitionById(
  id: string
): Promise<RecognitionRow | null> {
  const { data, error } = await db()
    .from('recognitions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as RecognitionRow | null) ?? null
}

export async function listRecognitions(filters: {
  status?: string
  src?: string
  limit?: number
}) {
  let q = db()
    .from('recognitions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100)
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.src) q = q.eq('src', filters.src)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as RecognitionRow[]
}

export async function updateRecognitionStatus(
  id: string,
  patch: Partial<
    Pick<
      RecognitionRow,
      'status' | 'reviewed_at' | 'reviewed_by' | 'reject_reason'
    >
  >
) {
  const { data, error } = await db()
    .from('recognitions')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as RecognitionRow
}

export async function uploadRecognitionPhoto(
  path: string,
  buffer: Buffer,
  contentType: string
) {
  const { error } = await db().storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  })
  if (error) throw error
}

export async function downloadRecognitionPhoto(
  path: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const { data, error } = await db().storage.from(STORAGE_BUCKET).download(path)
  if (error || !data) throw error ?? new Error('Photo not found')
  const buffer = Buffer.from(await data.arrayBuffer())
  return { buffer, contentType: data.type || 'image/jpeg' }
}

export async function createSignedPhotoUrl(
  path: string,
  expiresInSeconds = 60 * 10
): Promise<string> {
  const { data, error } = await db()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) throw error ?? new Error('Signed URL failed')
  return data.signedUrl
}

export async function listApprovedPublic(
  limit = 24
): Promise<RecognitionPublic[]> {
  const { data, error } = await db()
    .from('recognitions_public')
    .select(
      'id, created_at, photo_path, what, where_text, who_type, how_known, credit_handle, src, share_slug, reviewed_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as RecognitionPublic[]
}
