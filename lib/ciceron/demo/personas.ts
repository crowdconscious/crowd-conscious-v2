import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { CICERON_FIRM_NAME } from '@/lib/ciceron/config'
import { CICERON_P9_SEED } from '@/lib/ciceron/demo/seed-ids'

/** Offline persona map — used when PostgREST/schema is unreachable. */
export type DemoPersona = {
  id: string
  firmId: string
  role: CiceronMembershipRole
  displayName: string
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
    inviteCode: CICERON_SEED.inviteCodes.socio,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
    accessModel: 'rbac',
  },
  {
    id: CICERON_SEED.personas.asociado,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociado Demo Herrera',
    inviteCode: CICERON_SEED.inviteCodes.asociado,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.pasante,
    firmId: CICERON_SEED.firmDemo,
    role: 'pasante',
    displayName: 'Pasante Demo López',
    inviteCode: CICERON_SEED.inviteCodes.pasante,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.admin,
    firmId: CICERON_SEED.firmDemo,
    role: 'admin',
    displayName: 'Admin Demo Ortega',
    inviteCode: CICERON_SEED.inviteCodes.admin,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_SEED.personas.asociado2,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociada Demo Méndez',
    inviteCode: CICERON_SEED.inviteCodes.asociado2,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
  },
  {
    id: CICERON_P9_SEED.personas.abacAsociado,
    firmId: CICERON_SEED.firmDemo,
    role: 'asociado',
    displayName: 'Asociada Atributos Vega',
    inviteCode: CICERON_P9_SEED.plaintextInvites.abac,
    firmName: CICERON_FIRM_NAME,
    firmSlug: 'despacho-demo',
    accessModel: 'abac',
  },
  {
    id: CICERON_SEED.personas.firmB,
    firmId: CICERON_SEED.firmContraste,
    role: 'socio',
    displayName: 'Abogado Contraste Núñez',
    inviteCode: CICERON_SEED.inviteCodes.firmB,
    firmName: 'Bufete Contraste, S.C.',
    firmSlug: 'bufete-contraste',
  },
]

export function offlinePersonaByInvite(code: string): DemoPersona | null {
  const normalized = code.trim().toUpperCase()
  return OFFLINE.find((p) => p.inviteCode === normalized) ?? null
}

export function offlinePersonaById(id: string): DemoPersona | null {
  return OFFLINE.find((p) => p.id === id) ?? null
}

/** Persona switcher: Socia, Asociado, Pasante for the demo firm. */
export function offlineSwitchablePersonas(firmId: string): DemoPersona[] {
  const preferred = ['socio', 'asociado', 'pasante'] as const
  const byRole = new Map<string, DemoPersona>()
  for (const p of OFFLINE) {
    if (p.firmId !== firmId) continue
    if (!preferred.includes(p.role as (typeof preferred)[number])) continue
    // Prefer the canonical showcase personas (socio / asociado Herrera / pasante)
    if (!byRole.has(p.role) || p.accessModel === 'rbac') {
      byRole.set(p.role, p)
    }
  }
  // Prefer Asociado Demo Herrera over ABAC for the switcher middle slot
  const asociado = OFFLINE.find(
    (p) =>
      p.firmId === firmId &&
      p.id === CICERON_SEED.personas.asociado
  )
  if (asociado) byRole.set('asociado', asociado)
  return preferred.map((r) => byRole.get(r)).filter(Boolean) as DemoPersona[]
}

export function roleLabel(role: CiceronMembershipRole): string {
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
