import type { Headline } from './firmness'

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
  const main =
    locale === 'es'
      ? `De su ${h.pctYes}% de «sí», ${h.pctFirmOfYes}% lo dijo con firmeza.`
      : `Of your ${h.pctYes}% "yes", ${h.pctFirmOfYes}% said it firmly.`
  const sub = h.weakest
    ? locale === 'es'
      ? `Donde más dudan: ${h.weakest.text} — ${h.weakest.pctFirmOfYes}% de sus «sí» son firmes.`
      : `Where they hesitate most: ${h.weakest.text} — ${h.weakest.pctFirmOfYes}% of their "yes" answers are firm.`
    : null
  return { main, sub }
}
