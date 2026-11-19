/**
 * Plain-Spanish «Qué cambió» before/after for match cards.
 */

export type QueCambioInput = {
  clientName: string | null
  summary: string | null
  matchKind: 'exact' | 'possible'
  courtName: string | null
  expedienteNumber: string | null
}

export type QueCambioParts = {
  before: string
  after: string
  legalDetail: string
}

function cleanSummary(raw: string | null): string {
  return (raw ?? '')
    .trim()
    .replace(/^Datos de demostración\.\s*/i, '')
    .replace(/\s*Datos de demostración\.?\s*$/i, '')
    .trim()
}

export function buildQueCambio(input: QueCambioInput): QueCambioParts {
  const client = (input.clientName ?? '').trim() || 'Su cliente'
  const court = (input.courtName ?? '').trim() || 'el tribunal'
  const exp = (input.expedienteNumber ?? '').trim()
  const summary = cleanSummary(input.summary) || 'un acuerdo publicado en la lista'

  const before =
    input.matchKind === 'possible'
      ? `Antes: ${client} no tenía una coincidencia clara en ${court}.`
      : `Antes: ${client} no tenía movimiento publicado hoy en ${court}.`

  const after = exp
    ? `Ahora: aparece en el expediente ${exp}: ${summary}`
    : `Ahora: aparece en la lista de ${court}: ${summary}`

  const legalDetail = [
    exp ? `Expediente ${exp}.` : null,
    `Tribunal: ${court}.`,
    `Texto publicado: ${summary}`,
    'Informativo: no constituye notificación judicial.',
  ]
    .filter(Boolean)
    .join(' ')

  return { before, after, legalDetail }
}
