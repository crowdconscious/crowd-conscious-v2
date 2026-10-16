/**
 * Lugar Consciente is dark until migration 289 is applied in prod.
 * Set LUGAR_CONSCIENTE_ENABLED=true (server env) to turn on the owner panel,
 * the pledge APIs and the daily cron. Public pages render empty states without it.
 */
export const LUGAR_CONSCIENTE_ENABLED = process.env.LUGAR_CONSCIENTE_ENABLED === 'true'
