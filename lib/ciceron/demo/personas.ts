import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { CICERON_FIRM_NAME } from '@/lib/ciceron/config'
import { CICERON_P9_SEED } from '@/lib/ciceron/demo/seed-ids'
import {
  isPublicDemoInviteCode,
  PUBLIC_DEMO_INVITE_CODES,
} from '@/lib/ciceron/demo/invite-hash'

/** Offline persona map — used when PostgREST/schema is unreachable. */
export type DemoPersona = {
  id: string
  firmId: string
  role: CiceronMembershipRole
  displayName: string
  /**
   * Offline redeem key. Only intentionally public codes are redeemable offline;
   * others use non-redeemable placeholders (never admin).
   */
  inviteCode: string
  firmName: string
  firmSlug: string
  /** Prompt 9: access model showcase tag for UI. */
  accessModel?: 'rbac' | 'abac'
}

const OFFLINE: DemoPersona[] = [
  {
    id: CICERON_SEED.personas.socio,
    firmId: CICERON_SEED.firmDemo,
    role: 'socio',
    displayName: 'Socia Demo Rivera',
    inviteCode: PUBLIC_DEMO_INVITE_CODES[0],
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
    accessModel: 'rbac',
  },
  {
    id: CICERON_SEED.personas.asociado,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociado Demo Herrera',
    inviteCode: 'nr-asociado-b1002',
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.pasante,
    firmId: CICERON_SEED.firmDemo,
    role: 'pasante',
    displayName: 'Pasante Demo López',
    inviteCode: PUBLIC_DEMO_INVITE_CODES[1],
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.admin,
    firmId: CICERON_SEED.firmDemo,
    role: 'admin',
    displayName: 'Admin Demo Ortega',
    inviteCode: 'nr-admin-b1004',
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.asociado2,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociada Demo Méndez',
    inviteCode: 'nr-asociado2-b1005',
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.coordinador,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Coordinador Demo Salazar',
    inviteCode: 'nr-coordinador-b1006',
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
    accessModel: 'rbac',
  },
  {
    id: CICERON_P9_SEED.personas.abacAsociado,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociada Atributos Vega',
    inviteCode: CICERON_P9_SEED.abacPersonaInvitePlaceholder,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
    accessModel: 'abac',
  },
  {
    id: CICERON_SEED.personas.firmB,
    firmId: CICERON_SEED.firmContraste,
    role: 'socio',
    displayName: 'Abogado Contraste Núñez',
    inviteCode: 'nr-firmb-b1011',
    firmName: 'Bufete Contraste, S.C.',
    firmSlug: 'bufete-contraste',
  },
]

/**
 * Offline invite redeem: only intentionally public codes, never admin.
 */
export function offlinePersonaByInvite(code: string): DemoPersona | null {
  const normalized = code.trim().toUpperCase()
  if (!isPublicDemoInviteCode(normalized)) return null
  const persona = OFFLINE.find((p) => p.inviteCode === normalized) ?? null
  if (!persona || persona.role === 'admin') return null
  return persona
}

export function offlinePersonaById(id: string): DemoPersona | null {
  return OFFLINE.find((p) => p.id === id) ?? null
}

/** Persona switcher roles. Admin only when the opening invite was an admin mint. */
export function offlineSwitchablePersonas(
  firmId: string,
  opts?: { includeAdmin?: boolean }
): DemoPersona[] {
  const preferred: CiceronMembershipRole[] = opts?.includeAdmin
    ? ['socio', 'asociado', 'pasante', 'admin']
    : ['socio', 'asociado', 'pasante']
  const byRole = new Map<string, DemoPersona>()
  for (const p of OFFLINE) {
    if (p.firmId !== firmId) continue
    if (!preferred.includes(p.role)) continue
    if (!byRole.has(p.role) || p.accessModel === 'rbac') {
      byRole.set(p.role, p)
    }
  }
  const asociado = OFFLINE.find(
    (p) => p.firmId === firmId && p.id === CICERON_SEED.personas.asociado
  )
  if (asociado) byRole.set('asociado', asociado)
  const base = preferred.map((r) => byRole.get(r)).filter(Boolean) as DemoPersona[]
  const coordinador = OFFLINE.find(
    (p) => p.firmId === firmId && p.id === CICERON_SEED.personas.coordinador
  )
  if (coordinador && !base.some((p) => p.id === coordinador.id)) {
    base.push(coordinador)
  }
  return base
}

export function roleLabel(role: CiceronMembershipRole, personaId?: string): string {
  if (personaId === CICERON_SEED.personas.coordinador) return 'Coordinador'
  switch (role) {
    case 'socio':
      return 'Socia'
    case 'asociado':
      return 'Asociado'
    case 'pasante':
      return 'Pasante'
    case 'admin':
      return 'Administrador'
  }
}
