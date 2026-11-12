import { CICERON_REVIEW_SEED } from '@/lib/ciceron/review/seed-ids'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import type { ReviewInboxItem, ReviewTaskDetail, AuditViewerRow } from '@/lib/ciceron/review/types'

const MODEL_NEXORA = `Datos de demostración.

Estimada dirección de cumplimiento:

El Diario Oficial publicó modificaciones a las Disposiciones de carácter general aplicables a las instituciones de crédito que amplían el plazo de conservación de registros de operaciones. Recomendamos revisar las políticas internas de archivo de Nexora Pagos y confirmar el alcance frente a fondos de pago electrónico.

Quedamos a sus órdenes para preparar el plan de adecuación.`

const HUMAN_NEXORA = `Datos de demostración.

Estimada dirección de cumplimiento:

El Diario Oficial publicó modificaciones a las Disposiciones de carácter general aplicables a las instituciones de crédito que amplían el plazo de conservación de registros de operaciones a no menos de diez años. Recomendamos revisar las políticas internas de archivo de Nexora Pagos, confirmar el alcance frente a fondos de pago electrónico y agendar una sesión de adecuación la próxima semana.

Quedamos a sus órdenes.`

const MODEL_FARMA = `Datos de demostración.

Estimado equipo de asuntos regulatorios:

Identificamos una disposición relacionada con cadena de frío y farmacovigilancia que puede afectar la red de distribución de Farma Sierra. Sugerimos contrastar el texto oficial con los procedimientos actuales de almacenamiento y notificar a operaciones si hubiera un ajuste de plazos.

Este mensaje es un borrador pendiente de su revisión.`

const MODEL_VIENTO = `Datos de demostración.

Resumen para Viento del Istmo Energía:

La nota identificada toca permisos de generación e interconexión. Conviene verificar si el parque del Istmo queda dentro del supuesto y, en su caso, documentar la evidencia de cumplimiento ambiental ya aportada ante la autoridad.`

export const fixtureInboxItems: ReviewInboxItem[] = [
  {
    id: CICERON_REVIEW_SEED.tasks.nexoraSocio,
    title: 'Alerta PLD — Nexora Pagos',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    clientId: CICERON_SEED.clients.nexora,
    matterId: CICERON_SEED.matters.nexoraCnbv,
    matterTitle: 'Licencia CNBV y prevención de lavado',
    assigneeId: CICERON_SEED.personas.socio,
    assigneeName: 'Socia Demo Rivera',
    dueAt: '2026-11-10T18:00:00-06:00',
    overdue: true,
    status: 'en_curso',
    outputType: 'client_alert',
    isDemo: true,
  },
  {
    id: CICERON_REVIEW_SEED.tasks.farmaAsociado,
    title: 'Alerta cadena de frío — Farma Sierra',
    clientName: 'Distribuidora Farma Sierra, S.A. de C.V.',
    clientId: 'c1000000-0000-4000-8000-000000000002',
    matterId: 'd1000000-0000-4000-8000-000000000003',
    matterTitle: 'Autorizaciones COFEPRIS y cadena de frío',
    assigneeId: CICERON_SEED.personas.asociado,
    assigneeName: 'Asociado Demo Herrera',
    dueAt: '2026-11-13T12:00:00-06:00',
    overdue: false,
    status: 'pendiente',
    outputType: 'client_alert',
    isDemo: true,
  },
  {
    id: CICERON_REVIEW_SEED.tasks.vientoAsociado2,
    title: 'Nota de investigación — Viento del Istmo',
    clientName: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
    clientId: 'c1000000-0000-4000-8000-000000000003',
    matterId: 'd1000000-0000-4000-8000-000000000004',
    matterTitle: 'Permisos CRE y evaluación de impacto ambiental',
    assigneeId: CICERON_SEED.personas.asociado2,
    assigneeName: 'Asociada Demo Méndez',
    dueAt: '2026-11-14T17:00:00-06:00',
    overdue: false,
    status: 'pendiente',
    outputType: 'research_summary',
    isDemo: true,
  },
  {
    id: CICERON_REVIEW_SEED.tasks.nexoraAsociadoFollowup,
    title: 'Seguimiento alerta PLD — Nexora Pagos',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    clientId: CICERON_SEED.clients.nexora,
    matterId: CICERON_SEED.matters.nexoraCnbv,
    matterTitle: 'Licencia CNBV y prevención de lavado',
    assigneeId: CICERON_SEED.personas.asociado,
    assigneeName: 'Asociado Demo Herrera',
    dueAt: '2026-11-12T09:00:00-06:00',
    overdue: false,
    status: 'pendiente',
    outputType: 'client_notify',
    isDemo: true,
  },
]

export function fixtureTaskDetail(taskId: string): ReviewTaskDetail | null {
  const item = fixtureInboxItems.find((t) => t.id === taskId)
  if (!item) return null

  const isNexora = taskId === CICERON_REVIEW_SEED.tasks.nexoraSocio
  const modelBody =
    taskId === CICERON_REVIEW_SEED.tasks.farmaAsociado
      ? MODEL_FARMA
      : taskId === CICERON_REVIEW_SEED.tasks.vientoAsociado2
        ? MODEL_VIENTO
        : MODEL_NEXORA
  const currentBody = isNexora ? HUMAN_NEXORA : modelBody

  return {
    ...item,
    draftId:
      taskId === CICERON_REVIEW_SEED.tasks.nexoraSocio
        ? CICERON_REVIEW_SEED.drafts.nexora
        : taskId === CICERON_REVIEW_SEED.tasks.farmaAsociado
          ? CICERON_REVIEW_SEED.drafts.farma
          : taskId === CICERON_REVIEW_SEED.tasks.nexoraAsociadoFollowup
            ? CICERON_REVIEW_SEED.drafts.nexoraFollowup
            : CICERON_REVIEW_SEED.drafts.viento,
    aiOutputId:
      taskId === CICERON_REVIEW_SEED.tasks.nexoraSocio
        ? CICERON_REVIEW_SEED.outputs.nexora
        : taskId === CICERON_REVIEW_SEED.tasks.farmaAsociado
          ? CICERON_REVIEW_SEED.outputs.farma
          : taskId === CICERON_REVIEW_SEED.tasks.nexoraAsociadoFollowup
            ? CICERON_REVIEW_SEED.outputs.nexoraFollowup
            : CICERON_REVIEW_SEED.outputs.viento,
    modelBody,
    currentBody,
    modelVersionId:
      taskId === CICERON_REVIEW_SEED.tasks.nexoraAsociadoFollowup
        ? CICERON_REVIEW_SEED.versions.nexoraFollowupModel
        : CICERON_REVIEW_SEED.versions.nexoraModel,
    currentVersionId: isNexora
      ? CICERON_REVIEW_SEED.versions.nexoraHuman
      : taskId === CICERON_REVIEW_SEED.tasks.nexoraAsociadoFollowup
        ? CICERON_REVIEW_SEED.versions.nexoraFollowupModel
        : CICERON_REVIEW_SEED.versions.nexoraModel,
    humanEditAuthorId: isNexora ? (CICERON_SEED.personas.asociado as string) : null,
    fourEyesOn: item.outputType === 'client_alert',
    aiRun: {
      model: 'claude-sonnet-5',
      promptVersion: 'dof_client_alert_draft / v2',
      purpose: item.outputType ?? 'client_alert',
      createdAt: '2026-11-10T10:00:00-06:00',
    },
    evidence: [
      {
        id: 'ev-1',
        authority: 'SHCP / CNBV',
        title: 'Disposiciones de carácter general aplicables a las instituciones de crédito',
        passage:
          'Las instituciones deberán conservar, por un plazo no menor a diez años, los registros que permitan reconstruir individualmente las operaciones.',
        matchReason: 'Coincide con el perfil de vigilancia PLD del cliente.',
        href: 'https://www.dof.gob.mx/',
      },
    ],
    clientContext:
      'Datos de demostración. Emisora de pagos. Interesa regulación de fondos de pago electrónico, PLD y protección de datos de clientes.',
    decisionId: null,
    closed: false,
  }
}

export const fixtureAuditRows: AuditViewerRow[] = [
  {
    id: 'aud-1',
    createdAt: '2026-11-11T09:15:00-06:00',
    actorName: 'Socia Demo Rivera',
    actorId: CICERON_SEED.personas.socio,
    action: 'view_client_material',
    entityType: 'clients',
    entityId: CICERON_SEED.clients.nexora,
    outcome: 'allowed',
    policyId: 'matter_member',
    policyReason: 'Socio viewed client material in demo seed',
    snapshotHref: null,
  },
]
