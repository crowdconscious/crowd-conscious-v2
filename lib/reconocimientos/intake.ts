import {
  ALLOWED_IMAGE_TYPES,
  CONSENT_VERSION,
  MAX_PHOTO_BYTES,
  type HowKnown,
  type WhoType,
} from './constants'
import { processRecognitionPhoto } from './image'
import { generateShareSlug } from './slug'
import { insertRecognition, uploadRecognitionPhoto } from './db'
import type { RecognitionStatus } from './constants'

export type IntakePhotoInput = {
  buffer: Buffer
  contentType: string
  size: number
}

export type CreateRecognitionFields = {
  what: string
  where_text: string
  who_type: WhoType
  how_known: HowKnown
  credit_handle?: string | null
  contact?: string | null
  src: string
  user_id?: string | null
  photo: IntakePhotoInput
  /** Defaults to web ALLOWED_IMAGE_TYPES. App endpoint may pass JPEG-only. */
  allowedImageTypes?: readonly string[]
}

export type CreateRecognitionOk = {
  ok: true
  id: string
  status: RecognitionStatus
  share_slug: string
}

export type CreateRecognitionErr = {
  ok: false
  error: string
  field?: string
  httpStatus: 400
}

/**
 * Shared recognition intake: validate photo → process → upload → insert pending.
 * Callers must validate consent + text fields first (consent-before-storage).
 */
export async function createRecognitionSubmission(
  fields: CreateRecognitionFields
): Promise<CreateRecognitionOk | CreateRecognitionErr> {
  const allowed = fields.allowedImageTypes ?? ALLOWED_IMAGE_TYPES
  if (!(allowed as readonly string[]).includes(fields.photo.contentType)) {
    return {
      ok: false,
      error: 'Formato no válido',
      field: 'photo',
      httpStatus: 400,
    }
  }
  if (fields.photo.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: 'La foto supera 10 MB',
      field: 'photo',
      httpStatus: 400,
    }
  }

  let processed
  try {
    processed = await processRecognitionPhoto(fields.photo.buffer)
  } catch (err) {
    console.error('[reconocimientos/intake] image', err)
    return {
      ok: false,
      error:
        'No pudimos procesar la imagen. Prueba JPG o PNG (HEIC a veces falla).',
      field: 'photo',
      httpStatus: 400,
    }
  }

  const shareSlug = generateShareSlug()
  const photoPath = `originals/${shareSlug}-${Date.now()}.jpg`
  await uploadRecognitionPhoto(photoPath, processed.buffer, processed.contentType)

  const row = await insertRecognition({
    user_id: fields.user_id ?? null,
    photo_path: photoPath,
    what: fields.what,
    where_text: fields.where_text,
    who_type: fields.who_type,
    how_known: fields.how_known,
    credit_handle: fields.credit_handle ?? null,
    contact: fields.contact ?? null,
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    src: fields.src,
    status: 'pending',
    share_slug: shareSlug,
  })

  return {
    ok: true,
    id: row.id,
    status: row.status,
    share_slug: row.share_slug,
  }
}

/** App caption length gate (stricter than DB check of ≥1). */
export const APP_CAPTION_MIN = 8
export const APP_CAPTION_MAX = 280

/** Defaults for columns the app contract does not collect. */
export const APP_DEFAULT_WHO_TYPE: WhoType = 'lugar_negocio'
export const APP_DEFAULT_HOW_KNOWN: HowKnown = 'en_persona'
