/** Prompt 9 fixed seed ids (prefix e3). Valid hex UUIDs. No plaintext invites. */
export const CICERON_P9_SEED = {
  inviteCodes: {
    /** Intentionally public demo invites only (hashed in 317). */
    socio: 'e3000000-0000-4000-8000-000000000001',
    pasante: 'e3000000-0000-4000-8000-000000000002',
  },
  personas: {
    /** ABAC showcase asociado — access from attributes, not firm-wide role alone. */
    abacAsociado: 'e3000000-0000-4000-8000-000000000010',
  },
  /** Non-redeemable placeholder stored on demo_personas.invite_code for e3…010. */
  abacPersonaInvitePlaceholder: 'nr-e3000000000000000000000000000010',
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
} as const
