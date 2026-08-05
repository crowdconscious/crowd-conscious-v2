/**
 * Data access for Señal Express.
 *
 * `express_oficios` (migration 255) is NOT yet applied during this build, so it
 * is not modelled in the hand-tightened `types/database.ts` (CLAUDE.md — never
 * blind-regenerate). We therefore reach it through the UNTYPED service-role
 * admin client (createAdminClient has no Database generic) and narrow results to
 * the local `ExpressOficioRow` interface with a scoped `as unknown as` cast —
 * mirroring how `lib/simulation/run.ts` handled untyped tables before their
 * types were injected.
 *
 * TODO(once 255 applied + the express_oficios Tables block is surgically
 * injected into types/database.ts): switch to a typed
 * `SupabaseClient<Database>` and drop the casts below.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'
import type { ExpressDraft, ExpressOficioRow } from './types'

/** Untyped service-role client used only for `express_oficios` + storage. */
export type ExpressAdminClient = SupabaseClient

export function createExpressAdminClient(): ExpressAdminClient {
  return createAdminClient()
}

/** Private bucket shared with Citizen Signals evidence (migration 219). */
export const OFICIO_BUCKET = 'citizen-signals-evidence'

export interface InsertExpressOficioInput {
  userId: string | null
  deviceId: string | null
  alcaldia: string
  category: string
  inputSentence: string
  draft: ExpressDraft
  status?: 'draft' | 'confirmed'
}

/** Insert a draft `express_oficios` row and return it. */
export async function insertExpressOficio(
  admin: ExpressAdminClient,
  input: InsertExpressOficioInput
): Promise<ExpressOficioRow> {
  const payload = {
    user_id: input.userId,
    device_id: input.deviceId,
    alcaldia: input.alcaldia,
    category: input.category,
    input_sentence: input.inputSentence,
    draft: input.draft,
    status: input.status ?? 'draft',
  }
  const { data, error } = await admin
    .from('express_oficios')
    .insert(payload)
    .select('*')
    .single()
  if (error || !data) {
    throw new Error(
      `insertExpressOficio: ${error?.message ?? 'no row returned'}`
    )
  }
  return data as unknown as ExpressOficioRow
}

/** Fetch one `express_oficios` row by id, or null. */
export async function getExpressOficio(
  admin: ExpressAdminClient,
  id: string
): Promise<ExpressOficioRow | null> {
  const { data, error } = await admin
    .from('express_oficios')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getExpressOficio: ${error.message}`)
  return (data as unknown as ExpressOficioRow) ?? null
}

export interface UpdateExpressOficioPatch {
  status?: 'draft' | 'confirmed'
  pdf_path?: string | null
  signal_id?: string | null
  draft?: ExpressDraft
}

/** Patch an `express_oficios` row (status/pdf_path/signal_id/draft). */
export async function updateExpressOficio(
  admin: ExpressAdminClient,
  id: string,
  patch: UpdateExpressOficioPatch
): Promise<void> {
  const { error } = await admin
    .from('express_oficios')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(`updateExpressOficio: ${error.message}`)
}

/** Upload the oficio PDF buffer to the private evidence bucket. */
export async function uploadOficioPdf(
  admin: ExpressAdminClient,
  path: string,
  pdf: Buffer
): Promise<{ error: string | null }> {
  const { error } = await admin.storage.from(OFICIO_BUCKET).upload(path, pdf, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'application/pdf',
  })
  return { error: error?.message ?? null }
}

/** Create a short-lived signed URL for a stored oficio PDF. */
export async function signedOficioUrl(
  admin: ExpressAdminClient,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await admin.storage
    .from(OFICIO_BUCKET)
    .createSignedUrl(path, expiresInSeconds, { download: true })
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
