import { computeHeadline, type Headline, type QuestionStats } from './firmness'

type Locale = 'es' | 'en'

/** The sentences a director can repeat. Facts only, no advice. */
export function headlineSentence(h: Headline | null, locale: Locale): { main: string; sub: string | null } | null {
  if (!h) return null
  if (h.kind === 'preliminary') {
    return {
      main: locale === 'es' ? 'Lectura preliminar: pocas respuestas para una conclusión.' : 'Preliminary reading: too few responses for a conclusion.',
      sub: null,
    }
  }
  const main = mainSentence(h.pctYes, h.pctFirmOfYes, h.leadPhrase, locale)
  const sub = h.weakest
    ? locale === 'es'
      ? `Donde más dudan: ${h.weakest.text} — ${h.weakest.pctFirmOfYes}% de sus «sí» son firmes.`
      : `Where they hesitate most: ${h.weakest.text} — ${h.weakest.pctFirmOfYes}% of their "yes" answers are firm.`
    : null
  return { main, sub }
}

/**
 * Line one names the question it comes from when a headline phrase exists
 * («De su 91% que recomendaría el hospital, 58% lo dijo con firmeza.»);
 * otherwise the quoted question (see phraseFor), so every headline names its question.
 */
export function mainSentence(pctYes: number, pctFirmOfYes: number, phrase: string | null | undefined, locale: Locale): string {
  if (phrase) {
    return locale === 'es'
      ? `De su ${pctYes}% ${phrase}, ${pctFirmOfYes}% lo dijo con firmeza.`
      : `Of the ${pctYes}% ${phrase}, ${pctFirmOfYes}% said it firmly.`
  }
  return locale === 'es'
    ? `De su ${pctYes}% de «sí», ${pctFirmOfYes}% lo dijo con firmeza.`
    : `Of your ${pctYes}% "yes", ${pctFirmOfYes}% said it firmly.`
}

type QLike = { text: { es: string; en: string }; headlinePhrase?: { es: string; en: string }; stats: QuestionStats }

/** One entry point for dashboard, Resumen, PDF and landing preview. */
export function readingHeadline(qs: QLike[], locale: Locale) {
  return headlineSentence(
    computeHeadline(qs.map((q) => ({ text: q.text[locale], stats: q.stats, phrase: phraseFor(q, locale) }))),
    locale
  )
}

/**
 * Every headline names its question. Readings stored in the DB always carry a
 * phrase (NOT NULL); the fallback quotes the question itself.
 */
export function phraseFor(q: { text: { es: string; en: string }; headlinePhrase?: { es: string; en: string } }, locale: Locale): string {
  const p = q.headlinePhrase?.[locale]?.trim()
  if (p) return p
  return locale === 'es' ? `que respondió «sí» a «${q.text.es}»` : `who answered "yes" to "${q.text.en}"`
}
