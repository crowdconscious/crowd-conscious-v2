/** Fixed subject-area taxonomy for DOF classification (Prompt 4). */
export const CICERON_SUBJECT_AREAS = [
  'fiscal',
  'laboral',
  'financiero y fintech',
  'salud y regulación sanitaria',
  'energía',
  'ambiental',
  'comercio exterior y aduanas',
  'competencia económica',
  'datos personales',
  'telecomunicaciones',
  'corporativo y mercantil',
  'administrativo',
  'penal',
  'inmobiliario',
  'propiedad intelectual',
  'otros',
] as const

export type CiceronSubjectArea = (typeof CICERON_SUBJECT_AREAS)[number]

export const CICERON_DOCUMENT_TYPES = [
  'decreto',
  'acuerdo',
  'NOM',
  'resolución',
  'aviso',
  'convocatoria',
  'lineamientos',
  'otro',
] as const

export type CiceronDocumentType = (typeof CICERON_DOCUMENT_TYPES)[number]

export function inferDocumentTypeFromTitle(title: string): CiceronDocumentType {
  const t = title.trim().toLowerCase()
  if (t.startsWith('decreto')) return 'decreto'
  if (t.startsWith('acuerdo')) return 'acuerdo'
  if (t.startsWith('norma oficial') || /\bnom[-\s]?\d/i.test(title)) return 'NOM'
  if (t.startsWith('resoluci')) return 'resolución'
  if (t.startsWith('aviso')) return 'aviso'
  if (t.startsWith('convocatoria')) return 'convocatoria'
  if (t.startsWith('lineamiento')) return 'lineamientos'
  return 'otro'
}
