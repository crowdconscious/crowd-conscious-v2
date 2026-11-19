/**
 * Self-explanatory empty-state copy from live demo counts.
 */

export type EmptyHoyInput = {
  matterCount: number
  bulletinsReviewed: number
  consultedAtHm: string | null
}

export type EmptyHitsInput = {
  statesChecked: number
  consultedAtHm: string | null
}

export function buildEmptyHoyMessage(input: EmptyHoyInput): string {
  const matters = Math.max(0, Math.floor(input.matterCount))
  const reviewed = Math.max(0, Math.floor(input.bulletinsReviewed))
  const time = input.consultedAtHm?.trim()
  if (matters === 0) {
    return 'Hoy no hubo movimientos. Aún no hay asuntos cargados en la demostración.'
  }
  if (reviewed === 0) {
    return `Hoy no hubo movimientos en sus ${matters} asuntos.`
  }
  if (time) {
    return `Hoy no hubo movimientos en sus ${matters} asuntos. Revisamos ${reviewed} boletines a las ${time}.`
  }
  return `Hoy no hubo movimientos en sus ${matters} asuntos. Revisamos ${reviewed} boletines.`
}

export function buildEmptyHitsMessage(input: EmptyHitsInput): string {
  const states = Math.max(0, Math.floor(input.statesChecked))
  const time = input.consultedAtHm?.trim()
  if (states === 0) {
    return 'Sin coincidencias. Todavía no hay entidades consultadas hoy.'
  }
  if (time) {
    return `Sin coincidencias en las ${states} entidades consultadas a las ${time}.`
  }
  return `Sin coincidencias en las ${states} entidades consultadas hoy.`
}
