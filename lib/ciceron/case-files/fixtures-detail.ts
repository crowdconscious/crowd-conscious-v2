import { CICERON_DEMO_LABEL } from '@/lib/ciceron/config'

export type CaseEventView = {
  id: string
  eventType: string
  occurredAt: string
  occurredLabel: string
  summary: string
  aiSummary: string
  text: string
  originalLabel: string
  hasOriginal: boolean
  isSample: true
}

export type CaseDeadlineView = {
  id: string
  dueLabel: string
  dueAt: string
  status: 'propuesto' | 'confirmado' | 'descartado'
  basisText: string
  computationText: string
  confirmedBy: string | null
  confirmedAt: string | null
  urgency: 'urgent' | 'soon' | 'normal'
  isSample: true
}

export type CaseDetailView = {
  id: string
  clientName: string
  clientId: string
  matterId: string
  matterTitle: string
  court: string
  fileNumber: string
  status: string
  lawyerName: string
  events: CaseEventView[]
  deadlines: CaseDeadlineView[]
  isSample: true
}

export const fixtureCaseDetails: Record<string, CaseDetailView> = {
  'case-1': {
    id: 'case-1',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    clientId: 'nexora',
    matterId: 'nexora-cnbv',
    matterTitle: 'Licencia CNBV y prevención de lavado',
    court: 'TFJA Sala Regional Metropolitana',
    fileNumber: 'DEMO-TFJA-1001/2026',
    status: 'activo',
    lawyerName: 'Asociado Demo Herrera',
    isSample: true,
    events: [
      {
        id: 'ev-1a',
        eventType: 'acuerdo',
        occurredAt: '2026-10-15T12:00:00Z',
        occurredLabel: '15 de octubre de 2026',
        summary: 'Se tiene por presentado el escrito de demanda y se ordena emplazamiento.',
        aiSummary:
          'El tribunal admitió la demanda y ordenó el emplazamiento. No abre por sí el término de contestación en este ejemplo.',
        text: `${CICERON_DEMO_LABEL}. Se tiene por presentado el escrito de demanda y se ordena emplazamiento.`,
        originalLabel: 'Acuerdo (captura de demostración)',
        hasOriginal: true,
        isSample: true,
      },
      {
        id: 'ev-1b',
        eventType: 'notificacion_demanda',
        occurredAt: '2026-10-22T16:30:00Z',
        occurredLabel: '22 de octubre de 2026',
        summary: 'Notificación por lista — término para contestar.',
        aiSummary:
          'Se notificó el acuerdo que abre término de contestación. Revise el plazo propuesto antes de confirmarlo.',
        text: `${CICERON_DEMO_LABEL}. Notificación por lista: término de quince días hábiles para contestar.`,
        originalLabel: 'Notificación (lista)',
        hasOriginal: true,
        isSample: true,
      },
      {
        id: 'ev-1c',
        eventType: 'acuerdo_requerimiento',
        occurredAt: '2026-11-03T16:00:00Z',
        occurredLabel: '3 de noviembre de 2026',
        summary: 'Requerimiento para exhibir poder notarial.',
        aiSummary:
          'El tribunal requiere exhibir el poder del representante legal. El plazo propuesto usa la regla de requerimiento de demostración.',
        text: `${CICERON_DEMO_LABEL}. Requerimiento para exhibir poder notarial actualizado en cinco días hábiles.`,
        originalLabel: 'Acuerdo de requerimiento',
        hasOriginal: true,
        isSample: true,
      },
    ],
    deadlines: [
      {
        id: 'dl-1',
        dueLabel: '14 de noviembre de 2026',
        dueAt: '2026-11-14T23:59:00-06:00',
        status: 'propuesto',
        basisText:
          'Ejemplo de demostración — CFPC art. 332 (término genérico ilustrativo; no sustituye asesoría).',
        computationText:
          'Regla: notificacion_demanda · 15 días hábiles. Cómputo desde el día hábil siguiente a 2026-10-22 → vence 2026-11-14.',
        confirmedBy: null,
        confirmedAt: null,
        urgency: 'soon',
        isSample: true,
      },
      {
        id: 'dl-1b',
        dueLabel: '12 de noviembre de 2026',
        dueAt: '2026-11-12T23:59:00-06:00',
        status: 'propuesto',
        basisText: 'Ejemplo de demostración — 5 días hábiles por requerimiento.',
        computationText:
          'Regla: acuerdo_requerimiento · 5 días hábiles. Día 1 = primer día hábil posterior al acuerdo.',
        confirmedBy: null,
        confirmedAt: null,
        urgency: 'urgent',
        isSample: true,
      },
    ],
  },
  'case-2': {
    id: 'case-2',
    clientName: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
    clientId: 'viento',
    matterId: 'viento-cre',
    matterTitle: 'Permisos CRE y evaluación de impacto ambiental',
    court: 'Juzgado Primero de Distrito en Materia de Amparo',
    fileNumber: 'DEMO-AMP-404/2026',
    status: 'activo',
    lawyerName: 'Socia Demo Rivera',
    isSample: true,
    events: [
      {
        id: 'ev-2a',
        eventType: 'acuerdo',
        occurredAt: '2026-10-18T12:00:00Z',
        occurredLabel: '18 de octubre de 2026',
        summary: 'Se tiene por presentado el escrito de demanda.',
        aiSummary:
          'El juzgado tuvo por presentada la demanda de amparo. No genera plazo de contestación en este ejemplo.',
        text: `${CICERON_DEMO_LABEL}. Se tiene por presentado el escrito de demanda.`,
        originalLabel: 'Acuerdo de admisión',
        hasOriginal: true,
        isSample: true,
      },
    ],
    deadlines: [
      {
        id: 'dl-2',
        dueLabel: '20 de noviembre de 2026',
        dueAt: '2026-11-20T23:59:00-06:00',
        status: 'propuesto',
        basisText: 'Ejemplo de demostración — término ilustrativo de ampliación.',
        computationText: 'Regla ejemplo de demostración · cómputo ilustrativo → 2026-11-20.',
        confirmedBy: null,
        confirmedAt: null,
        urgency: 'normal',
        isSample: true,
      },
    ],
  },
}

/** Map schema case file UUIDs → fixture detail keys when tables missing columns. */
export const SCHEMA_CASE_TO_FIXTURE: Record<string, string> = {
  'f1000000-0000-4000-8000-000000000001': 'case-1',
  'f1000000-0000-4000-8000-000000000004': 'case-2',
}
