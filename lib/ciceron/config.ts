/** Cicéron demo constants (Prompt 2). */
export const CICERON_BASE = '/ciceron'

/** Stub invite for Prompt 2 — Prompt 9 replaces with hashed codes. */
export const CICERON_DEMO_INVITE_CODE = 'DESPACHO-DEMO'

export const CICERON_DEMO_COOKIE = 'ciceron_demo_session'

export const CICERON_FIRM_NAME = 'Despacho Demo, S.C.'

export const CICERON_DEMO_LABEL = 'Datos de demostración'

export const CICERON_ROOMS = [
  { href: `${CICERON_BASE}/hoy`, id: 'hoy', badge: 3 },
  { href: `${CICERON_BASE}/monitor-dof`, id: 'monitor-dof', badge: 2 },
  { href: `${CICERON_BASE}/expedientes`, id: 'expedientes', badge: 1 },
  { href: `${CICERON_BASE}/investigacion`, id: 'investigacion', badge: 0 },
  { href: `${CICERON_BASE}/revision`, id: 'revision', badge: 2 },
  { href: `${CICERON_BASE}/clientes`, id: 'clientes', badge: 0 },
] as const

export type CiceronRoomId = (typeof CICERON_ROOMS)[number]['id']
