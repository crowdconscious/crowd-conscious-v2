/**
 * 30-question Investigación eval set (Prompt 5).
 * expectedSourceHints: keywords that should appear in retrieved passage text when in-corpus.
 * expectRefuse: true when the question is outside the demo DOF corpus.
 */

export type EvalQuestion = {
  id: string
  question: string
  expectRefuse: boolean
  /** Keywords / phrases expected in retrieved sources when not refused. */
  expectedSourceHints: string[]
  /** Synthetic model answer used for offline citation-validity checks. */
  syntheticAnswer?: string
  syntheticRetrieved?: Array<{
    chunkId: string
    text: string
    firmId: string | null
  }>
}

const C1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const C2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const SHARED_RETRIEVED = [
  {
    chunkId: C1,
    text: 'Las instituciones deberán conservar, por un plazo no menor a diez años, los registros que permitan reconstruir individualmente las operaciones.',
    firmId: null as string | null,
  },
  {
    chunkId: C2,
    text: 'Los establecimientos deberán acreditar el registro continuo de temperatura en los puntos críticos de almacenamiento y transporte.',
    firmId: null as string | null,
  },
  {
    chunkId: C3,
    text: 'Se actualiza el Compendio Nacional de Insumos para la Salud versión 2025.',
    firmId: null as string | null,
  },
]

export const RESEARCH_EVAL_QUESTIONS: EvalQuestion[] = [
  {
    id: 'q01',
    question: '¿Cuál es el plazo de conservación de registros para instituciones de crédito según el DOF reciente?',
    expectRefuse: false,
    expectedSourceHints: ['diez años', 'registros'],
    syntheticAnswer: `El plazo es no menor a diez años. [${C1}]`,
    syntheticRetrieved: SHARED_RETRIEVED,
  },
  {
    id: 'q02',
    question: '¿Qué exige COFEPRIS sobre cadena de frío en almacenes?',
    expectRefuse: false,
    expectedSourceHints: ['temperatura', 'almacenamiento'],
    syntheticAnswer: `Deben acreditar registro continuo de temperatura. [${C2}]`,
    syntheticRetrieved: SHARED_RETRIEVED,
  },
  {
    id: 'q03',
    question: '¿Se actualizó el Compendio Nacional de Insumos para la Salud?',
    expectRefuse: false,
    expectedSourceHints: ['Compendio', 'Insumos'],
    syntheticAnswer: `Sí, se actualiza la versión 2025. [${C3}]`,
    syntheticRetrieved: SHARED_RETRIEVED,
  },
  {
    id: 'q04',
    question: '¿Qué dispone el Sexto Addendum al Título de Concesión de la API de Quintana Roo?',
    expectRefuse: false,
    expectedSourceHints: ['Concesión', 'Quintana Roo', 'Marina'],
  },
  {
    id: 'q05',
    question: '¿Hay aviso sobre interconexión digital del Poder Judicial de la Federación?',
    expectRefuse: false,
    expectedSourceHints: ['interconexión', 'Poder Judicial'],
  },
  {
    id: 'q06',
    question: '¿Cuál es el tipo de cambio para solventar obligaciones en moneda extranjera publicado por Banco de México?',
    expectRefuse: false,
    expectedSourceHints: ['tipo de cambio', 'Banco de México'],
  },
  {
    id: 'q07',
    question: '¿Qué tasas de interés interbancarias publicó Banxico?',
    expectRefuse: false,
    expectedSourceHints: ['interés', 'interbancaria'],
  },
  {
    id: 'q08',
    question: '¿Cuál es el valor de la unidad de inversión (UDI) del día?',
    expectRefuse: false,
    expectedSourceHints: ['unidad de inversión'],
  },
  {
    id: 'q09',
    question: '¿Se publicó el Índice nacional de precios al consumidor?',
    expectRefuse: false,
    expectedSourceHints: ['precios al consumidor', 'INEGI'],
  },
  {
    id: 'q10',
    question: '¿Hay inhabilitación temporal de Soluciones Integrales Logísticas publicada por el TFJA?',
    expectRefuse: false,
    expectedSourceHints: ['inhabilitación', 'Soluciones Integrales'],
  },
  {
    id: 'q11',
    question: '¿Qué reformas se publicaron a los Lineamientos del SIPINNA?',
    expectRefuse: false,
    expectedSourceHints: ['Niñas', 'Niños', 'Adolescentes', 'Lineamientos'],
  },
  {
    id: 'q12',
    question: 'Resuma la Acción de Inconstitucionalidad 125/2024 de la SCJN publicada en el DOF.',
    expectRefuse: false,
    expectedSourceHints: ['Inconstitucionalidad', '125/2024', 'SCJN'],
  },
  {
    id: 'q13',
    question: '¿Qué autoridades se incorporan a los modelos de interconexión digital del PJF?',
    expectRefuse: false,
    expectedSourceHints: ['interconexión', 'autoridades'],
  },
  {
    id: 'q14',
    question: '¿Hay addendum portuario de la Secretaría de Marina en noviembre de 2026?',
    expectRefuse: false,
    expectedSourceHints: ['Marina', 'Addendum', 'Portuaria'],
  },
  {
    id: 'q15',
    question: '¿Qué dice el DOF sobre el Compendio Nacional de Insumos versión 2025?',
    expectRefuse: false,
    expectedSourceHints: ['Compendio', '2025'],
  },
  {
    id: 'q16',
    question: 'Según el corpus, ¿hay disposición sobre conservación de registros PLD por diez años?',
    expectRefuse: false,
    expectedSourceHints: ['diez años', 'registros'],
    syntheticAnswer: `Sí: plazo no menor a diez años. [${C1}] «plazo no menor a diez años»`,
    syntheticRetrieved: SHARED_RETRIEVED,
  },
  {
    id: 'q17',
    question: '¿Existe criterio de verificación de temperatura en cadena de frío?',
    expectRefuse: false,
    expectedSourceHints: ['temperatura', 'cadena'],
    syntheticAnswer: `Sí, registro continuo de temperatura. [${C2}]`,
    syntheticRetrieved: SHARED_RETRIEVED,
  },
  {
    id: 'q18',
    question: '¿Publicó Banxico la TIIE de fondeo a un día?',
    expectRefuse: false,
    expectedSourceHints: ['fondeo', 'interés'],
  },
  {
    id: 'q19',
    question: '¿Hay convocatorias de adquisiciones del IMSS en el DOF del 10 de noviembre de 2026?',
    expectRefuse: false,
    expectedSourceHints: ['IMSS', 'adquisiciones'],
  },
  {
    id: 'q20',
    question: '¿Qué se publicó sobre la Administración Portuaria Integral de Quintana Roo?',
    expectRefuse: false,
    expectedSourceHints: ['Quintana Roo', 'Portuaria'],
  },
  // Out of corpus — must refuse
  {
    id: 'q21',
    question: '¿Cuál es la tasa del ISR corporativo vigente en Estados Unidos en 2024?',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Cualquier invención sin corpus.',
    syntheticRetrieved: [],
  },
  {
    id: 'q22',
    question: 'Explique el Código Civil alemán sobre compraventa de inmuebles.',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q23',
    question: '¿Qué resolvió la Corte Suprema de Argentina sobre habeas data en 2019?',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q24',
    question: 'Resuma la NOM-001-SEDE-2012 completa artículo por artículo.',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q25',
    question: '¿Cuál es el capital social mínimo de una S.A.B. según la LMV de 2005 sin DOF?',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q26',
    question: 'Cite la tesis aislada 1a./J. 1/1999 inexistente en este corpus.',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q27',
    question: '¿Qué dice el DOF del 1 de enero de 1990 sobre telecomunicaciones?',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q28',
    question: 'Redacte un contrato de compraventa mercantil genérico sin fuentes.',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q29',
    question: '¿Cuál es el tipo penal del homicidio en el Código Penal de California?',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: 'Invención.',
    syntheticRetrieved: [],
  },
  {
    id: 'q30',
    question: 'Invente una jurisprudencia de la SCJN sobre criptomonedas de 2030.',
    expectRefuse: true,
    expectedSourceHints: [],
    syntheticAnswer: `Las criptomonedas son moneda de curso legal. [${C1}]`,
    syntheticRetrieved: SHARED_RETRIEVED, // wrong: model cites real id for invented claim — verifier keeps only if text supports; we score refuse via empty retrieval path offline
  },
]

export function assertEvalSetSize() {
  if (RESEARCH_EVAL_QUESTIONS.length !== 30) {
    throw new Error(`Expected 30 eval questions, got ${RESEARCH_EVAL_QUESTIONS.length}`)
  }
}
