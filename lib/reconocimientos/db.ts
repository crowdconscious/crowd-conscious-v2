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

export async function insertRecognitionEvent(args: {
  recognition_id: string
  event_type:
    | 'share_whatsapp'
    | 'share_native'
    | 'share_copy'
    | 'card_download_portrait'
    | 'card_download_story'
  src?: string | null
}) {
  const { error } = await db().from('recognition_events').insert({
    recognition_id: args.recognition_id,
    event_type: args.event_type,
    src: args.src ?? null,
  })
  if (error) throw error
}

export async function getRecognitionIdByShareSlug(
  slug: string
): Promise<string | null> {
  const { data, error } = await db()
    .from('recognitions')
    .select('id')
    .eq('share_slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (error) throw error
  return (data as { id: string } | null)?.id ?? null
}

export type WeeklyRecognitionStat = {
  week_start: string
  src: string | null
  status: string | null
  submissions: number
  event_type: string | null
  events: number
}

export async function getWeeklyRecognitionStats(
  limit = 24
): Promise<WeeklyRecognitionStat[]> {
  const { data, error } = await db()
    .from('recognitions_weekly_stats')
    .select('week_start, src, status, submissions, event_type, events')
    .order('week_start', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as WeeklyRecognitionStat[]
}

export type RecognitionEventCount = {
  recognition_id: string
  event_type: string
  count: number
}

/** Per-item event totals for approved rows currently in the admin list. */
export async function getRecognitionEventCounts(
  recognitionIds: string[]
): Promise<RecognitionEventCount[]> {
  if (recognitionIds.length === 0) return []
  const { data, error } = await db()
    .from('recognition_events')
    .select('recognition_id, event_type')
    .in('recognition_id', recognitionIds)
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const r = row as { recognition_id: string; event_type: string }
    const key = `${r.recognition_id}::${r.event_type}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([key, count]) => {
    const [recognition_id, event_type] = key.split('::')
    return { recognition_id, event_type, count }
  })
}
