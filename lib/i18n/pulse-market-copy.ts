/**
 * Vote / market copy hub.
 *
 * Up to Prompt 5 (April 29, 2026) this file branched on `isPulse` to produce
 * different verbs ("Opinar" for pulses, "Predecir" for prediction markets)
 * and noun forms ("opiniones" vs "votos"). Per the unified-verb decision
 * everything user-facing now collapses to "Votar / voto" — the `isPulse`
 * argument is preserved on every helper so call-sites don't break, but it's
 * intentionally unused for the verb-related strings.
 *
 * If you want different copy for pulse vs market again in the future,
 * surface it through a *separate* helper rather than re-forking these
 * primitives.
 */
export function isPulseLikeMarket(m: {
  is_pulse?: boolean | null
  category?: string | null
  market_type?: string | null
}): boolean {
  if (m.is_pulse === true) return true
  if (m.category === 'pulse') return true
  return m.market_type === 'multi' && m.category === 'government'
}

export type PulseMarketCopyLocale = 'es' | 'en'

export function voteActionCopy(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  const es = locale === 'es'
  return {
    predictVerb: es ? 'Votar' : 'Vote',
    updateVerb: es ? 'Actualizar voto' : 'Update vote',
    yourHeading: es ? 'Tu voto' : 'Your vote',
    makeHeading: es ? 'Envía tu voto' : 'Cast your vote',
    emptyHeading: es ? 'Envía tu voto' : 'Cast your vote',
    editSubtitle: es
      ? 'Tu voto actual · cámbialo cuando quieras'
      : 'Your current vote — change it anytime',
    firstXpNote: es ? '(primer voto)' : '(first vote)',
    resolvedTitle: es ? 'Votación cerrada' : 'Voting closed',
    yourRecorded: es ? 'Tu voto' : 'Your vote',
    guestYour: es ? 'Tu voto (invitado)' : 'Your vote (guest)',
    /** Suffix after "·" for outcome vote count (e.g. "12 votos / 12 votes"). */
    voteCountWord: es ? 'votos' : 'votes',
  }
}

/** Multi-outcome "bold" line — phrased as a vote now. */
export function getPickMessageNonPulse(
  selectedOutcomeProbability: number,
  locale: PulseMarketCopyLocale
): string {
  if (selectedOutcomeProbability > 0.7) {
    return locale === 'en' ? '🎯 Going with the crowd' : '🎯 Siguiendo al grupo'
  }
  if (selectedOutcomeProbability > 0.4) {
    return locale === 'en' ? '🤔 An interesting pick' : '🤔 Una elección interesante'
  }
  return locale === 'en' ? '🔥 Bold vote!' : '🔥 ¡Voto audaz!'
}

export function marketCardPredictCta(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es' ? 'Votar' : 'Vote'
}

export function voteCountLabelPublic(
  locale: PulseMarketCopyLocale,
  votes: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  const n = votes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')
  return locale === 'es' ? `${n} votos` : `${n} votes`
}

export function recentActivityHeading(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es' ? 'Votos recientes' : 'Recent votes'
}

export function recentActivityEmpty(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es' ? 'Aún no hay votos' : 'No votes yet'
}

export function voteUpdatedToast(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es' ? 'Voto actualizado ✓' : 'Vote updated ✓'
}

export function celebrationRecordedMessage(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es' ? 'Tu voto fue registrado.' : 'Your vote has been recorded.'
}

export function userContributionLine(
  locale: PulseMarketCopyLocale,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPulse: boolean
) {
  return locale === 'es'
    ? 'Tus votos contribuyen a la inteligencia colectiva'
    : 'Your votes contribute to collective intelligence'
}
