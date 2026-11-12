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
  'licitacion',
  'fallo',
  'contratacion_publica',
  'lineamientos',
  'otro',
] as const

export type CiceronDocumentType = (typeof CICERON_DOCUMENT_TYPES)[number]

/** Document types that are procurement/tender notices — excluded from regulatory matching by default. */
export const CICERON_PROCUREMENT_TYPES: readonly CiceronDocumentType[] = [
  'convocatoria',
  'licitacion',
  'fallo',
  'contratacion_publica',
] as const

export function isProcurementDocumentType(
  type: string | null | undefined
): boolean {
  return (CICERON_PROCUREMENT_TYPES as readonly string[]).includes(type ?? '')
}

export function inferDocumentTypeFromTitle(title: string): CiceronDocumentType {
  const t = title.trim().toLowerCase()
  if (t.startsWith('decreto')) return 'decreto'
  if (t.startsWith('acuerdo')) return 'acuerdo'
  if (t.startsWith('norma oficial') || /\bnom[-\s]?\d/i.test(title)) return 'NOM'
  if (t.startsWith('resoluci')) return 'resolución'
  if (/\bfallo\b/.test(t) && /(licitaci|concurs|adjudic)/.test(t)) return 'fallo'
  if (t.startsWith('aviso')) return 'aviso'
  if (t.startsWith('convocatoria')) return 'convocatoria'
  if (/licitaci[oó]n|invitaci[oó]n a cuando menos|adjudicaci[oó]n directa/.test(t)) {
    return 'licitacion'
  }
  if (/contrataci[oó]n p[uú]blica|bases de la licitaci/.test(t)) {
    return 'contratacion_publica'
  }
  if (t.startsWith('lineamiento')) return 'lineamientos'
  return 'otro'
}
