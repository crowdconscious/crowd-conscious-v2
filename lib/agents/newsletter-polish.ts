/**
 * Newsletter polish — optional Haiku pass for intro + subject line.
 *
 * Design: ADDITIVE only. The cron picks primary content (blog vs pulse) and
 * always has a deterministic subject. LLM output is discarded unless it passes
 * validation (subject + intro aligned with that primary story).
 */
import { getAnthropicClient, MODELS, parseAgentJSON } from '@/lib/agents/config'

export type NewsletterPrimaryFeature = 'blog' | 'pulse' | 'markets'

export interface NewsletterPolishInput {
  /** Cron-decided lead story — model must not override. */
  primaryFeature: NewsletterPrimaryFeature
  postTitle: string | null
  postExcerpt: string | null
  pulseTitle: string | null
  marketTitles: string[]
  daysUntilWorldCup?: number
}

export interface NewsletterPolishOutput {
  intro: string
  subject: string
  primary_feature: NewsletterPrimaryFeature
}

const BRAND_SUFFIX = ' | Crowd Conscious'

const AI_TROPE_PATTERNS = [
  /\bdato(s)?\s+curioso/i,
  /\bfun\s+facts?\b/i,
  /\b¿sab[ií]as\s+que\b/i,
  /\ben\s+esta\s+edici[oó]n\b/i,
  /\besta\s+semana\b/i,
  /\bno\s+te\s+pierdas\b/i,
  /\bprepárate\b/i,
  /\bdescubre\b/i,
  /\bte\s+contamos\b/i,
  /\bmás\s+allá\s+de\b/i,
]

const STOPWORDS_ES = new Set([
  'que',
  'para',
  'con',
  'los',
  'las',
  'del',
  'una',
  'uno',
  'como',
  'este',
  'esta',
  'estos',
  'estas',
  'pero',
  'por',
  'son',
  'sus',
  'hay',
  'más',
  'mas',
  'muy',
  'tan',
  'the',
  'and',
  'for',
  'with',
  'from',
  'what',
  'when',
  'where',
  'which',
  'crowd',
  'conscious',
  'cdmx',
])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeText(s: string): string {
  return stripAccents(s.toLowerCase().replace(/\s+/g, ' ').trim())
}

function significantTokens(text: string): string[] {
  const norm = normalizeText(text)
  return norm
    .split(/[^a-z0-9áéíóúñ]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !STOPWORDS_ES.has(w))
}

function tokenOverlapCount(a: string, b: string): number {
  const ta = new Set(significantTokens(a))
  const tb = significantTokens(b)
  let n = 0
  for (const t of tb) {
    if (ta.has(t)) n++
  }
  return n
}

function containsAiTropes(text: string): boolean {
  return AI_TROPE_PATTERNS.some((re) => re.test(text))
}

function formatPulseQuestion(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim()
  return t.endsWith('?') ? t : `${t}?`
}

export function buildDeterministicNewsletterSubject(opts: {
  primaryFeature: NewsletterPrimaryFeature
  postTitle: string | null
  pulseTitle: string | null
}): string {
  if (opts.primaryFeature === 'blog' && opts.postTitle?.trim()) {
    return `${opts.postTitle.replace(/\s+/g, ' ').trim().slice(0, 90)}${BRAND_SUFFIX}`
  }
  if (opts.primaryFeature === 'pulse' && opts.pulseTitle?.trim()) {
    const q = formatPulseQuestion(opts.pulseTitle)
    return `${q.slice(0, 90)}${BRAND_SUFFIX}`
  }
  return `Lo que CDMX piensa esta semana${BRAND_SUFFIX}`
}

function subjectAlignsWithPrimary(
  subject: string,
  primary: NewsletterPrimaryFeature,
  postTitle: string | null,
  pulseTitle: string | null
): boolean {
  const sub = normalizeText(subject.replace(/\|/g, ' '))
  if (primary === 'blog' && postTitle?.trim()) {
    const overlap = tokenOverlapCount(sub, postTitle)
    if (overlap >= 2) return true
    const titleNorm = normalizeText(postTitle)
    const titlePrefix = titleNorm.slice(0, Math.min(24, titleNorm.length))
    if (titleNorm.length >= 12 && sub.includes(titlePrefix)) {
      return true
    }
    return false
  }
  if (primary === 'pulse' && pulseTitle?.trim()) {
    return tokenOverlapCount(sub, pulseTitle) >= 2
  }
  if (primary === 'markets') {
    return (
      sub.includes('cdmx') ||
      sub.includes('piensa') ||
      sub.includes('mercado') ||
      sub.includes('voto')
    )
  }
  return false
}

function introAlignsWithPrimary(
  intro: string,
  primary: NewsletterPrimaryFeature,
  postTitle: string | null,
  pulseTitle: string | null
): boolean {
  if (primary === 'blog' && postTitle?.trim()) {
    return tokenOverlapCount(intro, postTitle) >= 1
  }
  if (primary === 'pulse' && pulseTitle?.trim()) {
    return tokenOverlapCount(intro, pulseTitle) >= 1
  }
  return intro.trim().length >= 20
}

export function validateNewsletterPolish(
  output: NewsletterPolishOutput,
  input: NewsletterPolishInput
): boolean {
  if (output.primary_feature !== input.primaryFeature) return false
  const subject = output.subject.trim()
  const intro = output.intro.trim()
  if (subject.length < 12 || subject.length > 110) return false
  if (intro.length < 20 || intro.length > 320) return false
  if (subject.includes('|')) return false
  if (containsAiTropes(subject) || containsAiTropes(intro)) return false
  if (/^est(a|e)\s+(semana|edici)/i.test(intro)) return false
  if (!subjectAlignsWithPrimary(subject, input.primaryFeature, input.postTitle, input.pulseTitle)) {
    return false
  }
  if (!introAlignsWithPrimary(intro, input.primaryFeature, input.postTitle, input.pulseTitle)) {
    return false
  }
  if (input.primaryFeature === 'blog' && input.pulseTitle?.trim()) {
    const pulseHeavy = tokenOverlapCount(intro, input.pulseTitle) >= 2
    const blogLight = input.postTitle ? tokenOverlapCount(intro, input.postTitle) < 1 : true
    if (pulseHeavy && blogLight) return false
  }
  return true
}

export function resolveNewsletterSubject(opts: {
  primaryFeature: NewsletterPrimaryFeature
  postTitle: string | null
  pulseTitle: string | null
  polishSubject: string | null
  polishValid: boolean
}): string {
  if (opts.polishValid && opts.polishSubject?.trim()) {
    const s = opts.polishSubject.trim().slice(0, 90)
    return s.includes('Crowd Conscious') ? s.slice(0, 110) : `${s}${BRAND_SUFFIX}`
  }
  return buildDeterministicNewsletterSubject({
    primaryFeature: opts.primaryFeature,
    postTitle: opts.postTitle,
    pulseTitle: opts.pulseTitle,
  })
}

const SYSTEM = `Eres el editor de la newsletter de Crowd Conscious (CDMX): opinión colectiva, Pulses y blog. Escribes en español mexicano, tono de revista digital — directo, curioso, humano. Nunca suenas a chatbot corporativo ni a "dato curioso".

Recibirás qué historia es la PORTADA de esta edición (primary_feature). El asunto y el intro SOLO pueden vender esa portada. El correo incluirá otras secciones (Pulse, mercados, lugares), pero el lector no debe creer que el asunto habla de otra cosa.

Responde ÚNICAMENTE con un objeto JSON (sin markdown, sin texto extra):

{
  "primary_feature": "blog" | "pulse" | "markets",
  "subject": "<asunto 35-65 caracteres, español, sin emoji, sin | ni pipes, sin marca Crowd Conscious>",
  "intro": "<1-2 oraciones, máx ~35 palabras, que inviten a leer la portada. No listes secciones. No digas newsletter/edición/esta semana.>"
}

REGLAS DURAS
- Copia primary_feature del mensaje del usuario; no lo cambies.
- Si primary_feature es "blog": el subject debe ser una variante breve del título del post (misma historia, mismas ideas clave). No mezcles otro tema (otro Pulse, otro artículo).
- Si primary_feature es "pulse": el subject debe girar en torno a esa pregunta del Pulse (puede acortar, no inventar otro tema).
- Si primary_feature es "markets": asunto sobre opinión / votos en CDMX, sin inventar un artículo concreto.
- Prohibido: metáforas forzadas, "¿sabías que…", "fun facts", "en esta edición", clickbait vacío, inglés innecesario.
- intro: una sola idea, la de la portada.`

export async function generateNewsletterIntroAndSubject(
  input: NewsletterPolishInput
): Promise<NewsletterPolishOutput | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }
  try {
    const anthropic = getAnthropicClient()
    const portada =
      input.primaryFeature === 'blog'
        ? `Artículo portada: ${input.postTitle ?? '(ninguno)'}`
        : input.primaryFeature === 'pulse'
          ? `Pulse portada: ${input.pulseTitle ?? '(ninguno)'}`
          : 'Portada: edición de mercados / opinión CDMX (sin artículo nuevo)'

    const userMessage = `primary_feature (OBLIGATORIO, no cambiar): ${input.primaryFeature}
${portada}
Extracto del artículo (solo contexto): ${input.postExcerpt?.slice(0, 280) ?? '(ninguno)'}
Pulse en el correo (secundario, NO usar en subject si portada es blog): ${input.pulseTitle ?? '(ninguno)'}
Mercados en el correo (secundario): ${input.marketTitles.slice(0, 3).join(' · ') || '(ninguno)'}
Días hasta Mundial 2026: ${input.daysUntilWorldCup ?? '—'}

Escribe subject + intro solo para la portada indicada. JSON únicamente.`

    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: 500,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })
    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    if (!rawText) return null
    const raw = parseAgentJSON(rawText)
    const candidate = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>
    const primaryRaw = String(candidate.primary_feature ?? '').trim()
    const primary: NewsletterPrimaryFeature =
      primaryRaw === 'blog' || primaryRaw === 'pulse' || primaryRaw === 'markets'
        ? primaryRaw
        : input.primaryFeature
    const intro = String(candidate.intro ?? '').trim()
    const subject = String(candidate.subject ?? '').trim()
    if (!intro && !subject) return null
    return { intro, subject, primary_feature: primary }
  } catch (e) {
    console.warn('[newsletter-polish] failed:', e)
    return null
  }
}
