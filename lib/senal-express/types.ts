/**
 * Shared Señal Express types — the LLM draft shape, the (unapplied-migration)
 * row shape, and the draft/confirm API request/response contracts.
 */

import type { ExpressCategory } from './category-map'
import type { LaunchAlcaldia } from '@/lib/geo/cdmx'

/**
 * Strict-JSON output of the draft LLM call (§7.1). `categoria_normalizada` is
 * the model echoing back a canonical `SIGNAL_CATEGORIES` value; the confirm
 * step still maps deterministically from the chosen chip and does not trust
 * this field for routing — it is stored for audit only.
 */
export interface ExpressDraft {
  asunto: string
  cuerpo_parrafos: string[]
  peticion: string
  categoria_normalizada: string
}

/**
 * Row shape for `express_oficios` (migration 255).
 *
 * TODO(once 255 applied + types injected into types/database.ts): drop this
 * interface and the `as unknown as` casts in `db.ts` in favour of
 * `Database['public']['Tables']['express_oficios']['Row' | 'Insert']`.
 */
export interface ExpressOficioRow {
  id: string
  signal_id: string | null
  user_id: string | null
  device_id: string | null
  alcaldia: string
  category: string
  input_sentence: string
  draft: ExpressDraft
  pdf_path: string | null
  status: 'draft' | 'confirmed'
  created_at: string
}

// ---- Draft API contract ----------------------------------------------------

export interface DraftRequestBody {
  deviceId: string
  alcaldia: LaunchAlcaldia
  category: ExpressCategory
  sentence: string
  colonia?: string | null
  streetReference?: string | null
  hasPhoto?: boolean
  locale: 'es' | 'en'
}

export interface DraftDestinatario {
  titulo: string
  dependencia: string
  /** Omitted (null) while still the TODO_FILL_FROM_OFFICIAL_SOURCE placeholder. */
  direccion: string | null
  email: string | null
}

export interface DraftResponseBody {
  oficioId: string
  draft: ExpressDraft
  destinatario: DraftDestinatario
}

// ---- Confirm API contract --------------------------------------------------

export interface ConfirmRequestBody {
  oficioId: string
  deviceId: string
  /** Typed sender name; when empty the oficio signs "Vecina/o de {colonia}". */
  senderName?: string | null
  /** Editable oficio fields (plain text) coming back from the review screen. */
  asunto: string
  cuerpo: string
  peticion: string
  colonia?: string | null
  streetReference?: string | null
  /** storage_path from POST /api/signals/upload; attached as señal evidence. */
  photoStoragePath?: string | null
  locale: 'es' | 'en'
}

export interface ConfirmResponseBody {
  pdfUrl: string
  signalCreated: boolean
  signalSlug?: string | null
  /**
   * True when the caller is logged in but señal publishing is unavailable
   * (SIGNALS_ENABLED off, or the routed target/location could not be resolved).
   * The PDF is still returned; the UI shows a "publicación no disponible" note.
   */
  publishUnavailable?: boolean
}
