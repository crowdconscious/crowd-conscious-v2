import { getOutcomeLabel } from '@/lib/i18n/market-translations'

/** Structural match for Pulse outcome/vote rows used in embed math */
type OutcomeLike = {
  id: string
  label: string
  probability: number
  sort_order: number | null
  translations?: unknown
}
type VoteLike = {
  outcome_id: string
  confidence: number | null
}

export function computePulseEmbedExecutiveSummary(
  outcomes: OutcomeLike[],
  votes: VoteLike[],
  locale: 'es' | 'en'
): { summaryEs: string; summaryEn: string } | null {
  if (outcomes.length === 0 || votes.length === 0) return null
  const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
  const leadingOutcome = sorted[0]
  const totalVotes = votes.length
  const avgConfidence =
    totalVotes > 0
      ? votes.reduce((sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0), 0) /
        totalVotes
      : 0
  const avgConfStr = avgConfidence.toFixed(1)
  const pct = Math.round(leadingOutcome.probability * 100)
  const shortLabel = getOutcomeLabel(leadingOutcome, locale).split(' / ')[0]
  const votesForLeading = votes.filter(
    (v) => v.outcome_id === leadingOutcome.id && typeof v.confidence === 'number'
  )
  const leadingConf =
    votesForLeading.length > 0
      ? (
          votesForLeading.reduce((s, v) => s + (v.confidence as number), 0) /
          votesForLeading.length
        ).toFixed(1)
      : '0.0'
  const strongPhraseEs =
    parseFloat(leadingConf) >= 7
      ? 'Esto indica una preferencia fuerte y clara de la comunidad.'
      : 'Sin embargo, el nivel de certeza sugiere que la opinión no es definitiva.'
  const strongPhraseEn =
    parseFloat(leadingConf) >= 7
      ? 'This indicates a strong, clear community preference.'
      : 'However, the certainty level suggests the opinion is not definitive.'
  const summaryEs = `Con ${totalVotes} participaciones y una confianza promedio de ${avgConfStr}/10, "${shortLabel}" lidera con ${pct}% de los votos y una certeza de ${leadingConf}/10. ${strongPhraseEs}`
  const summaryEn = `With ${totalVotes} participation${totalVotes !== 1 ? 's' : ''} and an average confidence of ${avgConfStr}/10, "${shortLabel}" leads with ${pct}% of the vote and an average certainty of ${leadingConf}/10. ${strongPhraseEn}`
  return { summaryEs, summaryEn }
}

export type PulseEmbedInsights = {
  leadingLabel: string
  leadingPct: number
  leadingConf: number
  secondLabel: string | null
  secondConf: number | null
  strongOpinions: number
  lowestLabel: string | null
  lowestConf: number | null
}

export function computePulseEmbedInsights(
  outcomes: OutcomeLike[],
  votes: VoteLike[],
  locale: 'es' | 'en'
): PulseEmbedInsights | null {
  const totalVotes = votes.length
  if (totalVotes === 0 || outcomes.length === 0) return null
  const sorted = [...outcomes].sort((a, b) => b.probability - a.probability)
  const lead = sorted[0]
  const second = sorted[1]
  const leadingPct = Math.round(lead.probability * 100)
  const avgForOutcome = (oid: string) => {
    const arr = votes.filter(
      (v) =>
        v.outcome_id === oid &&
        typeof v.confidence === 'number' &&
        v.confidence >= 1 &&
        v.confidence <= 10
    )
    if (!arr.length) return null
    return arr.reduce((s, v) => s + (v.confidence as number), 0) / arr.length
  }
  const leadingConf = avgForOutcome(lead.id)
  const secondConf = second ? avgForOutcome(second.id) : null
  const leadingLabel = getOutcomeLabel(lead, locale).split(' / ')[0]
  const secondLabel = second ? getOutcomeLabel(second, locale).split(' / ')[0] : null
  const strongOpinions = votes.filter((v) => typeof v.confidence === 'number' && v.confidence >= 8).length
  let lowest: { label: string; conf: number } | null = null
  for (const o of outcomes) {
    const a = avgForOutcome(o.id)
    if (a == null) continue
    if (!lowest || a < lowest.conf) {
      lowest = { label: getOutcomeLabel(o, locale).split(' / ')[0], conf: a }
    }
  }
  return {
    leadingLabel,
    leadingPct,
    leadingConf: leadingConf ?? 0,
    secondLabel,
    secondConf,
    strongOpinions,
    lowestLabel: lowest?.label ?? null,
    lowestConf: lowest?.conf ?? null,
  }
}
