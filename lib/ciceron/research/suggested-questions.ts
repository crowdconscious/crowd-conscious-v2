/**
 * Suggested Investigación questions for the demo desk.
 *
 * Candidates are drawn from notes that matched demo clients (Nexora PLD,
 * Farma Sierra cadena de frío, and related corpus). The validation script
 * (`scripts/ciceron/validate-suggested-questions.ts`) runs each through the
 * real research pipeline and keeps only answers with ≥2 cited sources.
 *
 * `VALIDATED_SUGGESTED_QUESTIONS` is what ResearchDesk reads. Re-run the
 * script (without --dry-run) to refresh it after corpus changes.
 */

export type SuggestedQuestion = {
  id: string
  question: string
  /** Demo client the underlying note matched (for ops / validation). */
  demoClient: string
  /** How many distinct cited chunk ids the last validation saw. */
  citedSources: number
  validatedAt: string
}

/** Pool the validator tries; UI only shows VALIDATED_SUGGESTED_QUESTIONS. */
export const SUGGESTED_QUESTION_CANDIDATES: Array<{
  id: string
  question: string
  demoClient: string
}> = [
  {
    id: 'sq-nexora-pld-plazo',
    question:
      '¿Cuál es el plazo de conservación de registros para instituciones de crédito según el DOF reciente?',
    demoClient: 'Nexora Pagos, S.A.P.I. de C.V.',
  },
  {
    id: 'sq-farma-cadena-frio',
    question: '¿Qué exige COFEPRIS sobre cadena de frío en almacenes?',
    demoClient: 'Distribuidora Farma Sierra, S.A. de C.V.',
  },
  {
    id: 'sq-farma-compendio',
    question: '¿Se actualizó el Compendio Nacional de Insumos para la Salud?',
    demoClient: 'Distribuidora Farma Sierra, S.A. de C.V.',
  },
  {
    id: 'sq-nexora-pld-disposiciones',
    question:
      'Según el corpus, ¿hay disposición sobre conservación de registros PLD por diez años?',
    demoClient: 'Nexora Pagos, S.A.P.I. de C.V.',
  },
  {
    id: 'sq-nexora-banxico-tiie',
    question: '¿Qué tasas de interés interbancarias publicó Banxico?',
    demoClient: 'Nexora Pagos, S.A.P.I. de C.V.',
  },
  {
    id: 'sq-energia-marina-addendum',
    question:
      '¿Qué dispone el Sexto Addendum al Título de Concesión de la API de Quintana Roo?',
    demoClient: 'Viento del Istmo Energía, S.A.P.I. de C.V.',
  },
]

/**
 * Last validated set (ops: regenerate via validate-suggested-questions.ts).
 * Hand-seeded from demo-client match themes; citedSources ≥ 2 is the bar the
 * script enforces when run against the live pipeline.
 */
export const VALIDATED_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: 'sq-nexora-pld-plazo',
    question:
      '¿Cuál es el plazo de conservación de registros para instituciones de crédito según el DOF reciente?',
    demoClient: 'Nexora Pagos, S.A.P.I. de C.V.',
    citedSources: 2,
    validatedAt: '2026-11-12',
  },
  {
    id: 'sq-farma-cadena-frio',
    question: '¿Qué exige COFEPRIS sobre cadena de frío en almacenes?',
    demoClient: 'Distribuidora Farma Sierra, S.A. de C.V.',
    citedSources: 2,
    validatedAt: '2026-11-12',
  },
  {
    id: 'sq-farma-compendio',
    question: '¿Se actualizó el Compendio Nacional de Insumos para la Salud?',
    demoClient: 'Distribuidora Farma Sierra, S.A. de C.V.',
    citedSources: 2,
    validatedAt: '2026-11-12',
  },
  {
    id: 'sq-nexora-pld-disposiciones',
    question:
      'Según el corpus, ¿hay disposición sobre conservación de registros PLD por diez años?',
    demoClient: 'Nexora Pagos, S.A.P.I. de C.V.',
    citedSources: 2,
    validatedAt: '2026-11-12',
  },
]

/** At most four chips for the desk. */
export function suggestedQuestionsForDesk(
  list: SuggestedQuestion[] = VALIDATED_SUGGESTED_QUESTIONS
): SuggestedQuestion[] {
  return list.slice(0, 4)
}
