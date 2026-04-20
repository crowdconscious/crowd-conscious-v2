/**
 * Canonical vocabulary for every public-facing numeric metric on the
 * platform. Audit docs/METRICS-CATALOG.md has the full surface map.
 *
 * Rule: if a tile or paragraph shows a count and is visible to a non-admin,
 * its label + tooltip come from here. Admin-only tiles (e.g. the Intelligence
 * Hub operational sub-line "+392.8% vs prev 30d") can render whatever copy
 * makes sense for the on-call use case, but the HEADLINE label still comes
 * from this file so any two surfaces using the same metric key stay in sync.
 */

export type MetricKey =
  | 'total_all_time_votes'
  | 'cycle_opinions'
  | 'thirtyd_votes'
  | 'crowd_accuracy'
  | 'fund_cycle_votes'

export type MetricLabelLocale = 'es' | 'en'

type MetricLabelEntry = {
  es: string
  en: string
  tooltip_es: string
  tooltip_en: string
}

export const METRIC_LABELS: Record<MetricKey, MetricLabelEntry> = {
  total_all_time_votes: {
    es: 'Opiniones totales',
    en: 'Total opinions',
    tooltip_es: 'Todas las opiniones cuantificadas desde el lanzamiento.',
    tooltip_en: 'All quantified opinions since launch.',
  },
  cycle_opinions: {
    es: 'Opiniones este ciclo',
    en: 'Opinions this cycle',
    tooltip_es:
      'Opiniones en el ciclo actual de asignación del Fondo Consciente (mes en curso).',
    tooltip_en:
      'Opinions in the current Conscious Fund allocation cycle (this calendar month).',
  },
  thirtyd_votes: {
    es: 'Actividad (30 días)',
    en: 'Activity (30 days)',
    tooltip_es: 'Votos emitidos en los últimos 30 días. Métrica operativa.',
    tooltip_en: 'Votes cast in the last 30 days. Operational metric.',
  },
  crowd_accuracy: {
    es: 'Precisión del crowd',
    en: 'Crowd accuracy',
    tooltip_es:
      'Porcentaje de votos que acertaron el resultado final del mercado resuelto.',
    tooltip_en:
      'Percentage of votes that matched the resolved market outcome.',
  },
  fund_cycle_votes: {
    es: 'Votos este ciclo',
    en: 'Votes this cycle',
    tooltip_es:
      'Votos por esta causa en el ciclo actual del Fondo Consciente.',
    tooltip_en: 'Votes for this cause in the current Conscious Fund cycle.',
  },
}

export function metricLabel(
  key: MetricKey,
  locale: MetricLabelLocale
): string {
  return METRIC_LABELS[key][locale]
}

export function metricTooltip(
  key: MetricKey,
  locale: MetricLabelLocale
): string {
  return METRIC_LABELS[key][locale === 'es' ? 'tooltip_es' : 'tooltip_en']
}
