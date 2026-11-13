/** Fixed seed ids from 302_ciceron_seed_prod_safe.sql (Datos de demostración). */
export const CICERON_SEED = {
  firmDemo: 'a1000000-0000-4000-8000-000000000001',
  firmContraste: 'a1000000-0000-4000-8000-000000000002',
  personas: {
    socio: 'b1000000-0000-4000-8000-000000000001',
    asociado: 'b1000000-0000-4000-8000-000000000002',
    pasante: 'b1000000-0000-4000-8000-000000000003',
    admin: 'b1000000-0000-4000-8000-000000000004',
    asociado2: 'b1000000-0000-4000-8000-000000000005',
    /** Coordinador desk — membership role remains asociado (RBAC). */
    coordinador: 'b1000000-0000-4000-8000-000000000006',
    firmB: 'b1000000-0000-4000-8000-000000000011',
  },
  /** @deprecated use personas — kept for isolation.test aliases */
  users: {
    socio: 'b1000000-0000-4000-8000-000000000001',
    asociado: 'b1000000-0000-4000-8000-000000000002',
    pasante: 'b1000000-0000-4000-8000-000000000003',
    admin: 'b1000000-0000-4000-8000-000000000004',
    asociado2: 'b1000000-0000-4000-8000-000000000005',
    coordinador: 'b1000000-0000-4000-8000-000000000006',
    firmB: 'b1000000-0000-4000-8000-000000000011',
  },
  inviteCodes: {
    socio: 'DESPACHO-DEMO',
    asociado: 'DESPACHO-ASOCIADO',
    pasante: 'DESPACHO-PASANTE',
    admin: 'DESPACHO-ADMIN',
    asociado2: 'DESPACHO-ASOCIADO2',
    firmB: 'CONTRASTE-DEMO',
  },
  clients: {
    nexora: 'c1000000-0000-4000-8000-000000000001',
    firmB: 'c1000000-0000-4000-8000-000000000101',
  },
  matters: {
    nexoraCnbv: 'd1000000-0000-4000-8000-000000000001',
    nexoraPld: 'd1000000-0000-4000-8000-000000000002',
    farmaCofepris: 'd1000000-0000-4000-8000-000000000003',
    vientoCre: 'd1000000-0000-4000-8000-000000000004',
    firmBUnico: 'd1000000-0000-4000-8000-000000000008',
  },
  clientsExtra: {
    farma: 'c1000000-0000-4000-8000-000000000002',
    viento: 'c1000000-0000-4000-8000-000000000003',
  },
} as const
