// lib/agents/sources-config.ts
// Centralized source configuration for the News Monitor agent v2
// ─────────────────────────────────────────────────────────────

export interface RSSSource {
  url: string
  name: string
  category: string
  language: 'es' | 'en' | 'de'
}

export interface SocialSource {
  handle: string
  category: string
  platform: 'twitter' | 'instagram'
  priority: 'high' | 'medium' | 'low' // high = always scrape, low = only when budget allows
}

// ── RSS FEEDS (free, unlimited) ──
export const RSS_FEEDS: RSSSource[] = [
  // Mexico — General
  { url: 'https://www.eluniversal.com.mx/rss.xml', name: 'El Universal', category: 'general', language: 'es' },
  { url: 'https://www.excelsior.com.mx/rss.xml', name: 'Excélsior', category: 'general', language: 'es' },
  { url: 'https://www.sinembargo.mx/feed', name: 'Sin Embargo', category: 'politics', language: 'es' },
  { url: 'https://www.animalpolitico.com/feed', name: 'Animal Político', category: 'politics', language: 'es' },
  // Mexico — Business/Finance
  { url: 'https://expansion.mx/rss', name: 'Expansión', category: 'business', language: 'es' },
  { url: 'https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/', name: 'El Financiero', category: 'finance', language: 'es' },
  // Mexico — Independent/Investigative
  { url: 'https://www.proceso.com.mx/feed', name: 'Proceso', category: 'politics', language: 'es' },
  { url: 'https://latinus.us/feed', name: 'Latinus', category: 'politics', language: 'es' },
  // English
  { url: 'https://mexicotoday.com/feed', name: 'Mexico Today', category: 'general', language: 'en' },
  // International — Spanish
  { url: 'https://www.dw.com/es/rss', name: 'Deutsche Welle Español', category: 'world', language: 'es' },
  // Trending / viral / social pulse
  {
    url: 'https://www.eluniversal.com.mx/rss/tendencias.xml',
    name: 'El Universal Tendencias',
    category: 'trending',
    language: 'es',
  },
  { url: 'https://www.bbc.com/mundo/topics/c2lej05epw5t/rss.xml', name: 'BBC Mundo', category: 'world', language: 'es' },
  // Economy (dedicated feeds)
  {
    url: 'https://www.bloomberg.com/feeds/podcasts/bloomberg_en_espanol.xml',
    name: 'Bloomberg Español',
    category: 'economy',
    language: 'es',
  },
  // Sustainability / environment
  {
    url: 'https://www.greenpeace.org/mexico/feed/',
    name: 'Greenpeace México',
    category: 'sustainability',
    language: 'es',
  },
]

// ── TWITTER/X ACCOUNTS ──
export const TWITTER_ACCOUNTS: SocialSource[] = [
  // Prediction Markets (INSPIRATION for market ideas)
  { handle: 'polymarket', category: 'predictions', platform: 'twitter', priority: 'high' },
  { handle: 'polymarketsports', category: 'predictions', platform: 'twitter', priority: 'high' },
  // Mexico — News & Politics
  { handle: 'latinus_us', category: 'politics', platform: 'twitter', priority: 'high' },
  { handle: 'Reforma', category: 'politics', platform: 'twitter', priority: 'high' },
  { handle: 'AristeguiOnline', category: 'politics', platform: 'twitter', priority: 'medium' },
  // Mexico — Economy
  { handle: 'BloombergLinea', category: 'economy', platform: 'twitter', priority: 'medium' },
  { handle: 'Expansionmx', category: 'business', platform: 'twitter', priority: 'medium' },
  // Sports & World Cup
  { handle: 'ESPNDeportes', category: 'sports', platform: 'twitter', priority: 'high' },
  { handle: 'MiSeleccionMX', category: 'sports', platform: 'twitter', priority: 'high' },
  { handle: 'FIFAWorldCup', category: 'sports', platform: 'twitter', priority: 'high' },
  { handle: 'record_mexico', category: 'sports', platform: 'twitter', priority: 'medium' },
  // Culture & CDMX
  { handle: 'TimeOutMexico', category: 'culture', platform: 'twitter', priority: 'low' },
  { handle: 'ChilangoCom', category: 'culture', platform: 'twitter', priority: 'low' },
]

// ── INSTAGRAM ACCOUNTS ──
export const INSTAGRAM_ACCOUNTS: SocialSource[] = [
  // Prediction Markets
  { handle: 'polymarket', category: 'predictions', platform: 'instagram', priority: 'high' },
  { handle: 'polymarketsports', category: 'predictions', platform: 'instagram', priority: 'high' },
  // News
  { handle: 'latinus_us', category: 'politics', platform: 'instagram', priority: 'high' },
  { handle: 'rocanews', category: 'world', platform: 'instagram', priority: 'high' },
  // Sports
  { handle: 'miseleccionmx', category: 'sports', platform: 'instagram', priority: 'high' },
  { handle: 'ligamx', category: 'sports', platform: 'instagram', priority: 'medium' },
  { handle: 'fifaworldcup', category: 'sports', platform: 'instagram', priority: 'medium' },
  // Culture
  { handle: 'timeoutmexico', category: 'culture', platform: 'instagram', priority: 'low' },
  { handle: 'cdmxcapital', category: 'culture', platform: 'instagram', priority: 'low' },
]

// ── CATEGORY → MARKET TAG MAPPING ──
// Maps source categories to market tags for relevance matching
export const CATEGORY_TO_TAGS: Record<string, string[]> = {
  predictions: ['prediccion', 'mercado', 'apuestas', 'mundial', 'politica', 'economia'],
  sports: ['futbol', 'mundial', 'liga-mx', 'deportes', 'seleccion'],
  politics: ['politica', 'gobierno', 'elecciones', 'reforma', 'sheinbaum'],
  economy: ['economia', 'banxico', 'tasas', 'inflacion', 'peso'],
  business: ['negocios', 'tecnologia', 'startups', 'empresas'],
  finance: ['finanzas', 'banxico', 'tasas', 'mercados', 'peso'],
  culture: ['cdmx', 'cultura', 'eventos', 'turismo'],
  general: ['mexico', 'noticias', 'sociedad'],
  world: ['mundo', 'internacional', 'geopolitica', 'trump'],
  trending: ['viral', 'tendencia', 'redes', 'cultura', 'sociedad'],
  sustainability: ['ambiente', 'clima', 'sustentabilidad', 'contaminacion', 'energia'],
}

// ── SIGNAL INTERFACE (shared across all fetchers) ──
export interface Signal {
  source_type: 'rss' | 'twitter' | 'instagram'
  source_name: string
  category: string
  title: string
  text: string
  url?: string
  published_at: string
  engagement?: number
  raw?: unknown
}
