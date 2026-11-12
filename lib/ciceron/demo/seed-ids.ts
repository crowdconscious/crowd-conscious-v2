/** Prompt 9 fixed seed ids (prefix e3). Valid hex UUIDs. */
export const CICERON_P9_SEED = {
  inviteCodes: {
    socio: 'e3000000-0000-4000-8000-000000000001',
    pasante: 'e3000000-0000-4000-8000-000000000002',
    asociado: 'e3000000-0000-4000-8000-000000000003',
    admin: 'e3000000-0000-4000-8000-000000000004',
    asociado2: 'e3000000-0000-4000-8000-000000000005',
    firmB: 'e3000000-0000-4000-8000-000000000006',
    abac: 'e3000000-0000-4000-8000-000000000007',
  },
  personas: {
    /** ABAC showcase asociado — access from attributes, not firm-wide role alone. */
    abacAsociado: 'e3000000-0000-4000-8000-000000000010',
  },
  documents: {
    interno: 'e3000000-0000-4000-8000-000000000021',
    restringido: 'e3000000-0000-4000-8000-000000000022',
    confidencialExpired: 'e3000000-0000-4000-8000-000000000023',
  },
  conflict: 'e3000000-0000-4000-8000-000000000030',
  grants: {
    liveRestricted: 'e3000000-0000-4000-8000-000000000040',
    expiredConfidential: 'e3000000-0000-4000-8000-000000000041',
  },
  plaintextInvites: {
    socio: 'DESPACHO-DEMO',
    pasante: 'DESPACHO-PASANTE',
    abac: 'DESPACHO-ABAC',
  },
} as const
