import type { CiceronMembershipRole } from '@/lib/ciceron/db/types'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { CICERON_FIRM_NAME } from '@/lib/ciceron/config'

/** Offline persona map — used when PostgREST/schema is unreachable. */
export type DemoPersona = {
  id: string
  firmId: string
  role: CiceronMembershipRole
  displayName: string
  inviteCode: string
  firmName: string
  firmSlug: string
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
