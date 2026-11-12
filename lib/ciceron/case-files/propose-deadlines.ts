import {
  addTermDays,
  formatComputationText,
  type DayCountKind,
} from '@/lib/ciceron/case-files/business-days'
import type { NormalisedCaseEvent } from '@/lib/ciceron/connectors/case-file'

export type DeadlineRule = {
  id: string
  eventType: string
  termDays: number
  dayCount: DayCountKind
  legalBasis: string
  isSample: boolean
}

export type ProposedDeadline = {
  ruleId: string
  eventType: string
  dueIso: string
  dueAtIso: string
  basisText: string
  computationText: string
  status: 'propuesto'
  isSample: boolean
  countedDates: string[]
}

/** Map event types to rules; propose one deadline per matching active rule. */
export function proposeDeadlinesFromEvent(
  event: Pick<NormalisedCaseEvent, 'eventType' | 'occurredAt' | 'isSample'>,
  rules: DeadlineRule[],
  nonWorkingIsoDates: string[]
): ProposedDeadline[] {
  const matches = rules.filter(
    (r) => r.eventType === event.eventType || r.eventType === normalizeEventType(event.eventType)
  )
  const out: ProposedDeadline[] = []
  for (const rule of matches) {
    const { dueIso, countedDates, skipped } = addTermDays({
      startIso: event.occurredAt,
      termDays: rule.termDays,
      dayCount: rule.dayCount,
      nonWorkingIsoDates,
    })
    const computationText = formatComputationText({
      eventType: rule.eventType,
      termDays: rule.termDays,
      dayCount: rule.dayCount,
      legalBasis: rule.legalBasis,
      startIso: event.occurredAt,
      dueIso,
      skipped,
    })
    out.push({
      ruleId: rule.id,
      eventType: rule.eventType,
      dueIso,
      dueAtIso: `${dueIso}T23:59:00.000-06:00`,
      basisText: rule.legalBasis,
      computationText,
      status: 'propuesto',
      isSample: event.isSample || rule.isSample,
      countedDates,
    })
  }
  return out
}

function normalizeEventType(t: string): string {
  const x = t.toLowerCase()
  if (x.includes('requer')) return 'acuerdo_requerimiento'
  if (x.includes('emplaz')) return 'emplazamiento'
  if (x.includes('sentencia')) return 'notificacion_sentencia'
  if (x.includes('notif')) return 'notificacion_demanda'
  return t
}

/** Example rules used when DB table is missing (fixture / degrade). */
export const FIXTURE_DEADLINE_RULES: DeadlineRule[] = [
  {
    id: 'e1000000-0000-4000-8000-000000000001',
    eventType: 'notificacion_demanda',
    termDays: 15,
    dayCount: 'business',
    legalBasis:
      'Ejemplo de demostración — CFPC art. 332 (término genérico ilustrativo; no sustituye asesoría).',
    isSample: true,
  },
  {
    id: 'e1000000-0000-4000-8000-000000000002',
    eventType: 'acuerdo_requerimiento',
    termDays: 5,
    dayCount: 'business',
    legalBasis:
      'Ejemplo de demostración — término de 5 días hábiles para desahogar requerimiento (ilustrativo).',
    isSample: true,
  },
  {
    id: 'e1000000-0000-4000-8000-000000000003',
    eventType: 'notificacion_sentencia',
    termDays: 10,
    dayCount: 'calendar',
    legalBasis:
      'Ejemplo de demostración — término de 10 días naturales para interponer recurso (ilustrativo).',
    isSample: true,
  },
]

/** MX holidays used offline when non_working_days table is unavailable. */
export const FIXTURE_NON_WORKING_2026 = [
  '2026-01-01',
  '2026-02-02',
  '2026-03-16',
  '2026-05-01',
  '2026-09-16',
  '2026-11-16',
  '2026-12-25',
]
