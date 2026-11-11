/** Honest corpus coverage for Investigación (Prompt 5). DOF scraping cron is OFF. */

export const CICERON_CORPUS_DOF_DATES = [
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-09',
  '2026-11-10',
] as const

export function corpusCoverageLine(locale: 'es' = 'es'): string {
  const sorted = [...CICERON_CORPUS_DOF_DATES].sort()
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (locale === 'es') {
    return `Corpus actual: DOF de los días ${formatEs(first!)} al ${formatEs(last!)} (${sorted.length} ediciones ya ingeridas; sin scrapeo programado).`
  }
  return `Current corpus: DOF ${first}–${last} (${sorted.length} editions; scheduled scrape off).`
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

export function embeddingsDegradedMessage(): string {
  return 'Búsqueda semántica degradada: el AI Gateway de embeddings no está disponible. Se usa solo coincidencia léxica sobre el corpus DOF ingerido.'
}
