/** Honest corpus coverage for Investigación. Prefer live DB counts when available. */

/** Fallback dates when the database is unreachable (offline demo). */
export const CICERON_CORPUS_DOF_DATES = [
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-09',
  '2026-11-10',
] as const

export type CorpusCoverageStats = {
  dates: string[]
  lastUpdatedAt?: string | null
}

export function corpusCoverageLineFromStats(
  stats: CorpusCoverageStats,
  locale: 'es' = 'es'
): string {
  const sorted = [...new Set(stats.dates)].filter(Boolean).sort()
  if (!sorted.length) {
    return locale === 'es'
      ? 'Corpus actual: aún no hay ediciones del Diario Oficial incorporadas.'
      : 'Current corpus: no DOF editions incorporated yet.'
  }
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const updated = stats.lastUpdatedAt
    ? ` Última actualización: ${formatEsDateTime(stats.lastUpdatedAt)}.`
    : ''
  if (locale === 'es') {
    return `Corpus actual: DOF del ${formatEs(first)} al ${formatEs(last)} (${sorted.length} ediciones incorporadas).${updated}`
  }
  return `Current corpus: DOF ${first}–${last} (${sorted.length} editions).${updated}`
}

export function corpusCoverageLine(locale: 'es' = 'es'): string {
  return corpusCoverageLineFromStats(
    { dates: [...CICERON_CORPUS_DOF_DATES] },
    locale
  )
}

function formatEs(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  return dt.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatEsDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

export function embeddingsDegradedMessage(): string {
  return 'Búsqueda semántica degradada: el servicio de embeddings no está disponible. Se usa solo coincidencia léxica sobre el corpus del Diario Oficial incorporado.'
}
