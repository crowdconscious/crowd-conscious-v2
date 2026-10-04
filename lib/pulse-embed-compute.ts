import { getOutcomeLabel } from '@/lib/i18n/market-translations'
import {
  outcomeAvgConfidenceFromTotals,
  resolveOutcomeAvgConfidence,
} from '@/lib/pulse-vote-aggregates'

/** Structural match for Pulse outcome/vote rows used in embed math */
type OutcomeLike = {
  id: string
  label: string
  probability: number
  sort_order: number | null
  translations?: unknown
  vote_count?: number | null
  total_confidence?: number | null
  confident_pick_count?: number | null
}
type VoteLike = {
  outcome_id: string
  confidence: number | null
}

function peopleSharePct(o: OutcomeLike, totalVotes: number): number {
  if (totalVotes > 0 && typeof o.vote_count === 'number') {
    return Math.round((o.vote_count / totalVotes) * 100)
  }
  return Math.round(Number(o.probability) * 100)
}

function sortByChooserShare(outcomes: OutcomeLike[], totalVotes: number): OutcomeLike[] {
  return [...outcomes].sort((a, b) => {
    const ca = typeof a.vote_count === 'number' ? a.vote_count : a.probability * totalVotes
    const cb = typeof b.vote_count === 'number' ? b.vote_count : b.probability * totalVotes
    return cb - ca
  })
}

function marketAvgFromOutcomes(outcomes: OutcomeLike[]): number | null {
  let sum = 0
  let n = 0
  for (const o of outcomes) {
    const picks = Number(o.confident_pick_count ?? 0)
    if (picks <= 0) continue
    sum += Number(o.total_confidence ?? 0)
    n += picks
  }
  if (n > 0) return sum / n
  return null
}

export function computePulseEmbedExecutiveSummary(
  outcomes: OutcomeLike[],
  votes: VoteLike[],
  locale: 'es' | 'en'
): { summaryEs: string; summaryEn: string } | null {
  if (outcomes.length === 0 || votes.length === 0) return null
  const totalVotes = votes.length
  const sorted = sortByChooserShare(outcomes, totalVotes)
  const leadingOutcome = sorted[0]
  const avgFromOutcomes = marketAvgFromOutcomes(outcomes)
  const avgConfidence =
    avgFromOutcomes ??
    (totalVotes > 0
      ? votes.reduce((sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0), 0) /
        totalVotes
      : 0)
  const avgConfStr = avgConfidence.toFixed(1)
  const pct = peopleSharePct(leadingOutcome, totalVotes)
  const shortLabel = getOutcomeLabel(leadingOutcome, locale).split(' / ')[0]
  const leadingConf = (
    resolveOutcomeAvgConfidence({
      totalConfidence: leadingOutcome.total_confidence,
      confidentPickCount: leadingOutcome.confident_pick_count,
    }) ??
    (() => {
      const votesForLeading = votes.filter(
        (v) =>
          v.outcome_id === leadingOutcome.id &&
          typeof v.confidence === 'number' &&
          (v.confidence as number) >= 1
      )
      if (!votesForLeading.length) return 0
      return (
        votesForLeading.reduce((s, v) => s + (v.confidence as number), 0) /
        votesForLeading.length
      )
    })()
  ).toFixed(1)
  const strongPhraseEs =
    parseFloat(leadingConf) >= 7
      ? 'Esto indica una preferencia fuerte y clara de la comunidad.'
      : 'Sin embargo, el nivel de certeza sugiere que la opinión no es definitiva.'
  const strongPhraseEn =
    parseFloat(leadingConf) >= 7
      ? 'This indicates a strong, clear community preference.'
      : 'However, the certainty level suggests the opinion is not definitive.'
  const summaryEs = `Con ${totalVotes} participaciones y una confianza promedio de ${avgConfStr}/10, "${shortLabel}" lidera con ${pct}% de las personas que lo eligieron y una certeza de ${leadingConf}/10. ${strongPhraseEs}`
  const summaryEn = `With ${totalVotes} participation${totalVotes !== 1 ? 's' : ''} and an average confidence of ${avgConfStr}/10, "${shortLabel}" leads with ${pct}% of people choosing it and an average certainty of ${leadingConf}/10. ${strongPhraseEn}`
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
  const sorted = sortByChooserShare(outcomes, totalVotes)
  const lead = sorted[0]
  const second = sorted[1]
  const leadingPct = peopleSharePct(lead, totalVotes)
  const avgForOutcome = (o: OutcomeLike) => {
    const fromTotals = outcomeAvgConfidenceFromTotals(
      o.total_confidence,
      o.confident_pick_count
    )
    if (fromTotals != null) return fromTotals
    const arr = votes.filter(
      (v) =>
        v.outcome_id === o.id &&
        typeof v.confidence === 'number' &&
        v.confidence >= 1 &&
        v.confidence <= 10
    )
    if (!arr.length) return null
    return arr.reduce((s, v) => s + (v.confidence as number), 0) / arr.length
  }
  const leadingConf = avgForOutcome(lead)
  const secondConf = second ? avgForOutcome(second) : null
  const leadingLabel = getOutcomeLabel(lead, locale).split(' / ')[0]
  const secondLabel = second ? getOutcomeLabel(second, locale).split(' / ')[0] : null
  const strongOpinions = votes.filter(
    (v) => typeof v.confidence === 'number' && v.confidence >= 8
  ).length
  let lowest: { label: string; conf: number } | null = null
  for (const o of outcomes) {
    const a = avgForOutcome(o)
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
