/**
 * Automatic redaction for free-text reasons (rule 8). Conservative by design:
 * it over-redacts rather than risk identifying a respondent. Runs on every
 * reason before it is shown, exported or printed.
 */
import { MIN_GROUP } from './firmness'

const PATTERNS: { re: RegExp; label: string }[] = [
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, label: '[correo]' },
  // CURP (18) and RFC (12-13)
  { re: /\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi, label: '[identificación]' },
  { re: /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi, label: '[identificación]' },
  // Phone numbers: 8+ digits with optional separators / +52
  { re: /(\+?\d[\d\s().-]{7,}\d)/g, label: '[teléfono]' },
  // Remaining long digit runs (NSS, policy, account, expediente numbers)
  { re: /\b\d{5,}\b/g, label: '[número]' },
  // Titles followed by a capitalised name
  {
    re: /\b(Dr|Dra|Doctor|Doctora|Lic|Ing|Enf|Enfermer[oa]|Sr|Sra|Srta|Señor|Señora|Mtro|Mtra)\.?\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?/g,
    label: '$1 [nombre]',
  },
  { re: /\b(me llamo|mi nombre es|soy)\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?/gi, label: '$1 [nombre]' },
]

// Medical details: diagnoses, conditions, medications. Extend as needed.
const MEDICAL = [
  'diabetes', 'cáncer', 'cancer', 'vih', 'sida', 'embarazo', 'embarazada', 'aborto', 'depresión', 'ansiedad',
  'hipertensión', 'quimioterapia', 'diálisis', 'covid', 'tumor', 'insulina', 'cirugía de', 'operación de',
  'diagnóstico de', 'esquizofrenia', 'bipolar', 'hepatitis', 'epilepsia', 'alzheimer',
]
const MEDICAL_RE = new RegExp(`\\b(${MEDICAL.map((m) => m.replace(/\s/g, '\\s')).join('|')})\\b[^,.;]*`, 'gi')

export function redactReason(text: string): string {
  let out = text.normalize('NFC').trim().slice(0, 280)
  for (const { re, label } of PATTERNS) out = out.replace(re, label)
  out = out.replace(MEDICAL_RE, '[detalle médico]')
  return out.replace(/\s{2,}/g, ' ')
}

export type Reason = { text: string; certainty: number }

export type ReasonGroup =
  | { hidden: true; groupSize: number }
  | { hidden: false; groupSize: number; reasons: Reason[] }

/**
 * groupSize is the number of respondents in the group (e.g. tentative yes),
 * not the number of reasons left. Under MIN_GROUP nothing is shown.
 */
export function reasonGroup(groupSize: number, reasons: Reason[], limit = 5): ReasonGroup {
  if (groupSize < MIN_GROUP) return { hidden: true, groupSize }
  return {
    hidden: false,
    groupSize,
    reasons: reasons.slice(0, limit).map((r) => ({ text: redactReason(r.text), certainty: r.certainty })),
  }
}
