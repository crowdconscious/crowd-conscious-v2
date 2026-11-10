import { CICERON_DEMO_LABEL, CICERON_FIRM_NAME } from '@/lib/ciceron/config'

/** Read-only fixtures shaped like seed data (Datos de demostración). No PostgREST required. */

export type ReviewState = 'borrador' | 'en_revision' | 'aprobado' | 'corregido' | 'rechazado'

export const fixtureMeta = {
  label: CICERON_DEMO_LABEL,
  firmName: CICERON_FIRM_NAME,
  role: 'Socia' as const,
  userName: 'Socia Demo Rivera',
}

export const fixtureClients = [
  {
    id: 'nexora',
    name: 'Nexora Pagos, S.A.P.I. de C.V.',
    industry: 'Fintech de pagos',
    watch:
      'Emisora de pagos. Interesa regulación de fondos de pago electrónico, PLD y protección de datos.',
    matters: [
      { id: 'nexora-cnbv', title: 'Licencia CNBV y prevención de lavado' },
      { id: 'nexora-pld', title: 'Contratos con instituciones de crédito' },
    ],
  },
  {
    id: 'farma',
    name: 'Distribuidora Farma Sierra, S.A. de C.V.',
    industry: 'Distribución farmacéutica',
    watch: 'Registros sanitarios, NOM de almacenamiento y publicidad.',
    matters: [{ id: 'farma-cofepris', title: 'Autorizaciones COFEPRIS y cadena de frío' }],
  },
  {
    id: 'viento',
    name: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
    industry: 'Energía renovable',
    watch: 'Permisos de generación, impacto ambiental e interconexión.',
    matters: [{ id: 'viento-cre', title: 'Permisos CRE y evaluación de impacto ambiental' }],
  },
  {
    id: 'aduanas',
    name: 'Agencia Aduanal Delta del Pacífico, S.C.',
    industry: 'Comercio exterior',
    watch: 'Reglas generales de comercio exterior y NOM de producto.',
    matters: [{ id: 'aduanas-sat', title: 'Clasificación arancelaria y auditorías SAT' }],
  },
  {
    id: 'fondo',
    name: 'Fondo Pedregal Inmuebles, S.A. de C.V.',
    industry: 'Fondo inmobiliario',
    watch: 'Arrendamiento, fideicomisos y supervisión financiera.',
    matters: [{ id: 'fondo-inmuebles', title: 'Portafolio de arrendamiento CDMX' }],
  },
  {
    id: 'alim',
    name: 'Alimentos del Bajío Integrados, S.A. de C.V.',
    industry: 'Alimentos',
    watch: 'Etiquetado frontal, inocuidad y obligaciones laborales.',
    matters: [{ id: 'alim-nom', title: 'Etiquetado frontal y NOM de inocuidad' }],
  },
] as const

export const fixtureDofNotes = [
  {
    id: 'dof-1',
    date: '10 de noviembre de 2026',
    authority: 'SHCP / CNBV',
    type: 'Acuerdo',
    title:
      'Acuerdo por el que se modifican las Disposiciones de carácter general aplicables a las instituciones de crédito',
    clientId: 'nexora',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    matterTitle: 'Licencia CNBV y prevención de lavado',
    reason:
      'Amplía el plazo de conservación de registros de operaciones y refuerza obligaciones de identificación de clientes.',
    action: 'Preparar nota interna para cumplimiento PLD y revisar políticas de archivo.',
    passage:
      'Las instituciones deberán conservar, por un plazo no menor a diez años, los registros que permitan reconstruir individualmente las operaciones, así como la identidad de los clientes y usuarios que las hubieren realizado.',
    officialUrl: 'https://www.dof.gob.mx/',
    review: 'en_revision' as ReviewState,
  },
  {
    id: 'dof-2',
    date: '10 de noviembre de 2026',
    authority: 'COFEPRIS',
    type: 'Aviso',
    title: 'Aviso por el que se dan a conocer criterios de verificación en cadena de frío',
    clientId: 'farma',
    clientName: 'Distribuidora Farma Sierra, S.A. de C.V.',
    matterTitle: 'Autorizaciones COFEPRIS y cadena de frío',
    reason: 'Introduce criterios de verificación que pueden aplicar a sus almacenes autorizados.',
    action: 'Contrastar con el protocolo vigente de Farma Sierra y agendar revisión.',
    passage:
      'Los establecimientos deberán acreditar el registro continuo de temperatura en los puntos críticos de almacenamiento y transporte.',
    officialUrl: 'https://www.dof.gob.mx/',
    review: 'borrador' as ReviewState,
  },
] as const

export const fixtureReviews = [
  {
    id: 'rev-1',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    title: 'Alerta al cliente sobre conservación de registros',
    due: '11 de noviembre de 2026',
    assignee: 'Socia Demo Rivera',
    state: 'en_revision' as ReviewState,
  },
  {
    id: 'rev-2',
    clientName: 'Distribuidora Farma Sierra, S.A. de C.V.',
    title: 'Resumen de aviso COFEPRIS — cadena de frío',
    due: '12 de noviembre de 2026',
    assignee: 'Asociado Demo Herrera',
    state: 'borrador' as ReviewState,
  },
] as const

export const fixtureCases = [
  {
    id: 'case-1',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    matterTitle: 'Licencia CNBV y prevención de lavado',
    court: 'TFJA Sala Regional Metropolitana',
    fileNumber: 'DEMO-TFJA-1001/2026',
    lastEvent: 'Notificación por lista — término para contestar',
    nextDeadline: '14 de noviembre de 2026',
    urgency: 'soon' as const,
  },
  {
    id: 'case-2',
    clientName: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
    matterTitle: 'Permisos CRE y evaluación de impacto ambiental',
    court: 'Juzgado Primero de Distrito en Materia de Amparo',
    fileNumber: 'DEMO-AMP-404/2026',
    lastEvent: 'Se tiene por presentado el escrito de demanda',
    nextDeadline: '20 de noviembre de 2026',
    urgency: 'normal' as const,
  },
] as const

export const fixtureDeadlines = [
  {
    id: 'dl-1',
    label: 'Contestar demanda — DEMO-TFJA-1001/2026',
    due: '14 de noviembre de 2026',
    clientName: 'Nexora Pagos, S.A.P.I. de C.V.',
    urgency: 'soon' as const,
  },
] as const
