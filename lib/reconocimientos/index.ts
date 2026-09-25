export {
  CONSENT_VERSION,
  CONSENT_TEXT_ES,
  WHO_TYPES,
  WHO_TYPE_LABELS_ES,
  HOW_KNOWN,
  HOW_KNOWN_LABELS_ES,
  RECOGNITION_STATUSES,
  MAX_WHAT_LEN,
  MAX_WHERE_LEN,
  MAX_CREDIT_LEN,
  MAX_CONTACT_LEN,
  MAX_PHOTO_BYTES,
  MAX_IMAGE_EDGE,
  ALLOWED_IMAGE_TYPES,
  STORAGE_BUCKET,
  SHARE_CTA_TEXT_ES,
  SHARE_CTA_PATH,
  RECOGNITION_EVENT_TYPES,
  type WhoType,
  type HowKnown,
  type RecognitionStatus,
  type RecognitionEventType,
} from './constants'

export {
  isReconocimientosEnabled,
  getReconocimientosIntakeUrl,
  getReconocimientosConfig,
  withReconocimientosSrc,
  sanitizeSrc,
  type ReconocimientosConfig,
} from './config'

export { generateShareSlug, clampText, isNonEmptyString } from './slug'
export { processRecognitionPhoto, type ProcessedRecognitionPhoto } from './image'
export type {
  RecognitionRow,
  RecognitionPublic,
  RecognitionInsert,
} from './types'
export {
  insertRecognition,
  getPublicRecognitionBySlug,
  getRecognitionById,
  listRecognitions,
  updateRecognitionStatus,
  uploadRecognitionPhoto,
  downloadRecognitionPhoto,
  createSignedPhotoUrl,
  listApprovedPublic,
  insertRecognitionEvent,
  getRecognitionIdByShareSlug,
  getWeeklyRecognitionStats,
  getRecognitionEventCounts,
} from './db'

/** Ensure a public URL carries src=share (for share buttons / OG landings). */
export function withShareSrc(url: string): string {
  const parsed = new URL(url)
  parsed.searchParams.set('src', 'share')
  return parsed.toString()
}
