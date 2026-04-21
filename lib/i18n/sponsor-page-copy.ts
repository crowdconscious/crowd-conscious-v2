/** Bilingual copy for /sponsor (SponsorPageClient). */

export type SponsorLang = 'es' | 'en'

export function sponsorLang(locale: string): SponsorLang {
  return locale === 'es' ? 'es' : 'en'
}

export const sponsorPageCopy = {
  heroTitle: {
    es: 'Pon tu marca frente al Mundial',
    en: 'Put Your Brand in Front of the World Cup',
  },
  heroSubtitle: {
    es: 'Patrocina un mercado de predicciones. Conecta con millones de fans. Financia impacto social real.',
    en: 'Sponsor a prediction market. Engage millions of fans. Fund real social impact.',
  },
  browseCta: { es: 'Ver mercados disponibles', en: 'Browse Available Markets' },
  contactCta: { es: 'Contáctanos', en: 'Contact Us' },
  cardMockupCaption: { es: 'Tu marca en una tarjeta de mercado', en: 'Your brand on a market card' },
  sponsoredBy: { es: 'Patrocinado por', en: 'Sponsored by' },
  whyTitle: { es: '¿Por qué mercados de predicción?', en: 'Why Prediction Markets?' },
  whyIntro: {
    es: 'Los mercados de predicción han demostrado ser sorprendentemente precisos para anticipar eventos del mundo real.',
    en: 'Prediction markets have proven remarkably accurate at forecasting real-world events.',
  },
  stat94: { es: 'precisión en pronósticos de eventos', en: 'accurate at forecasting events' },
  stat94Note: { es: 'Polymarket, investigación académica', en: 'Polymarket, academic research' },
  stat22b: { es: 'espectadores esperados del Mundial 2026', en: 'World Cup viewers expected in 2026' },
  statMx: {
    es: 'Ciudad de México alberga el partido inaugural — el foco global estará aquí',
    en: 'Mexico City hosts the opening match — the global spotlight will be here',
  },
  howTitle: { es: 'Cómo funciona el patrocinio', en: 'How Sponsorship Works' },
  step1Title: { es: 'Elige un mercado', en: 'Choose a Market' },
  step1Desc: {
    es: 'Elige entre nuestros mercados activos — partidos del Mundial, metas de sustentabilidad, política pública, eventos de la ciudad. O propón un mercado personalizado.',
    en: 'Pick from our active prediction markets — World Cup matches, sustainability goals, policy outcomes, city events. Or propose a custom market that aligns with your brand.',
  },
  step2Title: { es: 'Tu marca al frente', en: 'Your Brand, Front & Center' },
  step2Desc: {
    es: 'Tu logo y nombre aparecen en la tarjeta del mercado, página de detalle y resultados. Enlace a tu sitio web o redes. Cada usuario que predice ve tu marca.',
    en: 'Your logo and name appear on the market card, detail page, and results. Link to your website, social media, or campaign. Every user who predicts sees your brand.',
  },
  step3Title: { es: 'Financia impacto real', en: 'Fund Real Impact' },
  step3Desc: {
    es: 'Entre el 20% y 40% de cada patrocinio va directamente a causas comunitarias — hasta 10× el promedio de la industria en causa marketing. La comunidad elige a dónde va el fondo.',
    en: 'Between 20% and 40% of every sponsorship goes directly to community causes — up to 10× the industry average for cause marketing. Users vote on where the fund goes.',
  },
  tiersSectionTitle: { es: 'Niveles de patrocinio', en: 'Sponsorship Tiers' },
  tiersIntro: {
    es: 'Precios claros. Cada nivel incluye aportación al Fondo Consciente (20–40% según el nivel).',
    en: 'Clean pricing. Every tier includes a Conscious Fund contribution (20–40% by tier).',
  },
  fundBanner: {
    es: 'Entre el 20% y 40% de cada patrocinio va directamente a causas comunitarias — hasta 10× el promedio de la industria en causa marketing.',
    en: 'Between 20% and 40% of every sponsorship goes directly to community causes — up to 10× the industry average for cause marketing.',
  },
  includesFund: { es: 'Incluye donación al Fondo Consciente', en: 'Includes Conscious Fund donation' },
  includesFundPct: { es: 'Incluye', en: 'Includes' },
  toConsciousFund: { es: 'al Fondo Consciente', en: 'to Conscious Fund' },
  sponsorNow: { es: 'Patrocinar ahora', en: 'Sponsor Now' },
  mostPopular: { es: 'Más Popular', en: 'Most Popular' },
  limitedPatrons: { es: 'Limitado a 5 patrones fundadores', en: 'Limited to 5 founding patrons' },
  tierStarterBest: {
    es: 'Ideal para negocios locales y primeros patrocinadores',
    en: 'Perfect for local businesses and first-time sponsors',
  },
  tierGrowthBest: {
    es: 'Ideal para medianas empresas y marcas regionales',
    en: 'Best for: Medium businesses, regional brands',
  },
  tierChampionBest: {
    es: 'Ideal para corporativos y marcas enfocadas en ESG',
    en: 'Best for: Corporations, ESG-focused brands',
  },
  tierAnchorBest: {
    es: 'Ideal para grandes patrocinadores y socios de medios',
    en: 'Best for: Major sponsors, media partners',
  },
  starterFeatures: {
    es: [
      'Logo en una tarjeta de mercado + página de detalle',
      'Tu marca llega a cada usuario que ve o comparte este mercado',
      'Enlace a tu sitio web / redes sociales',
      'Insignia "Patrocinado por [Marca]"',
    ],
    en: [
      'Logo on one market card + detail page',
      'Your brand reaches every user who views or shares this market',
      'Link to your website/social',
      '"Sponsored by [Brand]" badge',
    ],
  },
  growthFeatures: {
    es: [
      'Tu marca aparece en TODOS los mercados de una categoría',
      'Alcance promedio: 5–15 mercados × cientos de compartidos cada uno',
      'Ubicación destacada en la lista de mercados',
      'Panel de analíticas de patrocinio',
      'Mención en redes sociales',
    ],
    en: [
      'Your brand appears on ALL markets in an entire category',
      'Average reach: 5-15 markets × hundreds of shares each',
      'Featured placement on markets list',
      'Sponsor analytics dashboard',
      'Social media shoutout',
    ],
  },
  championFeatures: {
    es: [
      'Todos los beneficios de Patrocinador de Categoría',
      'Nombra una causa en el Fondo Consciente con tu marca',
      'Reporte trimestral de impacto con métricas de tu marca',
      'Mercado(s) personalizado(s) con tu marca + destacado en la página principal',
    ],
    en: [
      'All Category Sponsor benefits',
      'Name a cause in the Conscious Fund after your brand',
      "Quarterly impact report with your brand's contribution metrics",
      'Custom branded market(s) + featured on landing page',
    ],
  },
  anchorFeatures: {
    es: [
      'Todos los beneficios de Socio de Impacto',
      'Co-creación de estrategia de mercados para eventos',
      'Acceso VIP a analíticas de la plataforma',
      'Participación como speaker en eventos de Crowd Conscious',
    ],
    en: [
      'All Impact Partner benefits',
      'Co-create market strategy for events',
      'VIP access to platform analytics',
      'Speaking slot at Crowd Conscious events',
    ],
  },
  /** Conscious Pulse B2B pricing (below sponsorship tiers on /sponsor) */
  pulseSectionBadge: { es: '📊 Conscious Pulse', en: '📊 Conscious Pulse' },
  pulseSectionTitle: { es: 'Medición de sentimiento público', en: 'Public sentiment measurement' },
  pulseSectionSubtitle: {
    es: 'Para municipios, marcas e influencers que necesitan datos de opinión con certeza.',
    en: 'For municipalities, brands, and influencers who need opinion data with certainty.',
  },
  pulseUniqueTitle: { es: 'Pulse Único', en: 'Single Pulse' },
  pulsePackTitle: { es: 'Pulse Pack (3)', en: 'Pulse Pack (3)' },
  pulseSubTitle: { es: 'Suscripción mensual', en: 'Monthly subscription' },
  pulsePriceUnique: { es: '$5,000 MXN', en: '$5,000 MXN' },
  pulsePricePack: { es: '$12,000 MXN', en: '$12,000 MXN' },
  pulsePriceSub: { es: '$25,000/mes', en: '$25,000/mo' },
  pulseUsdUnique: { es: '~$250 USD', en: '~$250 USD' },
  pulseUsdPack: { es: '~$600 USD', en: '~$600 USD' },
  pulseUsdSub: { es: '~$1,250 USD/mes', en: '~$1,250 USD/mo' },
  pulseFeaturesUnique: {
    es: [
      '1 pregunta (hasta 6 opciones)',
      '7-30 días de votación',
      'Resultados en vivo + código QR',
      'Reporte PDF descargable',
    ],
    en: [
      '1 question (up to 6 options)',
      '7-30 days of voting',
      'Live results + QR code',
      'Downloadable PDF report',
    ],
  },
  pulseFundUnique: { es: '20% → Fondo Consciente', en: '20% → Conscious Fund' },
  pulseFeaturesPack: {
    es: [
      '3 preguntas',
      'Activo hasta 60 días',
      'Vista comparativa entre preguntas',
      'Ubicación destacada en plataforma',
    ],
    en: [
      '3 questions',
      'Active up to 60 days',
      'Comparison view across questions',
      'Featured placement on platform',
    ],
  },
  pulseFundPack: { es: '25% → Fondo Consciente', en: '25% → Conscious Fund' },
  pulseFeaturesSub: {
    es: [
      'Hasta 5 preguntas por mes',
      'Branding personalizado',
      'Acceso API a datos',
      'Reporte ejecutivo mensual',
      'Soporte dedicado',
    ],
    en: [
      'Up to 5 questions per month',
      'Custom branding',
      'API data access',
      'Monthly executive report',
      'Dedicated support',
    ],
  },
  pulseFundSub: { es: '40% → Fondo Consciente', en: '40% → Conscious Fund' },
  pulseIdealUnique: {
    es: 'Ideal para: prueba inicial, una consulta',
    en: 'Ideal for: initial test, one consultation',
  },
  pulseIdealPack: {
    es: 'Ideal para: consultas multi-tema',
    en: 'Ideal for: multi-topic consultations',
  },
  pulseIdealSub: {
    es: 'Ideal para: municipios, medios, marcas con agenda recurrente',
    en: 'Ideal for: municipalities, media, brands with a recurring agenda',
  },
  pulseEnterpriseNote: {
    es: '¿Necesitas algo más grande? Planes Enterprise desde $50,000 MXN/mes con white-label y API completa.',
    en: 'Need something bigger? Enterprise plans from $50,000 MXN/month with white-label and full API.',
  },
  tierNames: {
    starter: { es: 'Patrocinador de Mercado (Starter)', en: 'Market Sponsor (Starter)' },
    growth: { es: 'Patrocinador de Categoría', en: 'Category Sponsor' },
    champion: { es: 'Socio de Impacto', en: 'Impact Partner' },
    anchor: { es: 'Patrón Fundador', en: 'Founding Patron' },
  },
  approxUsd: { es: 'aprox.', en: '~' },
  availableTitle: { es: 'Mercados disponibles para patrocinar', en: 'Available Markets to Sponsor' },
  availableDesc: {
    es: 'Mercados activos sin patrocinador. Elige uno y paga con Stripe.',
    en: 'Active markets without a sponsor. Choose one and sponsor with Stripe checkout.',
  },
  filterLabel: { es: 'Filtrar por categoría:', en: 'Filter by category:' },
  filterAll: { es: 'Todos', en: 'All' },
  hot: { es: '🔥 Popular', en: '🔥 Hot' },
  sponsorThis: { es: 'Patrocinar este mercado →', en: 'Sponsor this market →' },
  predictions: { es: 'predicciones', en: 'predictions' },
  emptyUnsponsored: {
    es: 'Todos los mercados tienen patrocinador. Contáctanos para proponer un mercado personalizado.',
    en: 'All markets are currently sponsored. Contact us to propose a custom market.',
  },
  currentSponsorsTitle: { es: 'Patrocinadores actuales', en: 'Current Sponsors' },
  emptySponsored: {
    es: 'Sé la primera marca en patrocinar un mercado en Crowd Conscious. Los primeros patrocinadores obtienen reconocimiento de socio fundador.',
    en: 'Be the first brand to sponsor a market on Crowd Conscious. Early sponsors get founding partner recognition.',
  },
  visit: { es: 'Visitar', en: 'Visit' },
  faqTitle: { es: 'Preguntas frecuentes', en: 'Frequently Asked Questions' },
  faq1q: { es: '¿Cómo aparece mi marca?', en: 'How does my brand appear?' },
  faq1a: {
    es: 'Tu logo y nombre aparecen en la tarjeta del mercado, página de detalle, imágenes para compartir y leaderboard. Cada vez que alguien comparte una predicción, tu marca viaja con ella.',
    en: 'Your logo and name appear on the market card, detail page, share images, and leaderboard. Every time someone shares a prediction, your brand travels with it.',
  },
  faq2q: {
    es: '¿Qué pasa con la aportación al Fondo Consciente (20–40% según nivel)?',
    en: 'What happens to the Conscious Fund contribution (20–40% by tier)?',
  },
  faq2a: {
    es: 'Los usuarios votan qué causas comunitarias reciben fondos cada mes. Tu marca recibe crédito por el impacto. Te enviamos un reporte trimestral.',
    en: 'Users vote on which community causes receive grants each month. Your brand gets credited for the impact. We send you a quarterly report.',
  },
  faq3q: { es: '¿Puedo elegir qué mercado patrocinar?', en: 'Can I choose which market to sponsor?' },
  faq3a: {
    es: '¡Sí! Explora los mercados disponibles arriba o contáctanos para crear un mercado personalizado alineado con tu marca.',
    en: 'Yes! Browse available markets above, or contact us to create a custom market aligned with your brand.',
  },
  faq4q: { es: '¿Esto es apuestas?', en: 'Is this gambling?' },
  faq4a: {
    es: 'No. Crowd Conscious es 100% gratis para jugar. Los usuarios expresan opiniones, no dinero. Tu patrocinio es inversión en marketing con impacto social.',
    en: 'No. Crowd Conscious is 100% free-to-play. Users express opinions, not money. Your sponsorship is marketing spend with social impact — like any other ad buy, but better.',
  },
  faq5q: { es: '¿Cuándo debería patrocinar?', en: 'When should I sponsor?' },
  faq5a: {
    es: 'Ahora. Las campañas del Mundial 2026 empiezan meses antes del 11 de junio. Los primeros patrocinadores obtienen máxima exposición mientras crece nuestra base de usuarios.',
    en: 'Now. World Cup 2026 campaigns start months before June 11. Early sponsors get maximum exposure as we grow our user base.',
  },
  influencerTitle: {
    es: '¿No eres una empresa? Aún puedes generar impacto.',
    en: 'Not a business? You can still make an impact.',
  },
  influencerBody: {
    es: 'Las personas pueden patrocinar un mercado desde $500 MXN. Tu nombre (o red social) aparece en el mercado. Ideal para creadores de contenido.',
    en: 'Individual supporters can sponsor a single market starting at $500 MXN. Your name (or social handle) appears on the market. Perfect for influencers, content creators, and anyone who wants to put their reputation behind a prediction.',
  },
  influencerCta: { es: 'Patrocinar como persona', en: 'Sponsor as Individual' },
  wcTitle: { es: 'Lanzamiento con la Copa Mundial FIFA 2026', en: 'Launching with the 2026 FIFA World Cup' },
  wcSubtitle: {
    es: 'Los primeros patrocinadores obtienen ubicación premium durante el mayor evento deportivo en la historia de la Ciudad de México.',
    en: "First sponsors get premium placement during the biggest sporting event in Mexico City's history.",
  },
  wcStat1: { es: 'partidos en el Estadio Azteca', en: 'matches at Estadio Azteca' },
  wcStat2: { es: 'aficionados en el Fan Fest del Zócalo', en: 'fans at the Zócalo Fan Fest' },
  wcStat3: { es: 'naciones, 1 ciudad, tu marca', en: 'nations, 1 city, your brand' },
  ctaTitle: { es: '¿Listo para generar impacto?', en: 'Ready to make an impact?' },
  ctaBody: {
    es: 'Hablemos de cómo tu marca puede llegar a millones durante el Mundial.',
    en: "Let's discuss how your brand can reach millions during the World Cup.",
  },
  emailUs: { es: 'Escríbenos', en: 'Email Us' },
  mockCardNoOg: {
    title: {
      es: '¿México ganará el partido inaugural en el Estadio Azteca?',
      en: 'Will Mexico win the opening match at Estadio Azteca?',
    },
    tag: { es: '⚽ Mundial', en: '⚽ World Cup' },
    consensus: { es: 'Consenso actual de la comunidad', en: 'Current crowd consensus' },
    yes: { es: '42% Sí', en: '42% Yes' },
  },
} as const

const CATEGORY_LABELS: Record<string, { es: string; en: string }> = {
  world: { es: 'Mundo', en: 'World' },
  world_cup: { es: 'Mundial', en: 'World Cup' },
  pulse: { es: 'Pulse', en: 'Pulse' },
  government: { es: 'Gobierno', en: 'Government' },
  geopolitics: { es: 'Geopolítica', en: 'Geopolitics' },
  corporate: { es: 'Corporativo', en: 'Corporate' },
  community: { es: 'Comunidad', en: 'Community' },
  cause: { es: 'Causa', en: 'Cause' },
  sustainability: { es: 'Sustentabilidad', en: 'Sustainability' },
  technology: { es: 'Tecnología', en: 'Technology' },
  economy: { es: 'Economía', en: 'Economy' },
  entertainment: { es: 'Entretenimiento', en: 'Entertainment' },
}

export function sponsorCategoryLabel(categoryKey: string, lang: SponsorLang): string {
  return CATEGORY_LABELS[categoryKey]?.[lang] ?? categoryKey
}

export function sponsorMailtoQuery(marketTitle: string | undefined, tier: string | undefined, lang: SponsorLang) {
  const subject =
    lang === 'es'
      ? 'Consulta de patrocinio — Crowd Conscious'
      : 'Sponsorship Inquiry - Crowd Conscious'
  const body =
    lang === 'es'
      ? `Hola, me interesa patrocinar un mercado en Crowd Conscious.\n\nMercado: ${marketTitle || '(no especificado)'}\nNivel: ${tier || '(no especificado)'}\nEmpresa/Nombre: \n`
      : `Hi, I'm interested in sponsoring a market on Crowd Conscious.\n\nMarket: ${marketTitle || '(not specified)'}\nTier: ${tier || '(not specified)'}\nCompany/Name: \n`
  return `mailto:comunidad@crowdconscious.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
