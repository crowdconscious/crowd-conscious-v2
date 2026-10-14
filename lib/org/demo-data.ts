/**
 * FICTITIOUS demo data for /organizaciones/demo. No real organization,
 * person, reason or result is represented. Every surface rendering it shows
 * "Demo · datos ficticios" (banner) and a "Ficticio" label per card / PDF.
 *
 * Consistency (checked in demo-data.test.ts): for every closed reading, each
 * question's yes + no histogram counts add up to `responded`.
 */
import type { Reading } from './readings'

export const DEMO_ORG = { name: 'Hospital Ejemplo (ficticio)', slug: 'hospital-ejemplo' }
export const DEMO_BANNER = { es: 'Demo · datos ficticios', en: 'Demo · fictitious data' }
export const DEMO_LABEL = { es: 'Ficticio', en: 'Fictitious' }

const Q_RECOMIENDA = {
  es: '¿Recomendaría este hospital a un familiar?',
  en: 'Would you recommend this hospital to a relative?',
}
const Q_EXPLICARON = {
  es: '¿Le explicaron con claridad su tratamiento?',
  en: 'Was your treatment explained clearly?',
}

const REASONS_RECOMIENDA = {
  tentativeYes: [
    { text: 'La atención fue buena pero la cuenta final me sorprendió.', certainty: 6 },
    { text: 'Sí, aunque depende mucho del turno que te toque.', certainty: 5 },
    { text: 'La Dra. Ruiz fue excelente, el resto del personal no tanto.', certainty: 7 },
    { text: 'Lo recomendaría para cosas sencillas, no sé para algo grave.', certainty: 4 },
    { text: 'Me tardaron mucho en dar de alta, lo demás bien.', certainty: 6 },
  ],
  no: [
    { text: 'Esperé más de tres horas sin que nadie me informara.', certainty: 9 },
    { text: 'Me cobraron estudios que no me hicieron, reclamé al 55 0000 0000 y nada.', certainty: 10 },
    { text: 'Las instalaciones están bien pero el trato fue frío.', certainty: 6 },
    { text: 'Perdieron mis resultados y tuve que repetirlos.', certainty: 8 },
  ],
}

const REASONS_EXPLICARON = {
  tentativeYes: [
    { text: 'Me explicaron, pero muy rápido y con términos técnicos.', certainty: 5 },
    { text: 'Entendí lo básico; las indicaciones por escrito ayudaron.', certainty: 6 },
    { text: 'Al principio sí, después cada médico decía algo distinto.', certainty: 4 },
    { text: 'Tuve que preguntar varias veces lo de mi tratamiento de diabetes tipo 2.', certainty: 6 },
    { text: 'Sí, aunque nadie me dijo cuánto iba a durar.', certainty: 7 },
  ],
  no: [
    { text: 'Nadie me explicó los efectos secundarios.', certainty: 9 },
    { text: 'Me dieron la receta sin decirme para qué era cada cosa.', certainty: 8 },
    { text: 'Pedí hablar con el médico y nunca vino.', certainty: 7 },
  ],
}

const REASONS_ESPERA = {
  tentativeYes: [
    { text: 'Razonable para ser hospital, pero se podría mejorar.', certainty: 5 },
    { text: 'En admisión rápido, en farmacia no.', certainty: 4 },
    { text: 'Depende del día; esta vez fue aceptable.', certainty: 6 },
    { text: 'Me avisaron por mensaje cuando tocaba, eso ayudó.', certainty: 7 },
  ],
  no: [
    { text: 'Dos horas en admisión con dolor, no es razonable.', certainty: 10 },
    { text: 'La sala de espera estaba llena y no había información.', certainty: 8 },
    { text: 'Tuve cita a las 9 y me atendieron a las 12.', certainty: 9 },
    { text: 'Esperé menos que otras veces, pero aun así mucho.', certainty: 5 },
    { text: 'Nadie sabía decirme cuánto faltaba.', certainty: 7 },
  ],
}

export const DEMO_READINGS: Reading[] = [
  {
    id: 'urgencias-2026-10',
    title: { es: 'Experiencia en urgencias', en: 'Emergency room experience' },
    period: { es: 'Octubre 2026', en: 'October 2026' },
    status: 'field',
    visibility: 'private',
    visibilityLockedAt: '2026-10-05T10:12:00-06:00',
    fieldOpens: '2026-10-06',
    fieldCloses: '2026-10-19',
    closesInDays: 6,
    invited: 1200,
    responded: 214,
    sample: { mode: 'random', n: 1200, base: 8400, drawnAt: '2026-10-05' },
    product: 'continuous',
    questions: [],
  },
  {
    id: 'hospitalizacion-2026-q4',
    title: { es: 'Satisfacción con la hospitalización', en: 'Inpatient satisfaction' },
    period: { es: 'Q4 2026', en: 'Q4 2026' },
    status: 'closed',
    visibility: 'public',
    visibilityLockedAt: '2026-09-18T09:40:00-06:00',
    fieldOpens: '2026-09-22',
    fieldCloses: '2026-10-10',
    invited: 1500,
    responded: 412,
    sample: { mode: 'random', n: 1500, base: 11200, drawnAt: '2026-09-19' },
    product: 'continuous',
    questions: [
      {
        id: 'q1',
        text: Q_RECOMIENDA,
        counts: { yes: [6, 6, 11, 17, 28, 39, 50, 91, 73, 54], no: [2, 3, 4, 4, 4, 3, 3, 4, 5, 5] },
        reasons: REASONS_RECOMIENDA,
      },
      {
        id: 'q2',
        text: Q_EXPLICARON,
        counts: { yes: [6, 6, 13, 19, 31, 44, 57, 71, 57, 42], no: [4, 6, 8, 11, 11, 8, 6, 3, 4, 5] },
        reasons: REASONS_EXPLICARON,
      },
      {
        id: 'q3',
        // Wording changed vs Q3 ("en admisión" added): no trend comparison.
        text: { es: '¿El tiempo de espera en admisión fue razonable?', en: 'Was the waiting time at admission reasonable?' },
        counts: { yes: [6, 6, 11, 17, 28, 40, 51, 40, 32, 24], no: [7, 11, 15, 19, 18, 15, 11, 16, 20, 25] },
        reasons: REASONS_ESPERA,
      },
    ],
  },
  {
    id: 'hospitalizacion-2026-q3',
    title: { es: 'Satisfacción con la hospitalización', en: 'Inpatient satisfaction' },
    period: { es: 'Q3 2026', en: 'Q3 2026' },
    status: 'closed',
    visibility: 'public',
    visibilityLockedAt: '2026-06-24T11:05:00-06:00',
    fieldOpens: '2026-06-29',
    fieldCloses: '2026-07-17',
    invited: 1500,
    responded: 389,
    sample: { mode: 'random', n: 1500, base: 10900, drawnAt: '2026-06-25' },
    product: 'continuous',
    questions: [
      {
        id: 'q1',
        text: Q_RECOMIENDA,
        counts: { yes: [6, 6, 11, 17, 29, 40, 52, 79, 63, 47], no: [2, 3, 4, 5, 5, 4, 3, 4, 4, 5] },
        reasons: REASONS_RECOMIENDA,
      },
      {
        id: 'q2',
        text: Q_EXPLICARON,
        counts: { yes: [6, 6, 12, 19, 31, 43, 55, 61, 49, 37], no: [4, 6, 9, 11, 11, 8, 6, 4, 5, 6] },
        reasons: REASONS_EXPLICARON,
      },
      {
        id: 'q3',
        text: { es: '¿El tiempo de espera fue razonable?', en: 'Was the waiting time reasonable?' },
        counts: { yes: [6, 6, 11, 17, 28, 39, 50, 37, 29, 22], no: [7, 10, 14, 17, 17, 13, 10, 15, 19, 22] },
        reasons: REASONS_ESPERA,
      },
    ],
  },
  {
    id: 'piloto-2026-q2',
    title: { es: 'Piloto privado: atención al paciente', en: 'Private pilot: patient care' },
    period: { es: 'Q2 2026', en: 'Q2 2026' },
    status: 'closed',
    visibility: 'private',
    visibilityLockedAt: '2026-04-02T16:30:00-06:00',
    fieldOpens: '2026-04-08',
    fieldCloses: '2026-04-29',
    invited: 900,
    responded: 198,
    sample: { mode: 'all' },
    product: 'pilot',
    questions: [
      {
        id: 'q1',
        text: Q_RECOMIENDA,
        counts: { yes: [3, 3, 6, 9, 15, 20, 26, 38, 31, 23], no: [1, 2, 3, 3, 3, 3, 2, 2, 2, 3] },
        reasons: REASONS_RECOMIENDA,
      },
      {
        id: 'q2',
        text: Q_EXPLICARON,
        counts: { yes: [3, 3, 6, 9, 15, 21, 28, 29, 23, 18], no: [3, 4, 5, 7, 6, 5, 4, 2, 3, 4] },
        reasons: REASONS_EXPLICARON,
      },
      {
        id: 'q3',
        text: { es: '¿Volvería a atenderse aquí?', en: 'Would you come back here for care?' },
        counts: { yes: [3, 3, 5, 7, 12, 17, 22, 51, 40, 30], no: [0, 1, 1, 1, 1, 1, 0, 1, 1, 1] },
        reasons: {
          tentativeYes: [
            { text: 'Si no hay otra opción cerca, sí.', certainty: 5 },
            { text: 'Probablemente, si mejoran los tiempos.', certainty: 6 },
            { text: 'Sí, por el seguro; si pudiera elegir lo pensaría.', certainty: 4 },
          ],
          // 8 "no" respondents: under MIN_GROUP, so these are never shown.
          no: [{ text: '(oculto por tamaño de grupo)', certainty: 8 }],
        },
      },
    ],
  },
]

/** Default reading the demo opens on. */
export const DEMO_DEFAULT_READING_ID = 'hospitalizacion-2026-q4'

/** Chronological predecessor (closed) of a reading, for trends. */
export function previousClosed(id: string): Reading | null {
  const closed = DEMO_READINGS.filter((r) => r.status === 'closed')
  const i = closed.findIndex((r) => r.id === id)
  return i >= 0 && i + 1 < closed.length ? closed[i + 1] : null
}

/** Fictitious "landing" readings: same 98% yes, very different firmness. */
export const ILLUSTRATIVE_PAIR = [
  { name: { es: 'Organización A', en: 'Organization A' }, counts: { yes: [0, 0, 1, 2, 3, 4, 6, 24, 30, 28], no: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1] } },
  { name: { es: 'Organización B', en: 'Organization B' }, counts: { yes: [3, 6, 10, 14, 16, 14, 11, 9, 9, 6], no: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0] } },
]

/** Fictitious reading the "Pruébelo" widget adds the visitor's answer to. */
export const TRY_IT_BASE = { yes: [3, 4, 7, 11, 18, 26, 33, 62, 51, 38], no: [2, 2, 3, 3, 3, 3, 2, 3, 3, 3] }
