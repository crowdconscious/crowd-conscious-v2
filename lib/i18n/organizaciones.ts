/**
 * Copy for /organizaciones (B2B). Source: /workspace/orgs/deck_copy_v2.md.
 * Vocabulary: "lectura" = the product; "consulta" = the period it is open.
 */
export type OrgLocale = 'es' | 'en'

const es = {
  metaTitle: 'Crowd Conscious para organizaciones | Satisfacción con certeza',
  metaDescription:
    'Sepa qué tan seguros están sus usuarios, no solo si dicen que sí. Lecturas con certeza de 1 a 10 por respuesta y resultados que usted nunca edita. Piloto privado $39,000 MXN + IVA.',
  eyebrow: 'Para organizaciones',
  heroTitle: 'Sepa qué tan seguros están sus usuarios, no solo si dicen que sí.',
  heroSub:
    'Medimos la satisfacción con certeza de 1 a 10 por respuesta, con resultados que usted nunca edita. Así puede presentarla con confianza ante su consejo, sus reguladores o sus usuarios.',
  ctaPilot: 'Contratar piloto',
  ctaDemo: 'Ver demo',
  ctaCall: 'Agendar 20 min',
  callSubject: 'Agendar 20 min · Crowd Conscious para organizaciones',

  problemTitle: 'La pregunta que su reporte no responde',
  problemHeadline: '98% dijo que sí. ¿Cuántos lo dirían con certeza 9?',
  fictitious: 'Ejemplo ilustrativo · datos ficticios',
  companyA: 'Empresa A',
  companyB: 'Empresa B',
  saidYes: 'dijo que sí',
  avgCertainty: 'certeza promedio',
  problemFoot: 'Con solo el porcentaje se ven idénticas. Con la certeza, no.',

  howTitle: 'Cómo funciona',
  howSub: '4 pasos, 4 a 6 semanas',
  steps: [
    { t: 'Diseñamos juntos', d: 'Hasta 3 preguntas, y revisamos que ninguna empuje la respuesta.' },
    {
      t: 'Usted decide antes de abrir la consulta',
      d: 'Si el resultado será privado o público. Lo dejamos registrado y no cambia después de ver el resultado.',
    },
    {
      t: 'Invitamos con enlaces de un solo uso',
      d: 'Usted nos envía identificadores anónimos, nosotros sorteamos la muestra (o invitamos a toda la base) y usted distribuye los enlaces por sus propios canales.',
    },
    {
      t: 'Entregamos',
      d: 'El % y la certeza por pregunta, los invitados, las respuestas y la tasa de respuesta, una nota metodológica y una sesión de resultados de 45 min.',
    },
  ],

  whyTitle: 'Por qué confiar en el resultado',
  why: [
    { t: 'Certeza, no solo porcentaje', d: 'Un «sí» firme y uno tibio dejan de pesar igual.' },
    { t: 'Una muestra que usted no elige', d: 'Nadie puede enviarla solo a quien salió contento.' },
    { t: 'Resultados que nadie edita', d: 'Ninguna lectura se oculta ni se retrasa.' },
    { t: 'Privado por diseño', d: 'Nunca recibimos nombres, correos ni teléfonos.' },
  ],

  pricingTitle: 'Un piloto para empezar. Dos formas de seguir.',
  pricingSub: 'Todos los precios son en MXN más IVA. El 20% de cada contrato (antes de IVA) va al Fondo Consciente.',
  step1: '1 · Empiece aquí',
  pilotName: 'Lectura piloto privada',
  pilotUnit: 'MXN + IVA · pago único',
  pilotBullets: [
    'Hasta 3 preguntas neutrales; toda su base o una muestra que sorteamos nosotros',
    'El resultado es solo para usted, con nota metodológica',
    'PDF y sesión de resultados de 45 min, en 4 a 6 semanas',
    '100% abonable a Escucha continua si la contrata dentro de 90 días',
  ],
  step2: '2 · Después del piloto, elija cómo seguir',
  annualName: 'Lectura anual',
  annualUnit: 'MXN + IVA al año',
  annualBullets: ['1 lectura al año', '1 sesión de resultados', 'Arranque en 4 a 6 semanas', 'Ideal para Calidad o Cumplimiento con reporte anual'],
  contName: 'Escucha continua',
  contUnit: 'MXN + IVA al mes',
  contNote: '$174,000 al año',
  contBullets: [
    '4 lecturas al año (trimestrales)',
    'Tablero en vivo de solo lectura',
    '4 sesiones de resultados',
    'Arranque en 3 semanas',
    'Ideal para Experiencia del Cliente con alto volumen',
  ],
  step3: '3 · Complemento opcional',
  selloName: 'Sello verificado «Calificado por sus usuarios»',
  selloUnit: 'MXN + IVA al mes, sobre Escucha continua',
  selloDesc:
    'Para organizaciones dispuestas a ser transparentes en público: página pública y distintivo con la última lectura, buena o mala. Disponible después de un trimestre completo de Escucha.',
  requestProposal: 'Solicitar propuesta',
  cfdiNote: 'Emitimos CFDI 4.0. Pedimos sus datos fiscales antes del pago.',

  publicTitle: 'Público o privado: se decide antes',
  publicBody:
    'Usted elige antes de abrir la consulta, no después de ver el resultado. Por omisión, el resultado es privado. Si elige una lectura pública o el Sello, publicamos lo que salga, bueno o malo. Si retira el Sello, se retira públicamente. Por eso un resultado público vale algo.',

  whoTitle: 'Para quién',
  whoBody:
    'Áreas que reportan la satisfacción (Calidad, Cumplimiento, Experiencia del Paciente) y áreas que cuidan la confianza (Experiencia del Cliente, Marketing, Marca).',
  sectors: [
    'Aseguradoras y salud',
    'Hospitales y clínicas',
    'Bancos y fintech',
    'Telecomunicaciones',
    'Aerolíneas y movilidad',
    'Energía',
    'Universidades',
    'Administradores de condominio',
  ],

  methodTitle: 'Honestidad metodológica',
  method: [
    { t: 'A quién invitamos', d: 'A su propia base, completa o a una muestra aleatoria que sorteamos nosotros a partir de identificadores anónimos. Cada enlace funciona una sola vez.' },
    { t: 'Qué reportamos', d: 'Invitados, respuestas, tasa de respuesta y cobertura de la base. No prometemos un margen de error.' },
    { t: 'No respuesta', d: 'Quien no responde puede pensar distinto. Por eso la tasa de respuesta acompaña cada cifra. Un 12% dicho con honestidad informa más que un 98% sin denominador.' },
    { t: 'Durante la consulta', d: 'Usted solo ve la tasa de respuesta.' },
    { t: 'Sus usuarios siguen siendo suyos', d: 'Nunca los invitamos a Crowd Conscious.' },
  ],

  fundTitle: '20% al Fondo Consciente',
  fundBody:
    'El 20% de cada contrato, calculado antes de IVA, va al Fondo Consciente, para causas que vota la comunidad. Queda por escrito en el contrato.',
  fundExample: 'En el piloto: $7,800 MXN al Fondo.',
  fundLink: 'Ver el Fondo',

  finalTitle: 'Pida su lectura piloto',
  finalSub: 'Francisco Blockstrand · francisco@crowdconscious.app · +52 55 4449 0458',
  communityLink: '¿Buscas apoyar a la comunidad, no medir a tus usuarios? Ve a Patrocinio comunitario.',
}

type Copy = typeof es

const en: Copy = {
  metaTitle: 'Crowd Conscious for organizations | Satisfaction with certainty',
  metaDescription:
    'Know how sure your users are, not just whether they say yes. Readings with 1-10 certainty per answer and results you never edit. Private pilot $39,000 MXN + VAT.',
  eyebrow: 'For organizations',
  heroTitle: 'Know how sure your users are, not just whether they say yes.',
  heroSub:
    'We measure satisfaction with 1-10 certainty per answer, with results you never edit, so you can present them with confidence to your board, regulators or users.',
  ctaPilot: 'Buy the pilot',
  ctaDemo: 'See the demo',
  ctaCall: 'Book 20 min',
  callSubject: 'Book 20 min · Crowd Conscious for organizations',

  problemTitle: 'The question your report does not answer',
  problemHeadline: '98% said yes. How many would say it with certainty 9?',
  fictitious: 'Illustrative example · fictitious data',
  companyA: 'Company A',
  companyB: 'Company B',
  saidYes: 'said yes',
  avgCertainty: 'average certainty',
  problemFoot: 'With the percentage alone they look identical. With certainty, they do not.',

  howTitle: 'How it works',
  howSub: '4 steps, 4 to 6 weeks',
  steps: [
    { t: 'We design it together', d: 'Up to 3 questions, checked so none of them pushes the answer.' },
    {
      t: 'You decide before the consultation opens',
      d: 'Whether the result will be private or public. We record it, and it does not change after you see the result.',
    },
    {
      t: 'We invite with single-use links',
      d: 'You send us anonymous identifiers, we draw the sample (or invite your whole base) and you distribute the links through your own channels.',
    },
    {
      t: 'We deliver',
      d: 'The % and certainty per question, invitees, responses and response rate, a methodology note and a 45-min results session.',
    },
  ],

  whyTitle: 'Why trust the result',
  why: [
    { t: 'Certainty, not just percentage', d: 'A firm "yes" and a lukewarm one no longer weigh the same.' },
    { t: 'A sample you do not pick', d: 'Nobody can send it only to the happy customers.' },
    { t: 'Results nobody edits', d: 'No reading is hidden or delayed.' },
    { t: 'Private by design', d: 'We never receive names, emails or phone numbers.' },
  ],

  pricingTitle: 'One pilot to start. Two ways to continue.',
  pricingSub: 'All prices are in MXN plus VAT (IVA). 20% of every contract (before VAT) goes to the Conscious Fund.',
  step1: '1 · Start here',
  pilotName: 'Private pilot reading',
  pilotUnit: 'MXN + VAT · one-time',
  pilotBullets: [
    'Up to 3 neutral questions; your whole base or a sample we draw',
    'The result is for you only, with a methodology note',
    'PDF and a 45-min results session, in 4 to 6 weeks',
    '100% credited toward Continuous listening if you sign within 90 days',
  ],
  step2: '2 · After the pilot, choose how to continue',
  annualName: 'Annual reading',
  annualUnit: 'MXN + VAT per year',
  annualBullets: ['1 reading per year', '1 results session', 'Starts in 4 to 6 weeks', 'Best for Quality or Compliance with an annual report'],
  contName: 'Continuous listening',
  contUnit: 'MXN + VAT per month',
  contNote: '$174,000 per year',
  contBullets: [
    '4 readings per year (quarterly)',
    'Read-only live dashboard',
    '4 results sessions',
    'Starts in 3 weeks',
    'Best for high-volume Customer Experience teams',
  ],
  step3: '3 · Optional add-on',
  selloName: 'Verified Seal "Rated by its users"',
  selloUnit: 'MXN + VAT per month, on top of Continuous listening',
  selloDesc:
    'For organizations willing to be transparent in public: a public page and badge with the latest reading, good or bad. Available after one full quarter of Continuous listening.',
  requestProposal: 'Request a proposal',
  cfdiNote: 'We issue CFDI 4.0 invoices. We ask for your tax data before payment.',

  publicTitle: 'Public or private: decided beforehand',
  publicBody:
    'You choose before the consultation opens, not after seeing the result. By default, the result is private. If you choose a public reading or the Seal, we publish whatever comes out, good or bad. If you withdraw the Seal, it is withdrawn publicly. That is why a public result is worth something.',

  whoTitle: 'Who it is for',
  whoBody:
    'Teams that report satisfaction (Quality, Compliance, Patient Experience) and teams that look after trust (Customer Experience, Marketing, Brand).',
  sectors: [
    'Insurance and health',
    'Hospitals and clinics',
    'Banks and fintech',
    'Telecommunications',
    'Airlines and mobility',
    'Energy',
    'Universities',
    'Condominium managers',
  ],

  methodTitle: 'Methodological honesty',
  method: [
    { t: 'Who we invite', d: 'Your own base, in full or a random sample we draw from anonymous identifiers. Every link works only once.' },
    { t: 'What we report', d: 'Invitees, responses, response rate and base coverage. We do not promise a margin of error.' },
    { t: 'Non-response', d: 'People who do not answer may think differently. That is why the response rate goes with every number. An honest 12% says more than a 98% with no denominator.' },
    { t: 'During the consultation', d: 'You only see the response rate.' },
    { t: 'Your users stay yours', d: 'We never invite them to Crowd Conscious.' },
  ],

  fundTitle: '20% to the Conscious Fund',
  fundBody:
    '20% of every contract, calculated before VAT, goes to the Conscious Fund, for causes the community votes on. It is written into the contract.',
  fundExample: 'For the pilot: $7,800 MXN to the Fund.',
  fundLink: 'See the Fund',

  finalTitle: 'Request your pilot reading',
  finalSub: 'Francisco Blockstrand · francisco@crowdconscious.app · +52 55 4449 0458',
  communityLink: 'Looking to support the community rather than measure your users? See Community sponsorship.',
}

export function getOrgCopy(locale: OrgLocale): Copy {
  return locale === 'en' ? en : es
}
