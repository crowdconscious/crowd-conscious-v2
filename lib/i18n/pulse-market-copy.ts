/** Pulse / legacy CDMX-style surveys: opinion wording instead of prediction */
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

export function voteActionCopy(locale: PulseMarketCopyLocale, isPulse: boolean) {
  const es = locale === 'es'
  return {
    predictVerb: isPulse ? (es ? 'Opinar' : 'Share opinion') : es ? 'Predecir' : 'Predict',
    updateVerb: isPulse
      ? es
        ? 'Actualizar opinión'
        : 'Update opinion'
      : es
        ? 'Actualizar predicción'
        : 'Update prediction',
    yourHeading: isPulse ? (es ? 'Tu opinión' : 'Your opinion') : es ? 'Tu predicción' : 'Your prediction',
    makeHeading: isPulse
      ? es
        ? 'Comparte tu opinión'
        : 'Share your opinion'
      : es
        ? 'Haz tu predicción'
        : 'Make your prediction',
    emptyHeading: isPulse
      ? es
        ? 'Comparte tu opinión'
        : 'Share your opinion'
      : es
        ? 'Haz tu predicción'
        : 'Make your prediction',
    editSubtitle: isPulse
      ? es
        ? 'Tu opinión actual · cambia tu voto cuando quieras'
        : 'Your current opinion — change your vote anytime'
      : es
        ? 'Tu predicción actual · cambia tu voto cuando quieras'
        : 'Your current prediction — change your vote anytime',
    firstXpNote: isPulse
      ? es
        ? '(primera opinión)'
        : '(first opinion)'
      : es
        ? '(primera predicción)'
        : '(first prediction)',
    resolvedTitle: isPulse
      ? es
        ? 'Opiniones cerradas'
        : 'Opinions closed'
      : es
        ? 'Predicciones cerradas'
        : 'Predictions closed',
    yourRecorded: isPulse ? (es ? 'Tu opinión' : 'Your opinion') : es ? 'Tu predicción' : 'Your prediction',
    guestYour: isPulse
      ? es
        ? 'Tu opinión (invitado)'
        : 'Your opinion (guest)'
      : es
        ? 'Tu predicción (invitado)'
        : 'Your prediction (guest)',
    /** Suffix after "·" for outcome vote count (e.g. "12 votos" / "12 opiniones") */
    voteCountWord: isPulse ? (es ? 'opiniones' : 'opinions') : es ? 'votos' : 'votes',
  }
}

/** Multi-outcome “bold” line — never used when Pulse (confidence slider replaces it) */
export function getPickMessageNonPulse(selectedOutcomeProbability: number, locale: PulseMarketCopyLocale): string {
  if (selectedOutcomeProbability > 0.7) {
    return locale === 'en' ? '🎯 Going with the crowd' : '🎯 Siguiendo al grupo'
  }
  if (selectedOutcomeProbability > 0.4) {
    return locale === 'en' ? '🤔 An interesting pick' : '🤔 Una elección interesante'
  }
  if (selectedOutcomeProbability > 0.2) {
    return locale === 'en' ? '🔥 Bold prediction!' : '🔥 ¡Predicción audaz!'
  }
  return locale === 'en' ? '🔥 Bold prediction!' : '🔥 ¡Predicción audaz!'
}

export function marketCardPredictCta(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse ? (locale === 'es' ? 'Opinar' : 'Share opinion') : locale === 'es' ? 'Predecir' : 'Predict'
}

export function voteCountLabelPublic(locale: PulseMarketCopyLocale, votes: number, isPulse: boolean) {
  const n = votes.toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')
  if (isPulse) {
    return locale === 'es' ? `${n} opiniones` : `${n} opinions`
  }
  return locale === 'es' ? `${n} votos` : `${n} votes`
}

export function recentActivityHeading(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse
    ? locale === 'es'
      ? 'Opiniones recientes'
      : 'Recent opinions'
    : locale === 'es'
      ? 'Predicciones recientes'
      : 'Recent predictions'
}

export function recentActivityEmpty(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse
    ? locale === 'es'
      ? 'Aún no hay opiniones'
      : 'No opinions yet'
    : locale === 'es'
      ? 'Aún no hay predicciones'
      : 'No predictions yet'
}

export function voteUpdatedToast(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse
    ? locale === 'es'
      ? 'Opinión actualizada ✓'
      : 'Opinion updated ✓'
    : locale === 'es'
      ? 'Predicción actualizada ✓'
      : 'Prediction updated ✓'
}

export function celebrationRecordedMessage(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse
    ? locale === 'es'
      ? 'Tu opinión fue registrada.'
      : 'Your opinion has been recorded.'
    : locale === 'es'
      ? 'Tu predicción fue registrada.'
      : 'Your prediction has been recorded.'
}

export function userContributionLine(locale: PulseMarketCopyLocale, isPulse: boolean) {
  return isPulse
    ? locale === 'es'
      ? 'Tus opiniones contribuyen a la inteligencia colectiva'
      : 'Your opinions contribute to collective intelligence'
    : locale === 'es'
      ? 'Tus predicciones contribuyen a la inteligencia colectiva'
      : 'Your predictions contribute to collective intelligence'
}
