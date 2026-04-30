/**
 * Content Creator v4 + Case Study Draft.
 *
 * - runContentPackageV4({ topic?, marketId?, source? }):
 *   Manual-only. Single Sonnet 4.5 call producing the full Crowd Conscious v4
 *   content package: ES + EN blog, IG carousel, IG reel script, 5 social
 *   variants, optional Pulse market proposal. Persists as agent_content
 *   (metadata.package_v4) and also drops the ES blog as a draft blog_post.
 *
 * - runCaseStudyDraft(marketId): Triggered by pulse-auto-resolve cron when a
 *   Pulse with ≥10 votes ends. Drafts a sales-focused case study blog post.
 */
import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
  formatDateMX,
  mexicoCityNow,
} from '@/lib/agents/config'
import { loadMarketVoteReasoningsWithAuthors } from '@/lib/market-vote-reasonings'
import { DEFAULT_PULSE_EMBED_COMPONENTS } from '@/lib/pulse-embed-constants'

const ALLOWED_CATEGORIES = new Set([
  'pulse_analysis',
  'market_story',
  'world_cup',
  'behind_data',
  'insight',
])

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
  return s || 'post'
}

async function uniqueSlug(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  base: string
): Promise<string> {
  let candidate = base
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from('blog_posts').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT PACKAGE v4 — runContentPackageV4({ topic?, marketId?, source? })
// ─────────────────────────────────────────────────────────────────────────────
//
// One Sonnet 4.5 call. The model gets:
//   - The seed topic (free-text or derived from a marketId)
//   - A short list of related/active markets (for in-text linking)
//   - The brand voice + structural rules from the v4 template
// And returns ONE JSON package with all deliverables. We persist to
// agent_content with metadata.package_v4 so the admin UI can render every
// piece, and we also drop the ES blog into blog_posts as a draft so existing
// blog admin tooling continues to work.

type V4Input = {
  topic?: string
  marketId?: string
  source?: string
}

type ActiveMarketSnippet = {
  id: string
  title: string
  description_short: string | null
  is_pulse: boolean
  total_votes: number
  category: string | null
  status: string | null
  resolution_date: string | null
}

const V4_SYSTEM = `Eres el writer principal de CROWD CONSCIOUS — una plataforma colectiva de inteligencia en CDMX (mercados de predicción + Pulse: encuestas ponderadas por confianza). Publicas en crowdconscious.app/blog y en redes (@crowdconscious).

OBJETIVO: producir UN paquete de contenido completo y publicable en bilingüe (ES primario / EN paralelo) listo para usar SIN reescritura. Cada pieza tiene que poder copiarse y publicarse.

AUDIENCIA:
- Audiencia consumidora (ES): Personas en CDMX/Mexico que quieren entender qué pasa en su ciudad, World Cup 2026, sociedad. NO traders, NO devs.
- Audiencia B2B (EN/ES, sólo para market_proposal): marcas, agencias, planners.

VOZ:
- Smart friend over coffee. Curiosa, directa, sin jerga corporativa.
- Sin "leverage", "synergy", "engagement", "stakeholders". Sin emojis salvo en social media.
- En ES: tuteo, expresiones CDMX cuando aplique (Reforma, Metro, colonias, chilango si fluye natural).
- En EN: natural, no traducción literal. Mantén el insight, no la sintaxis.

ESTRUCTURA OBLIGATORIA — el JSON de salida tiene EXACTAMENTE estos campos. Cualquier campo faltante hace que se descarte:

{
  "topic_summary": "1-2 frases en español describiendo el ángulo elegido y por qué importa AHORA",
  "hook_score": 1-10,
  "hook_score_reason": "1 frase justificando el score (¿pararía el scroll en LinkedIn/IG?)",

  "blog_es": {
    "title": "Pregunta o sorpresa, ~10-14 palabras",
    "slug": "slug-amigable-en-espanol",
    "excerpt": "2 frases que vendan el clic (max 220 caracteres)",
    "meta_description": "SEO ES, max 155 caracteres",
    "category": "pulse_analysis | market_story | world_cup | behind_data | insight",
    "tags": ["3-5 tags en español, kebab-case"],
    "content": "Markdown completo: gancho → 3-4 secciones con ## (NO ###) → cierre con CTA. 800-1200 palabras. Párrafos cortos (2-4 frases). Sin bullet lists en el cuerpo (solo en el CTA). Termina SIEMPRE con el bloque CTA descrito abajo."
  },

  "blog_en": {
    "title": "English version, parallel — not literal translation",
    "slug": "english-friendly-slug",
    "excerpt": "2 sentences",
    "meta_description": "SEO EN, max 155 chars",
    "content": "Same structure as blog_es. Full parallel translation, similar length (800-1200 words). Same closing CTA structure but in English."
  },

  "carousel_ig": {
    "slides_es": [
      { "n": 1, "headline": "Hook 4-7 palabras", "body": "1-2 frases. Max 80 caracteres en body." },
      "...8-10 slides total..."
    ],
    "slides_en": [
      "...8-10 slides paralelas en inglés, mismo número y orden que slides_es..."
    ],
    "cta_slide_es": "Texto del último slide CTA en español (1 frase + 'Vota en crowdconscious.app/pulse')",
    "cta_slide_en": "English CTA last slide",
    "design_notes": "1-2 frases sobre paleta/estilo (ej. 'fondos sólidos contraste alto, 1 dato grande por slide')"
  },

  "reel_ig": {
    "duration_seconds": 15-45,
    "hook_es": "Primera línea hablada, 2-3 segundos. DEBE parar scroll.",
    "script_es": [
      { "t_start": 0, "t_end": 3, "voice": "Texto hablado", "on_screen": "Texto en pantalla (caps, max 5 palabras)" },
      "...5-8 beats hasta cumplir duration_seconds..."
    ],
    "cta_es": "1 frase final que mande a votar/leer",
    "caption_es": "Caption del reel ES, 2-3 frases + 5-7 hashtags relevantes",
    "caption_en": "English caption (lite — para audiencias bilingües)"
  },

  "social_posts": [
    {
      "platform": "twitter|threads|linkedin|instagram_post",
      "lang": "es|en",
      "text": "Post listo para publicar. Respeta límites: twitter 280, threads 500, linkedin 1300, instagram 2200.",
      "hashtags": ["..."]
    },
    "...5 posts en total cubriendo MÍNIMO 2 idiomas y 2 plataformas..."
  ],

  "pulse_market_proposal": {
    "should_create": true | false,
    "reasoning": "1-2 frases — ¿este tópico tiene una pregunta verificable, time-bound, donde la confianza ponderada cambiaría la lectura?",
    "proposal": {
      "title": "Pregunta del Pulse, max 120 caracteres, terminando con ?",
      "description_short": "1 frase explicando qué se está midiendo",
      "outcomes": [
        { "label_es": "Opción 1", "label_en": "Option 1" },
        "...3-5 opciones..."
      ],
      "resolution_window_days": 7-30,
      "sponsor_pitch": "1 párrafo (2-3 frases) explicándole a una marca por qué este Pulse es valioso comprar como insight de mercado."
    }
  },

  "image_prompts": {
    "blog_cover": "Prompt en inglés para Midjourney/DALL-E. Estilo editorial, sin texto en imagen, fotorealista o ilustración minimal. Incluye paleta y mood.",
    "carousel_template": "Prompt para template base de carrusel (estilo, paleta, tipografía sugerida)",
    "social_image": "Prompt para imagen cuadrada de twitter/linkedin"
  },

  "self_score": 1-10,
  "self_score_reason": "Honesto. ¿Lo publicarías sin editar? <7 = se descarta automáticamente."
}

REGLAS DURAS (no negociables):
1. ENLACES en blog_es/blog_en: cada referencia a un mercado de la lista DEBE ser markdown link [texto](BASE_URL/predictions/markets/UUID) o [texto](BASE_URL/pulse/UUID) si is_pulse=true. NUNCA URLs en plano. BASE_URL te lo paso en el contexto.
2. Si el contexto incluye un mercado activo relevante, ENLAZA. Si no hay mercado claramente relacionado, NO inventes uno — deja el blog sin link de mercado pero con el CTA general.
3. CTA cierre del blog (ES y EN): "**¿Y tú qué opinas?** [1 frase] / **What do you think?** [1 sentence]" + 1-3 markdown links a mercados/Pulses concretos del contexto.
4. Pulse market proposal: should_create=true SOLO si el tópico naturalmente plantea una pregunta verificable con fecha de resolución clara. Si no, should_create=false y omite el resto del proposal.
5. social_posts: mínimo 5 ítems. DEBES incluir al menos 1 post en español Y al menos 1 en inglés. Cada plataforma respeta su límite de caracteres EXACTO.
6. Sin nombres reales de usuarios, sin XP, sin leaderboards, sin "ya somos N usuarios".
7. self_score < 7 → la pipeline lo descarta. Sé honesto.

OUTPUT: SOLO el objeto JSON. Sin code fences, sin texto antes o después.`

async function buildV4ContextBlock(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  input: V4Input
): Promise<{ contextText: string; markets: ActiveMarketSnippet[]; seedTopic: string; primaryMarketId: string | null }> {
  const today = mexicoCityNow()
  const todayFormatted = formatDateMX(today)

  let primaryMarket: ActiveMarketSnippet | null = null
  if (input.marketId) {
    const { data: m } = await supabase
      .from('prediction_markets')
      .select('id, title, description_short, is_pulse, total_votes, category, status, resolution_date')
      .eq('id', input.marketId)
      .maybeSingle()
    if (m) {
      primaryMarket = {
        id: m.id as string,
        title: String(m.title ?? '').trim(),
        description_short: m.description_short ? String(m.description_short) : null,
        is_pulse: Boolean(m.is_pulse),
        total_votes: Number(m.total_votes ?? 0),
        category: m.category ? String(m.category) : null,
        status: m.status ? String(m.status) : null,
        resolution_date: m.resolution_date ? String(m.resolution_date) : null,
      }
    }
  }

  const { data: activeRows } = await supabase
    .from('prediction_markets')
    .select('id, title, description_short, is_pulse, total_votes, category, status, resolution_date')
    .in('status', ['active', 'trading'])
    .is('archived_at', null)
    .order('total_votes', { ascending: false, nullsFirst: false })
    .limit(8)

  const active: ActiveMarketSnippet[] = (activeRows ?? []).map((m) => ({
    id: m.id as string,
    title: String(m.title ?? '').trim(),
    description_short: m.description_short ? String(m.description_short) : null,
    is_pulse: Boolean(m.is_pulse),
    total_votes: Number(m.total_votes ?? 0),
    category: m.category ? String(m.category) : null,
    status: m.status ? String(m.status) : null,
    resolution_date: m.resolution_date ? String(m.resolution_date) : null,
  }))

  const allMarkets: ActiveMarketSnippet[] = []
  if (primaryMarket) allMarkets.push(primaryMarket)
  for (const m of active) {
    if (!allMarkets.find((x) => x.id === m.id)) allMarkets.push(m)
  }

  const seedTopic =
    (input.topic && input.topic.trim()) ||
    (primaryMarket
      ? `Pulse activo: "${primaryMarket.title}" — ${primaryMarket.total_votes} votos. ¿Qué revela esta pregunta sobre la ciudad/Mundial 2026 ahora mismo?`
      : '')

  if (!seedTopic) {
    return { contextText: '', markets: allMarkets, seedTopic: '', primaryMarketId: input.marketId ?? null }
  }

  const marketLines = allMarkets.map((m) => {
    const linkPath = m.is_pulse ? `/pulse/${m.id}` : `/predictions/markets/${m.id}`
    const tag = m.is_pulse ? 'PULSE' : 'MARKET'
    const desc = m.description_short ? ` — ${m.description_short}` : ''
    return `- [${tag}] "${m.title}" (id: ${m.id}, votos: ${m.total_votes})${desc}\n    URL: ${APP_BASE}${linkPath}`
  })

  const contextText = `FECHA: ${todayFormatted}
BASE_URL: ${APP_BASE}

TÓPICO SEMILLA${input.source ? ` (origen: ${input.source})` : ''}:
${seedTopic}

${primaryMarket ? `MERCADO PRIMARIO (úsalo como ancla narrativa si encaja con el tópico):\n- "${primaryMarket.title}" (id: ${primaryMarket.id}, ${primaryMarket.is_pulse ? 'PULSE' : 'MARKET'}, ${primaryMarket.total_votes} votos)${primaryMarket.description_short ? `\n  ${primaryMarket.description_short}` : ''}\n` : ''}
MERCADOS ACTIVOS (úsalos para enlazar SOLO si encajan con el tópico — no fuerces):
${marketLines.length ? marketLines.join('\n') : '(no hay mercados activos en este momento)'}

RECORDATORIO: BASE_URL es ${APP_BASE}. Cada link a mercado en el blog debe ser markdown link a esa URL exacta. No inventes IDs.`

  return { contextText, markets: allMarkets, seedTopic, primaryMarketId: primaryMarket?.id ?? input.marketId ?? null }
}

export type V4PackageResult = {
  success: boolean
  error?: string
  agent_content_id?: string
  blog_post_id?: string
  package?: Record<string, unknown>
  tokens?: { input: number; output: number }
}

export async function runContentPackageV4(input: V4Input = {}): Promise<V4PackageResult> {
  const startTime = Date.now()

  if (!input.topic && !input.marketId) {
    await logAgentRun({
      agentName: 'content-creator',
      status: 'skipped',
      durationMs: Date.now() - startTime,
      summary: { reason: 'missing_topic_or_marketId' },
    })
    return {
      success: false,
      error: 'Provide either { topic } or { marketId } to run Content Creator v4.',
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const anthropic = getAnthropicClient()

    const { contextText, markets, seedTopic, primaryMarketId } = await buildV4ContextBlock(
      supabase,
      input
    )

    if (!seedTopic) {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'could_not_resolve_topic', input },
      })
      return { success: false, error: 'Could not resolve topic from input.' }
    }

    const userMessage = `Genera el paquete de contenido v4 completo para este tópico.

${contextText}

Devuelve EXCLUSIVAMENTE el objeto JSON descrito en tus instrucciones de sistema, con TODOS los campos requeridos. No agregues comentarios ni texto fuera del JSON.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.PACKAGE_V4,
      system: V4_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let pkg: Record<string, unknown>
    try {
      const parsed = parseAgentJSON(rawText)
      pkg = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>
    } catch (parseErr) {
      console.error('[Content v4] JSON parse failed:', parseErr)
      const { data: failedRow } = await supabase
        .from('agent_content')
        .insert({
          market_id: primaryMarketId,
          agent_type: 'content_creator',
          content_type: 'blog_post',
          title: `Content v4 (parse failed) — ${seedTopic.slice(0, 80)}`,
          body: rawText.slice(0, 120000),
          language: 'es',
          metadata: {
            type: 'package_v4_parse_failed',
            parse_error: String(parseErr),
            model: MODELS.CREATIVE,
            input,
            seed_topic: seedTopic,
          },
          published: false,
        })
        .select('id')
        .single()
      await logAgentRun({
        agentName: 'content-creator',
        status: 'error',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        errorMessage: 'parse_failed',
      })
      return { success: false, error: 'parse_failed', agent_content_id: failedRow?.id as string | undefined }
    }

    const blogEs = (pkg.blog_es ?? {}) as Record<string, unknown>
    const blogEn = (pkg.blog_en ?? {}) as Record<string, unknown>

    const titleEs = String(blogEs.title ?? '').trim()
    const contentEs = String(blogEs.content ?? '').trim()
    const excerptEs = String(blogEs.excerpt ?? '').trim()
    const titleEn = String(blogEn.title ?? '').trim()
    const contentEn = String(blogEn.content ?? '').trim()
    const excerptEn = String(blogEn.excerpt ?? '').trim()

    if (!titleEs || !contentEs || !excerptEs || !titleEn || !contentEn || !excerptEn) {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { reason: 'missing_blog_fields', input },
      })
      return { success: false, error: 'missing_blog_fields' }
    }

    const selfScoreRaw = pkg.self_score
    const selfScore =
      typeof selfScoreRaw === 'number'
        ? selfScoreRaw
        : typeof selfScoreRaw === 'string'
          ? Number(selfScoreRaw)
          : NaN

    if (Number.isFinite(selfScore) && selfScore < 7) {
      // Save the package so the admin can still inspect it, but don't create a draft blog post.
      const { data: lowRow } = await supabase
        .from('agent_content')
        .insert({
          market_id: primaryMarketId,
          agent_type: 'content_creator',
          content_type: 'blog_post',
          title: `[low-score ${selfScore}] ${titleEs}`,
          body: JSON.stringify({ seed_topic: seedTopic, low_score: selfScore }),
          language: 'es',
          metadata: {
            type: 'package_v4',
            package_v4: pkg,
            self_score: selfScore,
            self_score_reason: pkg.self_score_reason ?? '',
            seed_topic: seedTopic,
            input,
            model: MODELS.CREATIVE,
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            quality_gate: 'below_threshold',
          },
          published: false,
        })
        .select('id')
        .single()

      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { reason: 'quality_below_threshold', self_score: selfScore, title: titleEs },
      })
      return {
        success: true,
        agent_content_id: lowRow?.id as string | undefined,
        package: pkg,
        tokens: { input: usage.input_tokens, output: usage.output_tokens },
      }
    }

    const slugBase = slugify(String(blogEs.slug ?? titleEs))
    const slug = await uniqueSlug(supabase, slugBase)

    let category = String(blogEs.category ?? 'insight').trim()
    if (!ALLOWED_CATEGORIES.has(category)) category = 'insight'

    const tags = Array.isArray(blogEs.tags)
      ? (blogEs.tags as unknown[]).map((t) => String(t)).slice(0, 8)
      : []

    const allowedMarketIds = new Set(markets.map((m) => m.id))
    const relatedIds: string[] = []
    if (primaryMarketId && allowedMarketIds.has(primaryMarketId)) {
      relatedIds.push(primaryMarketId)
    }
    // Scrape any UUIDs the model linked into the ES content as related markets.
    const uuidMatches = contentEs.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []
    for (const id of uuidMatches) {
      const lowerId = id.toLowerCase()
      if (allowedMarketIds.has(lowerId) && !relatedIds.includes(lowerId)) {
        relatedIds.push(lowerId)
      }
    }
    const finalRelated = relatedIds.slice(0, 5)

    const metaDesc = String(blogEs.meta_description ?? excerptEs).slice(0, 160)

    const { data: inserted, error: insErr } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title: titleEs,
        title_en: titleEn,
        excerpt: excerptEs,
        excerpt_en: excerptEn,
        content: contentEs,
        content_en: contentEn,
        category: category as
          | 'insight'
          | 'pulse_analysis'
          | 'market_story'
          | 'world_cup'
          | 'behind_data',
        tags,
        meta_title: titleEs,
        meta_description: metaDesc,
        related_market_ids: finalRelated,
        generated_by: 'content-creator-v4',
        status: 'draft',
      })
      .select('id')
      .single()

    if (insErr || !inserted) {
      console.error('[Content v4] blog_posts insert', insErr)
      // Even if blog insert fails, save the package to agent_content so it isn't lost.
      const { data: fallback } = await supabase
        .from('agent_content')
        .insert({
          market_id: primaryMarketId,
          agent_type: 'content_creator',
          content_type: 'blog_post',
          title: titleEs,
          body: JSON.stringify({ seed_topic: seedTopic, blog_insert_error: insErr?.message ?? 'unknown' }),
          language: 'es',
          metadata: {
            type: 'package_v4',
            package_v4: pkg,
            self_score: selfScore,
            seed_topic: seedTopic,
            input,
            model: MODELS.CREATIVE,
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
            blog_insert_error: insErr?.message ?? 'unknown',
          },
          published: false,
        })
        .select('id')
        .single()
      return {
        success: false,
        error: insErr?.message ?? 'blog_insert_failed',
        agent_content_id: fallback?.id as string | undefined,
        package: pkg,
      }
    }

    const blogId = inserted.id as string

    const { data: agentRow, error: agentErr } = await supabase
      .from('agent_content')
      .insert({
        market_id: primaryMarketId,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title: titleEs,
        body: JSON.stringify({ blog_post_id: blogId, slug }),
        language: 'es',
        metadata: {
          type: 'package_v4',
          package_v4: pkg,
          blog_post_id: blogId,
          slug,
          category,
          self_score: selfScore,
          self_score_reason: pkg.self_score_reason ?? '',
          hook_score: pkg.hook_score ?? null,
          seed_topic: seedTopic,
          input,
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
      .select('id')
      .single()

    if (agentErr) {
      console.error('[Content v4] agent_content insert', agentErr)
    } else if (agentRow?.id) {
      await supabase.from('blog_posts').update({ agent_content_id: agentRow.id }).eq('id', blogId)
    }

    await logAgentRun({
      agentName: 'content-creator',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        version: 'v4',
        blog_post_id: blogId,
        agent_content_id: agentRow?.id ?? null,
        slug,
        self_score: selfScore,
        seed_topic: seedTopic.slice(0, 200),
        source: input.source ?? null,
      },
    })

    return {
      success: true,
      blog_post_id: blogId,
      agent_content_id: agentRow?.id as string | undefined,
      package: pkg,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Content creator v4 error:', err)
    await logAgentRun({
      agentName: 'content-creator',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: err.message,
    })
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE STUDY DRAFT — runCaseStudyDraft(marketId)
// ─────────────────────────────────────────────────────────────────────────────
//
// Triggered by the pulse-auto-resolve cron whenever a Pulse just ended with
// ≥10 votes. Drafts a long-form blog post in `blog_posts` (status='draft')
// using the resolved market's outcome distribution, confidence stats, and a
// few real voter reasonings. Founder publishes manually after a quick edit.

const CASE_STUDY_MIN_VOTES = 10
const CASE_STUDY_MAX_QUOTES = 3

const CASE_STUDY_SYSTEM = `You are turning a closed Crowd Conscious Pulse into a publishable case study for crowdconscious.app/blog.

AUDIENCE: marketing leads, agency planners, brand managers in Mexico evaluating Conscious Pulse as a research product. They want concrete numbers and one memorable insight, not a hype piece.

GOAL: a single blog post that doubles as a sales asset:
1) Title (ES + EN) of the form "Lo que [N] personas revelaron sobre [topic]" (use the actual N).
2) Hook (lede): 2 sentences tying the result to a current event in CDMX/Mexico/World Cup if any signal in the brief supports it.
3) "Los números" section: total votes, average confidence, outcome distribution as % share, anonymous vs registered split, and the time window the Pulse ran.
4) "El insight" section: explain what confidence-weighted data revealed that a flat poll would have missed. One concrete example.
5) "La voz de los participantes" section: surface 1–3 direct quotes from the supplied reasonings. Quote them verbatim, attribute by first name only or "Invitado" if anonymous.
6) "El método" section: 3 sentences explaining what a Conscious Pulse is — confidence-weighted poll, outcome distribution, no engagement bait.
7) Closing CTA in BOTH content and content_en, structured exactly as below. Do NOT invent additional markets.

CTA structure (Spanish then English versions inside content / content_en):

ES:
**¿Quieres este nivel de insight para tu marca?**

[1 sentence on what the next Pulse could measure for them.]

[→ Pulse: Ver resultados completos](BASE_URL/pulse/PULSE_ID)
[→ Lanzar mi propio Pulse](BASE_URL/para-marcas#pulse-mundial-pack)

EN:
**Want this level of insight for your brand?**

[1 sentence English equivalent.]

[→ Pulse: See full results](BASE_URL/pulse/PULSE_ID)
[→ Launch my own Pulse](BASE_URL/para-marcas#pulse-mundial-pack)

LENGTH: ~500–700 words in Spanish body before the CTA. English a parallel translation, similar length.

FORMAT: valid markdown. ## for section headings, **bold** sparingly. Blank line between paragraphs. No ### inside the article.

RULES:
- Use the BASE_URL from the brief exactly. Use the PULSE_ID from the brief exactly. Every market reference is a markdown link.
- Quotes go inside Markdown blockquotes (lines starting with "> "). Never invent quotes; if no reasonings were supplied, drop section 5 silently.
- Use the exact integer counts and percentages supplied. Do not round more than 1 decimal place.
- No leaderboard names, no XP, no "registered users count" headlines.
- self_score 1–10. Anything <7 is dropped automatically.

OUTPUT: respond with ONLY valid JSON (no markdown code fences, no preamble):
{
  "title": "Spanish title",
  "title_en": "English title",
  "slug": "url-friendly-slug-spanish",
  "excerpt": "Two-sentence Spanish teaser",
  "excerpt_en": "English teaser",
  "content": "Full Spanish markdown including closing CTA",
  "content_en": "Full English markdown including closing CTA",
  "tags": ["case-study", "pulse", "..."],
  "meta_description": "Spanish SEO, max 155 chars",
  "self_score": 8,
  "self_score_reason": "One sentence explaining the score"
}`

type ResolvedPulseBrief = {
  marketId: string
  title: string
  description: string | null
  resolutionDateISO: string | null
  totalVotes: number
  registeredCount: number
  anonymousCount: number
  avgConfidence: number
  outcomeRows: Array<{
    label: string
    votes: number
    pct: number
    avgConfidence: number
  }>
  timelineStartISO: string | null
  timelineEndISO: string | null
  reasonings: Array<{ text: string; author: string; confidence: number }>
}

async function buildCaseStudyBrief(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  marketId: string
): Promise<ResolvedPulseBrief | { error: string }> {
  const { data: market, error: mErr } = await supabase
    .from('prediction_markets')
    .select('id, title, description, resolution_date, is_pulse, status, total_votes')
    .eq('id', marketId)
    .single()

  if (mErr || !market) {
    return { error: mErr?.message || 'market_not_found' }
  }

  const [{ data: outcomes }, { data: votes }, reasonings] = await Promise.all([
    supabase
      .from('market_outcomes')
      .select('id, label')
      .eq('market_id', marketId),
    supabase
      .from('market_votes')
      .select('outcome_id, confidence, user_id, anonymous_participant_id, created_at')
      .eq('market_id', marketId),
    loadMarketVoteReasoningsWithAuthors(supabase, marketId, 'es'),
  ])

  const voteRows = votes ?? []
  const totalVotes = voteRows.length
  if (totalVotes < CASE_STUDY_MIN_VOTES) {
    return { error: `vote_floor_not_met (${totalVotes}/${CASE_STUDY_MIN_VOTES})` }
  }

  const registeredCount = voteRows.filter((v) => v.user_id).length
  const anonymousCount = totalVotes - registeredCount

  const avgConfidence =
    voteRows.reduce(
      (sum, v) => sum + (typeof v.confidence === 'number' ? v.confidence : 0),
      0
    ) / Math.max(1, totalVotes)

  const outcomeMap = new Map<string, { label: string; votes: number; confSum: number }>()
  for (const o of outcomes ?? []) {
    outcomeMap.set(o.id as string, {
      label: String(o.label ?? '').trim() || '—',
      votes: 0,
      confSum: 0,
    })
  }
  for (const v of voteRows) {
    const oid = v.outcome_id as string
    const row = outcomeMap.get(oid)
    if (row) {
      row.votes += 1
      row.confSum += typeof v.confidence === 'number' ? v.confidence : 0
    }
  }
  const outcomeRows = [...outcomeMap.values()]
    .map((r) => ({
      label: r.label,
      votes: r.votes,
      pct: totalVotes > 0 ? (r.votes / totalVotes) * 100 : 0,
      avgConfidence: r.votes > 0 ? r.confSum / r.votes : 0,
    }))
    .sort((a, b) => b.votes - a.votes)

  const timestamps = voteRows
    .map((v) => v.created_at)
    .filter((t): t is string => typeof t === 'string')
    .sort()
  const timelineStartISO = timestamps[0] ?? null
  const timelineEndISO = timestamps[timestamps.length - 1] ?? null

  const topReasonings = reasonings.slice(0, CASE_STUDY_MAX_QUOTES).map((r) => ({
    text: r.reasoning,
    author: (r.author_name || 'Invitado').split(' ')[0],
    confidence: r.confidence,
  }))

  return {
    marketId: market.id,
    title: String(market.title ?? '').trim() || 'Pulse',
    description: market.description ? String(market.description) : null,
    resolutionDateISO:
      typeof market.resolution_date === 'string' ? market.resolution_date : null,
    totalVotes,
    registeredCount,
    anonymousCount,
    avgConfidence,
    outcomeRows,
    timelineStartISO,
    timelineEndISO,
    reasonings: topReasonings,
  }
}

function formatCaseStudyBriefForPrompt(brief: ResolvedPulseBrief): string {
  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  const distribution = brief.outcomeRows
    .map(
      (r) =>
        `- ${r.label}: ${r.votes} votos (${r.pct.toFixed(1)}%) · confianza media ${r.avgConfidence.toFixed(1)}/10`
    )
    .join('\n')

  const quotes = brief.reasonings.length
    ? brief.reasonings
        .map(
          (q) =>
            `- "${q.text.replace(/"/g, '\\"')}" — ${q.author} (confianza ${q.confidence}/10)`
        )
        .join('\n')
    : '(no hay razonamientos suficientes — omite la sección de voces)'

  return `PULSE_ID: ${brief.marketId}
TITLE: ${brief.title}
DESCRIPTION: ${brief.description ?? '—'}
RESOLUTION_DATE: ${fmtDate(brief.resolutionDateISO)}
WINDOW: ${fmtDate(brief.timelineStartISO)} → ${fmtDate(brief.timelineEndISO)}

NÚMEROS:
- Total votos: ${brief.totalVotes}
- Confianza promedio: ${brief.avgConfidence.toFixed(2)}/10
- Registrados: ${brief.registeredCount} (${((brief.registeredCount / brief.totalVotes) * 100).toFixed(1)}%)
- Anónimos: ${brief.anonymousCount} (${((brief.anonymousCount / brief.totalVotes) * 100).toFixed(1)}%)

DISTRIBUCIÓN DE OPCIONES (orden por votos):
${distribution}

VOCES (úsalas como blockquotes, máximo ${CASE_STUDY_MAX_QUOTES}):
${quotes}

URL base para todos los enlaces: ${APP_BASE}`
}

export async function runCaseStudyDraft(marketId: string): Promise<{
  success: boolean
  error?: string
  blog_post_id?: string
  tokens?: { input: number; output: number }
  skipped?: boolean
}> {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('pulse_market_id', marketId)
      .eq('generated_by', 'case-study-draft')
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      await logAgentRun({
        agentName: 'case-study-draft',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'already_drafted', blog_post_id: existing.id, marketId },
      })
      return { success: true, skipped: true, blog_post_id: existing.id as string }
    }

    const brief = await buildCaseStudyBrief(supabase, marketId)
    if ('error' in brief) {
      await logAgentRun({
        agentName: 'case-study-draft',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: brief.error, marketId },
      })
      return { success: true, skipped: true, error: brief.error }
    }

    const anthropic = getAnthropicClient()
    const briefText = formatCaseStudyBriefForPrompt(brief)
    const userMessage = `Escribe el caso de estudio siguiendo tus instrucciones de sistema. Usa SOLO los datos de este brief.\n\n${briefText}\n\nResponde con un solo objeto JSON exactamente como te indiqué, incluyendo self_score.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.BLOG,
      system: CASE_STUDY_SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let blogObj: Record<string, unknown>
    try {
      const parsed = parseAgentJSON(rawText)
      blogObj = (Array.isArray(parsed) ? parsed[0] : parsed) as Record<string, unknown>
    } catch (parseErr) {
      console.error('[Case Study Draft] JSON parse failed:', parseErr)
      await supabase.from('agent_content').insert({
        market_id: brief.marketId,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title: `Case study draft (parse failed) — ${brief.title}`,
        body: rawText.slice(0, 120000),
        language: 'es',
        metadata: {
          parse_error: String(parseErr),
          model: MODELS.CREATIVE,
          variant: 'case_study_draft',
          pulse_market_id: brief.marketId,
        },
        published: false,
      })
      await logAgentRun({
        agentName: 'case-study-draft',
        status: 'error',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        errorMessage: 'parse_failed',
      })
      return { success: false, error: 'parse_failed' }
    }

    const title = String(blogObj.title ?? '').trim()
    const titleEn = String(blogObj.title_en ?? '').trim()
    const excerpt = String(blogObj.excerpt ?? '').trim()
    const excerptEn = String(blogObj.excerpt_en ?? '').trim()
    const content = String(blogObj.content ?? '').trim()
    const contentEn = String(blogObj.content_en ?? '').trim()

    if (!title || !content || !excerpt || !titleEn || !excerptEn || !contentEn) {
      await logAgentRun({
        agentName: 'case-study-draft',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'missing_required_fields', marketId },
      })
      return { success: false, error: 'missing_required_fields' }
    }

    const selfScoreRaw = blogObj.self_score
    const selfScore =
      typeof selfScoreRaw === 'number'
        ? selfScoreRaw
        : typeof selfScoreRaw === 'string'
          ? Number(selfScoreRaw)
          : NaN
    if (Number.isFinite(selfScore) && selfScore < 7) {
      await logAgentRun({
        agentName: 'case-study-draft',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: {
          reason: 'quality_below_threshold',
          self_score: selfScore,
          marketId,
        },
      })
      return {
        success: true,
        skipped: true,
        tokens: { input: usage.input_tokens, output: usage.output_tokens },
      }
    }

    const slugBase = slugify(String(blogObj.slug ?? title))
    const slug = await uniqueSlug(supabase, slugBase)

    const tags = Array.isArray(blogObj.tags)
      ? (blogObj.tags as unknown[]).map((t) => String(t)).slice(0, 8)
      : ['case-study', 'pulse']
    if (!tags.includes('case-study')) tags.unshift('case-study')

    const metaDesc = String(blogObj.meta_description ?? excerpt).slice(0, 160)

    const coverImageUrl = `${APP_BASE}/api/og/blog/${slug}`

    const { data: inserted, error: insErr } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title,
        title_en: titleEn,
        excerpt,
        excerpt_en: excerptEn,
        content,
        content_en: contentEn,
        category: 'pulse_analysis',
        tags,
        meta_title: title,
        meta_description: metaDesc,
        related_market_ids: [brief.marketId],
        pulse_market_id: brief.marketId,
        pulse_embed_position: 'before_cta',
        pulse_embed_components: [...DEFAULT_PULSE_EMBED_COMPONENTS],
        cover_image_url: coverImageUrl,
        generated_by: 'case-study-draft',
        status: 'draft',
      })
      .select('id')
      .single()

    if (insErr || !inserted) {
      console.error('[Case Study Draft] blog_posts insert', insErr)
      return { success: false, error: insErr?.message ?? 'blog_insert_failed' }
    }

    const blogId = inserted.id as string

    const { data: agentRow, error: agentErr } = await supabase
      .from('agent_content')
      .insert({
        market_id: brief.marketId,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title,
        body: JSON.stringify({
          blog_post_id: blogId,
          slug,
          variant: 'case_study_draft',
          pulse_market_id: brief.marketId,
        }),
        language: 'es',
        metadata: {
          blog_post_id: blogId,
          slug,
          variant: 'case_study_draft',
          pulse_market_id: brief.marketId,
          total_votes: brief.totalVotes,
          avg_confidence: Number(brief.avgConfidence.toFixed(2)),
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
      .select('id')
      .single()

    if (agentErr) {
      console.error('[Case Study Draft] agent_content insert', agentErr)
    } else if (agentRow?.id) {
      await supabase
        .from('blog_posts')
        .update({ agent_content_id: agentRow.id })
        .eq('id', blogId)
    }

    await logAgentRun({
      agentName: 'case-study-draft',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        blog_post_id: blogId,
        slug,
        market_id: brief.marketId,
        total_votes: brief.totalVotes,
      },
    })

    return {
      success: true,
      blog_post_id: blogId,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Case study draft error:', err)
    await logAgentRun({
      agentName: 'case-study-draft',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: err.message,
    })
    return { success: false, error: err.message }
  }
}
