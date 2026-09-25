/**
 * Reconocimientos — constants, consent copy, and option labels (Spanish-first).
 */

export const CONSENT_VERSION = 'v1-2026-09-25' as const

/**
 * Versioned consent text shown next to the required checkbox on /reconoce.
 * Pending Francisco legal review — keep as a single constant.
 */
export const CONSENT_TEXT_ES =
  'Al enviar, autorizas a Crowd Conscious a publicar tu foto y descripción en la app, el sitio y redes sociales, con crédito a tu usuario si lo das. Confirmas que la foto es tuya o tienes permiso, que las personas que aparecen están de acuerdo, y que no aparecen menores identificables. Puedes pedir que la retiremos en cualquier momento.'

export const WHO_TYPES = [
  'lugar_negocio',
  'evento',
  'colectivo_vecinos',
  'escuela',
  'gobierno_alcaldia',
  'otro',
] as const

export type WhoType = (typeof WHO_TYPES)[number]

export const WHO_TYPE_LABELS_ES: Record<WhoType, string> = {
  lugar_negocio: 'Lugar / negocio',
  evento: 'Evento',
  colectivo_vecinos: 'Colectivo / vecinos',
  escuela: 'Escuela',
  gobierno_alcaldia: 'Gobierno / alcaldía',
  otro: 'Otro',
}

export const HOW_KNOWN = ['en_persona', 'me_contaron', 'soy_parte'] as const

export type HowKnown = (typeof HOW_KNOWN)[number]

export const HOW_KNOWN_LABELS_ES: Record<HowKnown, string> = {
  en_persona: 'En persona',
  me_contaron: 'Me contaron',
  soy_parte: 'Soy parte',
}

export const RECOGNITION_STATUSES = ['pending', 'approved', 'rejected'] as const
export type RecognitionStatus = (typeof RECOGNITION_STATUSES)[number]

export const MAX_WHAT_LEN = 280
export const MAX_WHERE_LEN = 200
export const MAX_CREDIT_LEN = 80
export const MAX_CONTACT_LEN = 200
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_EDGE = 2048

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export const STORAGE_BUCKET = 'recognitions'

/** CTA on public recognition pages + share cards (no confirmation promise). */
export const SHARE_CTA_TEXT_ES =
  '¿Conoces algo así? Reconócelo en crowdconscious.app/reconoce'

export const SHARE_CTA_PATH = '/reconoce?src=share'

export const RECOGNITION_EVENT_TYPES = [
  'share_whatsapp',
  'share_native',
  'share_copy',
  'card_download_portrait',
  'card_download_story',
] as const

export type RecognitionEventType = (typeof RECOGNITION_EVENT_TYPES)[number]
