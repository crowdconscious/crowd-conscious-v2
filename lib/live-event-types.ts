export const LIVE_EVENT_TYPE_KEYS = [
  'soccer_match',
  'product_launch',
  'government_conference',
  'entertainment',
  'community_event',
  'live_auction',
  'custom',
] as const

export type LiveEventTypeKey = (typeof LIVE_EVENT_TYPE_KEYS)[number]

export type LiveEventFieldKey =
  | 'matchTitle'
  | 'kickoffDate'
  | 'youtubeUrl'
  | 'teamA'
  | 'teamB'
  | 'coverImage'
  | 'sponsor'
  | 'eventTitle'
  | 'startDate'
  | 'brandName'
  | 'brandLogo'
  | 'speakerName'
  | 'showName'
  | 'organizerName'

export type LiveEventTypeConfig = {
  icon: string
  label: { es: string; en: string }
  description: { es: string; en: string }
  fields: LiveEventFieldKey[]
  suggestedQuestions: { es: string[]; en: string[] }
}

export const EVENT_TYPE_CONFIG: Record<LiveEventTypeKey, LiveEventTypeConfig> = {
  soccer_match: {
    icon: '⚽',
    label: { es: 'Partido de fútbol', en: 'Soccer match' },
    description: {
      es: 'World Cup, Liga MX, amistosos',
      en: 'World Cup, Liga MX, friendlies',
    },
    fields: ['matchTitle', 'kickoffDate', 'youtubeUrl', 'teamA', 'teamB', 'coverImage', 'sponsor'],
    suggestedQuestions: {
      es: [
        '¿Quién anota el primer gol?',
        '¿Quién gana el partido?',
        '¿Gol antes del minuto 30?',
        '¿Habrá penalti?',
        '¿Cuántos goles en total? (Más/menos de 2.5)',
        '¿Marcador al medio tiempo?',
        '¿Tarjeta roja en el partido?',
      ],
      en: [
        'Who scores first?',
        'Who wins the match?',
        'Goal before minute 30?',
        'Will there be a penalty?',
        'Total goals? (Over/under 2.5)',
        'Halftime score?',
        'Red card in the match?',
      ],
    },
  },

  product_launch: {
    icon: '🏷️',
    label: { es: 'Lanzamiento de marca', en: 'Brand launch' },
    description: {
      es: 'Producto, campaña, activación',
      en: 'Product, campaign, activation',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'brandName', 'brandLogo', 'coverImage', 'sponsor'],
    suggestedQuestions: {
      es: [
        '¿Qué precio tendrá el producto?',
        '¿Cuál feature será la más destacada?',
        '¿Lo comprarías?',
        '¿Superará las expectativas?',
        '¿Cuál será la reacción del público?',
        '¿Llegará a México este año?',
      ],
      en: [
        'What will the product price be?',
        'Which feature will be the highlight?',
        'Would you buy it?',
        'Will it exceed expectations?',
        'What will the audience reaction be?',
        'Will it launch in Mexico this year?',
      ],
    },
  },

  government_conference: {
    icon: '🏛️',
    label: { es: 'Conferencia gubernamental', en: 'Government conference' },
    description: {
      es: 'Discurso oficial, asamblea, debate',
      en: 'Official address, assembly, debate',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'speakerName', 'coverImage'],
    suggestedQuestions: {
      es: [
        '¿Anunciará nuevas medidas?',
        '¿Abordará el tema de seguridad?',
        '¿Habrá anuncios sobre transporte público?',
        '¿Mencionará el Mundial 2026?',
        '¿Cuál será el tono general?',
        '¿Habrá preguntas de la prensa?',
      ],
      en: [
        'Will new measures be announced?',
        'Will security be addressed?',
        'Public transit announcements?',
        'Will the 2026 World Cup be mentioned?',
        'What will the overall tone be?',
        'Will there be press questions?',
      ],
    },
  },

  entertainment: {
    icon: '🎬',
    label: { es: 'Entretenimiento', en: 'Entertainment' },
    description: {
      es: 'Estreno, premios, concierto',
      en: 'Premiere, awards, concert',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'showName', 'coverImage', 'sponsor'],
    suggestedQuestions: {
      es: [
        '¿Superará las expectativas de la audiencia?',
        '¿Cuál será la escena más comentada?',
        '¿Habrá un giro inesperado?',
        '¿Quién será el personaje más popular?',
        '¿Merecerá una temporada más?',
        '¿Rating final?',
      ],
      en: [
        'Will it exceed audience expectations?',
        'What will be the most talked-about moment?',
        'Will there be an unexpected twist?',
        'Who will be the most popular character?',
        'Will it deserve another season?',
        'Final rating?',
      ],
    },
  },

  community_event: {
    icon: '🏘️',
    label: { es: 'Evento comunitario', en: 'Community event' },
    description: {
      es: 'Foro público, debate local, asamblea',
      en: 'Public forum, local debate, assembly',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'organizerName', 'coverImage'],
    suggestedQuestions: {
      es: [
        '¿Cuál será el tema más debatido?',
        '¿Llegarán a un acuerdo?',
        '¿Cuántas personas asistirán?',
        '¿Qué propuesta tendrá más apoyo?',
        '¿El resultado será vinculante?',
      ],
      en: [
        'What will be the most debated topic?',
        'Will they reach an agreement?',
        'How many people will attend?',
        'Which proposal will have most support?',
        'Will the result be binding?',
      ],
    },
  },

  live_auction: {
    icon: '🔨',
    label: { es: 'Subasta en vivo', en: 'Live auction' },
    description: {
      es: 'Lugares Conscientes subastan productos exclusivos',
      en: 'Conscious Locations auction exclusive products',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'organizerName', 'coverImage', 'sponsor'],
    suggestedQuestions: {
      es: [
        '¿Qué producto se descuenta primero?',
        '¿Cuál pieza se subasta más alto?',
        '¿Habrá puja sorpresa?',
        '¿Cuántas piezas se venderán?',
        '¿Cuál es el precio final?',
      ],
      en: [
        'Which product gets discounted first?',
        'Which piece will sell highest?',
        'Will there be a surprise bid?',
        'How many items will sell?',
        'What is the final price?',
      ],
    },
  },

  custom: {
    icon: '⚙️',
    label: { es: 'Personalizado', en: 'Custom' },
    description: {
      es: 'Cualquier otro evento en vivo',
      en: 'Any other live event',
    },
    fields: ['eventTitle', 'startDate', 'youtubeUrl', 'coverImage', 'sponsor'],
    suggestedQuestions: { es: [], en: [] },
  },
}

export function suggestedQuestionsPayload(type: LiveEventTypeKey) {
  const q = EVENT_TYPE_CONFIG[type].suggestedQuestions
  return { es: [...q.es], en: [...q.en] }
}
