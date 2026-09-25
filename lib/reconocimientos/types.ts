import type { HowKnown, RecognitionStatus, WhoType } from './constants'

/** Row shape for the recognitions table (keep in sync with migration 263). */
export type RecognitionRow = {
  id: string
  created_at: string
  user_id: string | null
  photo_path: string
  what: string
  where_text: string
  who_type: WhoType
  how_known: HowKnown
  credit_handle: string | null
  contact: string | null
  consent_at: string
  consent_version: string
  src: string
  status: RecognitionStatus
  reviewed_at: string | null
  reviewed_by: string | null
  reject_reason: string | null
  share_slug: string
}

/** Public-safe fields (matches recognitions_public view). */
export type RecognitionPublic = {
  id: string
  created_at: string
  photo_path: string
  what: string
  where_text: string
  who_type: WhoType
  how_known: HowKnown
  credit_handle: string | null
  src: string
  share_slug: string
  reviewed_at: string | null
}

export type RecognitionInsert = {
  user_id?: string | null
  photo_path: string
  what: string
  where_text: string
  who_type: WhoType
  how_known: HowKnown
  credit_handle?: string | null
  contact?: string | null
  consent_at: string
  consent_version: string
  src?: string
  status?: RecognitionStatus
  share_slug: string
}
