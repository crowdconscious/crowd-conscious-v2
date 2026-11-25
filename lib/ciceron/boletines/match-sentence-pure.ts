/**
 * Pure helpers for sentence-style bulletin match cards.
 */

export type MatchSentenceInput = {
  clientName: string | null
  clientSideLabel: string | null
  courtName: string | null
  requirement: string | null
  publicationDateLabel: string | null
  expedienteNumber: string | null
  deadlineLabel: string | null
}

export type MatchSentenceParts = {
  client: string
  side: string | null
  court: string
  requirement: string
  meta: string
}

export function buildMatchSentenceParts(input: MatchSentenceInput): MatchSentenceParts {
  const client = (input.clientName ?? '').trim() || 'Cliente'
  const court = (input.courtName ?? '').trim() || 'Tribunal no indicado'
  const requirement =
    (input.requirement ?? '')
      .trim()
      .replace(/^Datos de demostración\.\s*/i, '')
      .replace(/\s*Datos de demostración\.?\s*$/i, '')
      .trim() || 'Acuerdo publicado en la lista'
  const metaBits: string[] = []
  if (input.expedienteNumber?.trim()) {
    metaBits.push(`Exp. ${input.expedienteNumber.trim()}`)
  }
  if (input.publicationDateLabel?.trim()) {
    metaBits.push(`Publicado el ${input.publicationDateLabel.trim()}`)
  }
  if (input.deadlineLabel?.trim()) {
    metaBits.push(`Plazo: ${input.deadlineLabel.trim()}`)
  }
  return {
    client,
    side: input.clientSideLabel?.trim() || null,
    court,
    requirement,
    meta: metaBits.join(' · '),
  }
}

export type MatchCardAction = {
  id: 'open' | 'capture' | 'review' | 'source'
  href: string
  external?: boolean
}

/** Primary = open expediente when available, otherwise capture. */
export function pickMatchPrimaryAction(opts: {
  caseFileId: string | null
  sourceUrl: string | null
  /** In-app local viewer; preferred over external sourceUrl when set. */
  localFuenteHref?: string | null
}): { primary: MatchCardAction; secondary: MatchCardAction[] } {
  const secondary: MatchCardAction[] = [
    { id: 'capture', href: '/ciceron/expedientes/captura' },
    { id: 'review', href: '/ciceron/revision' },
  ]
  if (opts.localFuenteHref) {
    secondary.push({ id: 'source', href: opts.localFuenteHref, external: false })
  } else if (opts.sourceUrl) {
    secondary.push({ id: 'source', href: opts.sourceUrl, external: true })
  }
  if (opts.caseFileId) {
    return {
      primary: {
        id: 'open',
        href: `/ciceron/expedientes/${opts.caseFileId}`,
      },
      secondary,
    }
  }
  return {
    primary: { id: 'capture', href: '/ciceron/expedientes/captura' },
    secondary: secondary.filter((a) => a.id !== 'capture'),
  }
}
