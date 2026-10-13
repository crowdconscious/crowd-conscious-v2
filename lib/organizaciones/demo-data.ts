/**
 * FICTITIOUS demo data for /organizaciones/demo. No real customer, person or
 * result is represented here. Every surface that renders it must show the
 * "Demo · datos ficticios" watermark.
 */
export type DemoLocale = 'es' | 'en'
type L = { es: string; en: string }

export type DemoQuestion = {
  id: string
  text: L
  /** % that answered "yes"/positive. */
  pct: number
  avgCertainty: number
  /** Count of responses at certainty 1..10 (index 0 = certainty 1). */
  distribution: number[]
}

export type DemoReading = {
  id: string
  title: L
  period: L
  status: 'open' | 'closed'
  visibility: 'private' | 'public'
  visibilityLockedAt: string
  invited: number
  responded: number
  sampleMode: 'all' | 'random'
  questions: DemoQuestion[]
}

export const DEMO_ORG = {
  name: 'Hospital Ejemplo (ficticio)',
  slug: 'hospital-ejemplo',
}

export const DEMO_WATERMARK: L = { es: 'Demo · datos ficticios', en: 'Demo · fictitious data' }

export const DEMO_READINGS: DemoReading[] = [
  {
    id: 'r-2026-q4',
    title: { es: 'Experiencia en urgencias', en: 'Emergency room experience' },
    period: { es: 'Q4 2026 · consulta abierta', en: 'Q4 2026 · consultation open' },
    status: 'open',
    visibility: 'public',
    visibilityLockedAt: '2026-10-01',
    invited: 1200,
    responded: 214,
    sampleMode: 'random',
    questions: [],
  },
  {
    id: 'r-2026-q3',
    title: { es: 'Satisfacción con la hospitalización', en: 'Inpatient satisfaction' },
    period: { es: 'Q3 2026 · cerrada', en: 'Q3 2026 · closed' },
    status: 'closed',
    visibility: 'public',
    visibilityLockedAt: '2026-07-01',
    invited: 1500,
    responded: 412,
    sampleMode: 'random',
    questions: [
      {
        id: 'q1',
        text: {
          es: '¿Recomendaría este hospital a un familiar?',
          en: 'Would you recommend this hospital to a relative?',
        },
        pct: 91,
        avgCertainty: 7.9,
        distribution: [4, 6, 9, 12, 18, 31, 52, 88, 104, 88],
      },
      {
        id: 'q2',
        text: {
          es: '¿Le explicaron con claridad su tratamiento?',
          en: 'Was your treatment explained clearly?',
        },
        pct: 84,
        avgCertainty: 6.8,
        distribution: [9, 12, 20, 26, 38, 52, 71, 80, 61, 43],
      },
      {
        id: 'q3',
        text: {
          es: '¿El tiempo de espera fue razonable?',
          en: 'Was the waiting time reasonable?',
        },
        pct: 62,
        avgCertainty: 5.5,
        distribution: [28, 31, 39, 47, 61, 59, 52, 44, 31, 20],
      },
    ],
  },
  {
    id: 'r-2026-q2',
    title: { es: 'Piloto privado: atención al paciente', en: 'Private pilot: patient care' },
    period: { es: 'Q2 2026 · cerrada', en: 'Q2 2026 · closed' },
    status: 'closed',
    visibility: 'private',
    visibilityLockedAt: '2026-04-02',
    invited: 900,
    responded: 198,
    sampleMode: 'all',
    questions: [
      {
        id: 'q1',
        text: {
          es: '¿Recomendaría este hospital a un familiar?',
          en: 'Would you recommend this hospital to a relative?',
        },
        pct: 88,
        avgCertainty: 7.2,
        distribution: [3, 5, 7, 9, 14, 22, 33, 41, 38, 26],
      },
      {
        id: 'q2',
        text: {
          es: '¿Le explicaron con claridad su tratamiento?',
          en: 'Was your treatment explained clearly?',
        },
        pct: 79,
        avgCertainty: 6.3,
        distribution: [6, 8, 13, 17, 24, 30, 35, 29, 21, 15],
      },
    ],
  },
]

export function responseRate(r: Pick<DemoReading, 'invited' | 'responded'>) {
  return r.invited > 0 ? Math.round((r.responded / r.invited) * 1000) / 10 : 0
}

export const DEMO_SELLO_READING_ID = 'r-2026-q3'
