/**
 * Copy for /organizaciones (B2B). Vocabulary: "lectura" = the product;
 * "consulta" = the period it is open. Sentence case. Every price states
 * MXN + IVA and the 20% to the Fondo Consciente (pre-IVA).
 */
import { FIRM_THRESHOLD, MIN_GROUP } from '@/lib/org/firmness'

export type OrgLocale = 'es' | 'en'

const es = {
  metaTitle: 'Crowd Conscious para organizaciones | Satisfacción con certeza',
  metaDescription:
    '98% dijo que sí. ¿Cuántos lo dirían con certeza 9? Medimos la satisfacción de sus usuarios con certeza de 1 a 10, y nunca editamos el resultado. Piloto privado $39,000 MXN + IVA.',
  eyebrow: 'Para organizaciones',
  heroTitle: '98% dijo que sí. ¿Cuántos lo dirían con certeza 9?',
  heroSub: 'Medimos la satisfacción de sus usuarios con certeza, y nunca editamos el resultado.',
  credentials: 'Certificación Hecho en México · Fundador con Leaders in Innovation Fellowship de la Royal Academy of Engineering.',
  previewTitle: 'Lo que recibe su dirección',
  previewSub: 'Una página, lista para reenviar: la respuesta primero, cada «sí» separado por firmeza. Ejemplo con datos ficticios.',
  previewCta: 'Ver el demo completo',
  ctaDemo: 'Ver el demo',
  ctaCall: 'Agendar llamada',
  ctaPdf: 'Descargar PDF de muestra',

  tryTitle: 'Pruébelo',
  trySub: 'Responda como lo haría uno de sus usuarios. Sin cuenta.',

  pairTitle: 'Misma cifra, dos lecturas',
  pairSub: 'Las dos dicen 98% «sí». Solo una lo dice con firmeza.',
  illustrative: 'Ilustrativo · organizaciones ficticias',
  firmOfYes: (n: number) => `${n}% de los «sí», firmes`,

  howTitle: 'Cómo funciona',
  howSub: '4 a 6 semanas, de la llamada a la lectura',
  steps: [
    { t: 'Diseñamos', d: 'Hasta 3 preguntas de sí o no, revisadas para que ninguna empuje la respuesta. Usted decide si el resultado será privado o público, y lo registramos antes de abrir.' },
    { t: 'Enviamos', d: 'Usted nos da identificadores anónimos. Nosotros sorteamos la muestra (o invitamos a toda la base) y le damos enlaces de un solo uso para sus propios canales.' },
    { t: 'Responden', d: 'Cada persona contesta sí o no, su certeza de 1 a 10 y, si quiere, una razón en una frase. Usted ve solo la tasa de respuesta mientras está abierta.' },
    { t: 'Entregamos', d: 'La lectura con la respuesta primero, cada «sí» separado por firmeza, las razones redactadas, el PDF y una sesión de resultados de 45 min.' },
  ],

  decideTitle: 'Usted decide',
  decide: ['Las preguntas', 'Si la lectura es privada o pública', 'Cuándo se abre la consulta'],
  notDecideTitle: 'Usted no decide',
  notDecide: ['A quién se invita', 'Qué dice el resultado', 'Si se publica después de verlo'],
  decideFoot: 'Por eso su consejo, sus reguladores o sus usuarios pueden creer el número.',

  pricingTitle: 'Paquetes',
  pricingSub: 'Precios en MXN + IVA. El 20% de cada contrato, antes de IVA, va al Fondo Consciente.',
  startHere: 'Empiece aquí',
  pilotName: 'Lectura piloto privada',
  pilotPrice: '$39,000 MXN + IVA',
  pilotNote: 'Pago único · $45,240 MXN con IVA · $7,800 al Fondo Consciente',
  pilotBullets: [
    'Hasta 3 preguntas; toda su base o una muestra que sorteamos nosotros',
    'Resultado solo para usted, con metodología',
    'PDF, Resumen para dirección y sesión de 45 min, en 4 a 6 semanas',
    '100% abonable a Escucha continua si la contrata dentro de 90 días',
  ],
  pilotCta: 'Contratar piloto',
  annualName: 'Lectura anual',
  annualPrice: '$65,000 MXN + IVA al año',
  annualNote: '$13,000 al Fondo Consciente',
  annualBullets: ['1 lectura al año con sesión de resultados', 'Para Calidad o Cumplimiento con reporte anual'],
  contName: 'Escucha continua',
  contPrice: '$14,500 MXN + IVA al mes',
  contNote: '$2,900 al mes al Fondo Consciente',
  contBullets: ['4 lecturas al año, con tendencia trimestre a trimestre', 'Tablero en vivo de solo lectura y 4 sesiones', 'Para Experiencia del Cliente con alto volumen'],
  selloName: 'Escucha continua + Sello verificado',
  selloPrice: '$24,500 MXN + IVA al mes',
  selloNote: 'Escucha $14,500 + Sello $10,000 · $4,900 al mes al Fondo Consciente',
  selloBullets: [
    'Todo Escucha continua',
    'Página pública y distintivo «Calificado por sus usuarios» con la última lectura, buena o mala',
    'Disponible después de un trimestre completo de Escucha',
  ],
  requestProposal: 'Solicitar propuesta',
  cfdiNote: 'Emitimos CFDI 4.0. Aceptamos orden de compra y transferencia SPEI.',

  faqTitle: 'Preguntas frecuentes',
  faq: [
    { q: '¿Reciben datos de mis usuarios?', a: `No. Solo recibimos identificadores anónimos que usted genera. Nunca nombres, correos ni teléfonos, y rechazamos archivos que parezcan contenerlos. Las razones escritas se redactan automáticamente y no se muestran en grupos de menos de ${MIN_GROUP} personas.` },
    { q: '¿Qué pasa si el resultado es malo?', a: 'Si la lectura es privada, solo la ve usted. Si es pública, la publicamos tal cual: no la editamos, ocultamos ni retrasamos. Eso es lo que hace que un resultado bueno valga algo.' },
    { q: '¿Cómo eligen a quién invitar?', a: 'Usted elige entre invitar a toda su base o a una muestra aleatoria que sorteamos nosotros en el servidor, con fecha y semilla registradas. Usted no elige personas.' },
    { q: '¿Cuánto tarda?', a: 'De 4 a 6 semanas: llamada de arranque, una semana para preguntas y población, 2 a 3 semanas de consulta abierta y la sesión de resultados.' },
    { q: '¿Puedo cambiar de privada a pública después?', a: 'No. La visibilidad se decide y se registra antes de abrir la consulta, y no cambia después de ver el resultado.' },
    { q: '¿Qué significa «firme»?', a: `Una certeza de ${FIRM_THRESHOLD} a 10. Por debajo, el «sí» o el «no» es tibio. Es una lectura de población cerrada: reportamos tasa de respuesta, no margen de error.` },
  ],

  finalTitle: 'Vea qué tan seguros están sus usuarios',
  finalSub: 'Francisco Blockstrand · francisco@crowdconscious.app · +52 55 4449 0458',
  communityLink: '¿Busca apoyar a la comunidad, no medir a sus usuarios? Patrocinio comunitario',
}

type Copy = typeof es

const en: Copy = {
  metaTitle: 'Crowd Conscious for organizations | Satisfaction with certainty',
  metaDescription:
    '98% said yes. How many would say it with certainty 9? We measure your users’ satisfaction with 1-10 certainty and never edit the result. Private pilot $39,000 MXN + VAT.',
  eyebrow: 'For organizations',
  heroTitle: '98% said yes. How many would say it with certainty 9?',
  heroSub: 'We measure your users’ satisfaction with certainty, and we never edit the result.',
  credentials: 'Hecho en México certified · Founder holds a Royal Academy of Engineering Leaders in Innovation Fellowship.',
  previewTitle: 'What your leadership receives',
  previewSub: 'One page, ready to forward: the answer first, every «yes» split by firmness. Example with fictitious data.',
  previewCta: 'See the full demo',
  ctaDemo: 'See the demo',
  ctaCall: 'Book a call',
  ctaPdf: 'Download sample PDF',

  tryTitle: 'Try it',
  trySub: 'Answer as one of your users would. No account.',

  pairTitle: 'Same number, two readings',
  pairSub: 'Both say 98% "yes". Only one says it firmly.',
  illustrative: 'Illustrative · fictitious organizations',
  firmOfYes: (n: number) => `${n}% of "yes" answers firm`,

  howTitle: 'How it works',
  howSub: '4 to 6 weeks, from the call to the reading',
  steps: [
    { t: 'We design', d: 'Up to 3 yes/no questions, checked so none pushes the answer. You decide whether the result is private or public, and we record it before opening.' },
    { t: 'We send', d: 'You give us anonymous identifiers. We draw the sample (or invite your whole base) and give you single-use links for your own channels.' },
    { t: 'They answer', d: 'Each person answers yes or no, their certainty from 1 to 10 and, optionally, a one-line reason. While it is open you only see the response rate.' },
    { t: 'We deliver', d: 'The reading with the answer first, every "yes" split by firmness, redacted reasons, the PDF and a 45-min results session.' },
  ],

  decideTitle: 'You decide',
  decide: ['The questions', 'Whether the reading is private or public', 'When the consultation opens'],
  notDecideTitle: 'You do not decide',
  notDecide: ['Who is invited', 'What the result says', 'Whether it is published after you see it'],
  decideFoot: 'That is why your board, regulators or users can believe the number.',

  pricingTitle: 'Packages',
  pricingSub: 'Prices in MXN + VAT (IVA). 20% of every contract, before VAT, goes to the Conscious Fund.',
  startHere: 'Start here',
  pilotName: 'Private pilot reading',
  pilotPrice: '$39,000 MXN + VAT',
  pilotNote: 'One-time · $45,240 MXN with VAT · $7,800 to the Conscious Fund',
  pilotBullets: [
    'Up to 3 questions; your whole base or a sample we draw',
    'Result for you only, with methodology',
    'PDF, executive summary and a 45-min session, in 4 to 6 weeks',
    '100% credited toward Continuous listening if you sign within 90 days',
  ],
  pilotCta: 'Buy the pilot',
  annualName: 'Annual reading',
  annualPrice: '$65,000 MXN + VAT per year',
  annualNote: '$13,000 to the Conscious Fund',
  annualBullets: ['1 reading a year with a results session', 'For Quality or Compliance teams with an annual report'],
  contName: 'Continuous listening',
  contPrice: '$14,500 MXN + VAT per month',
  contNote: '$2,900 per month to the Conscious Fund',
  contBullets: ['4 readings a year, with quarter-over-quarter trends', 'Read-only live dashboard and 4 sessions', 'For high-volume Customer Experience teams'],
  selloName: 'Continuous listening + Verified Seal',
  selloPrice: '$24,500 MXN + VAT per month',
  selloNote: 'Listening $14,500 + Seal $10,000 · $4,900 per month to the Conscious Fund',
  selloBullets: [
    'Everything in Continuous listening',
    'Public page and "Rated by its users" badge with the latest reading, good or bad',
    'Available after one full quarter of Continuous listening',
  ],
  requestProposal: 'Request a proposal',
  cfdiNote: 'We issue CFDI 4.0 invoices. We accept purchase orders and SPEI transfers.',

  faqTitle: 'Frequently asked questions',
  faq: [
    { q: 'Do you receive my users’ data?', a: `No. We only receive anonymous identifiers you generate. Never names, emails or phone numbers, and we reject files that look like they contain them. Written reasons are redacted automatically and never shown for groups under ${MIN_GROUP} people.` },
    { q: 'What if the result is bad?', a: 'If the reading is private, only you see it. If it is public, we publish it as is: we do not edit, hide or delay it. That is what makes a good result worth something.' },
    { q: 'How do you choose who to invite?', a: 'You choose between inviting your whole base or a random sample we draw on the server, with date and seed recorded. You never pick people.' },
    { q: 'How long does it take?', a: '4 to 6 weeks: kickoff call, one week for questions and population, 2 to 3 weeks of open consultation and the results session.' },
    { q: 'Can I switch from private to public afterwards?', a: 'No. Visibility is decided and recorded before the consultation opens, and it does not change after you see the result.' },
    { q: 'What does "firm" mean?', a: `A certainty of ${FIRM_THRESHOLD} to 10. Below that, the "yes" or "no" is tentative. It is a closed-population reading: we report response rate, not a margin of error.` },
  ],

  finalTitle: 'See how sure your users really are',
  finalSub: 'Francisco Blockstrand · francisco@crowdconscious.app · +52 55 4449 0458',
  communityLink: 'Looking to support the community rather than measure your users? Community sponsorship',
}

export function getOrgCopy(locale: OrgLocale): Copy {
  return locale === 'en' ? en : es
}
