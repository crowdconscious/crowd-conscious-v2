/** Cicéron demo constants (Prompt 2). */
export const CICERON_BASE = '/ciceron'

/**
 * Primary demo invite (socio). Additional codes live in
 * `ciceron.demo_personas` / `lib/ciceron/db/seed-ids.ts` inviteCodes.
 * Prompt 9 replaces plaintext with hashed codes.
 */
export const CICERON_DEMO_INVITE_CODE = 'DESPACHO-DEMO'

/**
 * Cookie value = opaque session token (Prompt 9) or legacy/offline invite code.
 * Server resolves via redeem_invite / resolve_demo_session (hashed).
 */
export const CICERON_DEMO_COOKIE = 'ciceron_demo_session'

import { FIRM_DISPLAY_NAME } from '@/lib/ciceron/demo/display-names'

export const CICERON_FIRM_NAME = FIRM_DISPLAY_NAME

export const CICERON_DEMO_LABEL = 'Datos de demostración'

/**
 * Firm bulletin coordination wall-clock (America/Mexico_City, 24 h).
 * No DB table — configuration only (B6 C3).
 */
export const CICERON_BULLETIN_CLOCK = {
  objetivo: '09:30',
  respaldo: '10:00',
  limite: '12:00',
} as const

export const CICERON_ROOMS = [
  { href: `${CICERON_BASE}/hoy`, id: 'hoy', badge: 3 },
  { href: `${CICERON_BASE}/boletines`, id: 'boletines', badge: 4 },
  { href: `${CICERON_BASE}/monitor-dof`, id: 'monitor-dof', badge: 2 },
  { href: `${CICERON_BASE}/expedientes`, id: 'expedientes', badge: 1 },
  { href: `${CICERON_BASE}/investigacion`, id: 'investigacion', badge: 0 },
  { href: `${CICERON_BASE}/revision`, id: 'revision', badge: 2 },
  { href: `${CICERON_BASE}/clientes`, id: 'clientes', badge: 0 },
] as const

export type CiceronRoomId = (typeof CICERON_ROOMS)[number]['id']
