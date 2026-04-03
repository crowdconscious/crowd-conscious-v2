/**
 * Content Creator: reader-first blog drafts (Spanish primary).
 * Saves to `blog_posts` (draft) and `agent_content`.
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
import {
  emptyPlatformIntelligence,
  formatBlogWriterPlatformContext,
  getPlatformIntelligence,
} from '@/lib/agents/intelligence-bridge'

const ALLOWED_CATEGORIES = new Set([
  'pulse_analysis',
  'market_story',
  'world_cup',
  'behind_data',
  'insight',
])

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

type MarketRow = {
  id: string
  title: string
  total_votes: number | null
  current_probability: number | null
  category: string | null
  is_pulse: boolean | null
}

async function buildContentCreatorDataBrief(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  todayFormatted: string
): Promise<{ text: string; marketList: MarketRow[] }> {
  const wcOpening = new Date('2026-06-11T12:00:00Z')
  const daysUntil = Math.ceil((wcOpening.getTime() - Date.now()) / 86400000)

  const since24h = new Date(Date.now() - 86400000).toISOString()

  const [{ data: markets }, { count: vote24h }] = await Promise.all([
    supabase
      .from('prediction_markets')
      .select('id, title, total_votes, current_probability, category, is_pulse')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .order('total_votes', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from('market_votes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
  ])

  const marketList = (markets ?? []) as MarketRow[]
  const mids = marketList.map((m) => m.id)

  const outcomesByMarket = new Map<string, Array<{ label: string; probability: number }>>()
  if (mids.length > 0) {
    const { data: orows } = await supabase
      .from('market_outcomes')
      .select('market_id, label, probability')
      .in('market_id', mids)
    for (const row of orows ?? []) {
      const mid = row.market_id as string
      const list = outcomesByMarket.get(mid) ?? []
      list.push({
        label: String(row.label ?? '').trim() || '—',
        probability: Number(row.probability) ?? 0,
      })
      outcomesByMarket.set(mid, list)
    }
    for (const [id, list] of outcomesByMarket) {
      list.sort((a, b) => b.probability - a.probability)
      outcomesByMarket.set(id, list)
    }
  }

  const pulseIds = marketList.filter((m) => m.is_pulse).map((m) => m.id)
  let pulseBlock = ''
  if (pulseIds.length > 0) {
    const { data: pvotes } = await supabase
      .from('market_votes')
      .select('confidence, outcome_id')
      .in('market_id', pulseIds)
      .limit(2500)
    const { data: poutcomes } = await supabase
      .from('market_outcomes')
      .select('id, label')
      .in('market_id', pulseIds)
    const oidToLabel = new Map((poutcomes ?? []).map((o) => [o.id as string, String(o.label ?? '')]))
    const byLabel: Record<string, number[]> = {}
    for (const v of pvotes ?? []) {
      const full = oidToLabel.get(v.outcome_id as string) ?? ''
      const lab = full.split(' / ')[0]?.trim() || full || '—'
      if (!byLabel[lab]) byLabel[lab] = []
      byLabel[lab].push(Number(v.confidence))
    }
    pulseBlock = Object.entries(byLabel)
      .map(([lab, confs]) => {
        const avg = confs.reduce((a, b) => a + b, 0) / confs.length
        return `- ${lab}: ${confs.length} opiniones, confianza media ${avg.toFixed(1)}/10`
      })
      .join('\n')
  }

  const marketLines = marketList.map((m) => {
    const outs = outcomesByMarket.get(m.id) ?? []
    const top = outs[0]
    const p = top?.probability ?? 0
    const pct = p > 0 && p <= 1 ? Math.round(p * 100) : Math.round(Math.min(100, p))
    return `- "${m.title}" [ID: ${m.id}] — ${m.total_votes ?? 0} votos; opción líder: ${top?.label ?? '—'} (~${pct}%)`
  })

  let text = `FECHA: ${todayFormatted}\nDÍAS HASTA INICIO MUNDIAL 2026 (referencia ~11 jun 2026): ${daysUntil}\n`
  text += `ACTIVIDAD AGREGADA (últimas 24h): ${vote24h ?? 'N/A'} votos en plataforma (sin nombres).\n\n`
  text += `MERCADOS CON MÁS PARTICIPACIÓN — elige related_market_id SOLO de estos IDs:\n${marketLines.join('\n')}\n`
  if (pulseBlock) {
    text += `\nPULSE — CONFIANZA POR OPCIÓN (solo mercados pulse):\n${pulseBlock}\n`
  }
  text += `\nURL base para el cierre del artículo: ${APP_BASE}\n`

  return { text, marketList }
}

const CONTENT_CREATOR_SYSTEM = `You are the blog writer for Crowd Conscious, a collective intelligence platform in Mexico City. Posts publish at crowdconscious.app/blog.

AUDIENCE: Everyday people in CDMX and Mexico who care about the city, World Cup 2026, and social issues. They are NOT prediction-market traders or developers.

GOAL: One post that:
1) Opens with a HOOK (stop scrolling)
2) Tells a STORY, not a dashboard recap
3) Connects to one or more LIVE markets from the data brief (usually 1–3; use more only when the story naturally ties them together)
4) Ends with the CLOSING CTA block below (same structure in Spanish AND English)
5) "content" = full article in Spanish; "content_en" = full article in English (not a summary — full parallel post)

STRUCTURE:
- Title: provocative question or surprise (~12 words) in both languages
- Opening: hook — local fact, question, or CDMX reference anyone recognizes
- Body: 3–4 sections with ## headings only (no ###). Short paragraphs (2–4 sentences), separated by blank lines
- Close: the mandatory CTA section below (append to BOTH content and content_en)
- Length: ~400–600 words in Spanish body (before the CTA); similar length in English

PRIORITY TOPICS (pick one angle — avoid repeating the same market/category as in RECENT POSTS below):
1) News Monitor context — tie to live market(s) that are NOT Pulse if Pulse was covered recently
2) A non-Pulse market with meaningful probability or participation shift — what it means for the city
3) Active Pulse only if Pulse was not the focus of the last 1–2 posts
4) Else: short educational piece on collective intelligence (Galton-style) tied to market(s) from the brief

TONE (CRITICAL):
- Smart friend over coffee, not a CEO briefing
- CDMX neighborhoods, Metro, Reforma, daily life when it fits
- NO corporate or marketing jargon
- NO leaderboard names, NO usernames, NO XP, NO agent/error counts, NO "registered user totals" as the headline
- NO bullet lists in the main body — prose only (numbered lists OK only inside the closing CTA if needed; prefer separate markdown links per line)
- Spanish body: use Spanish outcome labels where relevant; English body: natural English

FORMATTING (content and content_en):
- Valid markdown: ## for H2, **bold** sparingly
- Blank line between paragraphs
- No ### headings in the main article

CLOSING CTA — copy this structure (adapt wording; keep markdown link pattern). Append AFTER the main body to BOTH "content" (Spanish) and "content_en" (English).

Spanish (content), example shape:
---
**¿Y tú qué opinas?**

[One short paragraph — 1–2 sentences framing the open questions; no bare URLs.]

Tu opinión importa. Vota con tu nivel de certeza en nuestros mercados:

[→ Exact link text for market 1](BASE_URL/predictions/markets/UUID_1)
[→ Pulse: Exact link text if Pulse](BASE_URL/predictions/markets/UUID_pulse)

English (content_en), same layout:
---
**What do you think?**

[One short paragraph in English.]

Your opinion matters. Vote with your level of confidence in our markets:

[→ English link text for market 1](BASE_URL/predictions/markets/UUID_1)
[→ Pulse: English link text if Pulse](BASE_URL/predictions/markets/UUID_pulse)

RULES FOR LINKS:
- BASE_URL is given in the data brief (e.g. https://crowdconscious.app). Use it exactly; every market line MUST be a markdown link [label](url).
- Do NOT paste raw URLs as plain text. Do NOT use bare "https://..." without markdown.
- For Pulse markets, prefix the link text with "Pulse: " (Spanish) or "Pulse: " (English).
- One market per line; each line is its own markdown link starting with → inside the brackets.
- List every market you cite in "related_market_ids" (array of UUIDs, max 5, order matches reading order). Also set "related_market_id" to the primary (first) market UUID for compatibility.

OUTPUT: Respond with ONLY valid JSON (no markdown code fences, no preamble):
{
  "title": "Spanish title",
  "title_en": "English title",
  "slug": "url-friendly-slug-spanish",
  "excerpt": "Two-sentence Spanish teaser",
  "excerpt_en": "English teaser",
  "content": "Full Spanish markdown including closing CTA",
  "content_en": "Full English markdown including closing CTA (complete translation)",
  "category": "pulse_analysis | market_story | world_cup | insight | behind_data",
  "tags": ["tag1", "tag2", "tag3"],
  "meta_description": "Spanish SEO, max 155 chars",
  "related_market_id": "primary UUID from the market list",
  "related_market_ids": ["uuid1", "uuid2"]
}`

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

export async function runContentCreator(): Promise<{
  success: boolean
  error?: string
  blog_post_id?: string
  tokens?: { input: number; output: number }
}> {
  const startTime = Date.now()

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()
    const today = mexicoCityNow()
    const todayFormatted = formatDateMX(today)

    let platformIntel = emptyPlatformIntelligence()
    try {
      platformIntel = await getPlatformIntelligence()
    } catch (e) {
      console.warn('[Content Creator] getPlatformIntelligence failed:', e)
    }
    const platformLiveBlock = formatBlogWriterPlatformContext(platformIntel)

    const { data: newsRows } = await supabase
      .from('agent_content')
      .select('body, content_type, created_at, metadata')
      .eq('agent_type', 'news_monitor')
      .order('created_at', { ascending: false })
      .limit(24)

    const structuredRow = (newsRows ?? []).find(
      (r) => (r.metadata as { type?: string } | null)?.type === 'structured_news_brief'
    )
    const newsRow = structuredRow ?? (newsRows ?? [])[0]

    let newsContext = 'No hay señales recientes del monitor de noticias en esta corrida.'
    if (newsRow?.body) {
      const b = newsRow.body
      const raw = typeof b === 'string' ? b : JSON.stringify(b)
      newsContext = raw.slice(0, 2000)
    }

    const { text: dataBrief, marketList } = await buildContentCreatorDataBrief(supabase, todayFormatted)

    const { data: recentBlogRows } = await supabase
      .from('blog_posts')
      .select('title, related_market_ids, category, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    const recentTitles = (recentBlogRows ?? []).map((r) => String(r.title ?? '').trim()).filter(Boolean)
    const recentMarketIds = new Set(
      (recentBlogRows ?? []).flatMap((r) =>
        Array.isArray(r.related_market_ids) ? (r.related_market_ids as string[]) : []
      )
    )
    const recentCategories = (recentBlogRows ?? []).map((r) => String(r.category ?? '')).filter(Boolean)
    const uncovered = marketList.filter((m) => !recentMarketIds.has(m.id))
    const diversityBlock = `IMPORTANTE — VARIEDAD DE CONTENIDO:
Últimos títulos en el blog: ${recentTitles.length ? recentTitles.join(' | ') : '(ninguno aún)'}
Categorías recientes: ${recentCategories.length ? recentCategories.join(', ') : '—'}
Mercados ya enlazados recientemente (evitar repetir): ${recentMarketIds.size ? [...recentMarketIds].join(', ') : 'ninguno'}

NO repitas el mismo ángulo ni el mismo mercado salvo que haya una noticia nueva decisiva. Prioriza mercados aún no cubiertos en esa lista:
${uncovered.length ? uncovered.map((m) => `- "${m.title}" [ID: ${m.id}] — ${m.total_votes ?? 0} votos · ${m.category}`).join('\n') : '(toma un ángulo distinto usando el contexto de noticias de hoy)'}
`

    const userMessage = `Escribe el artículo usando esta información.

${diversityBlock}

${dataBrief}

CONTEXTO DE NOTICIAS (News Monitor — úsalo si encaja con un mercado activo):
${newsContext}

${platformLiveBlock}

Responde con un solo objeto JSON exactamente como en tus instrucciones de sistema.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.BLOG,
      system: CONTENT_CREATOR_SYSTEM,
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
      console.error('[Content Creator] JSON parse failed:', parseErr)
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title: 'Blog draft (parse failed)',
        body: rawText.slice(0, 120000),
        language: 'es',
        metadata: { parse_error: String(parseErr), model: MODELS.CREATIVE },
        published: false,
      })
      await logAgentRun({
        agentName: 'content-creator',
        status: 'success',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { parse_failed: true },
      })
      return {
        success: true,
        tokens: { input: usage.input_tokens, output: usage.output_tokens },
      }
    }

    const title = String(blogObj.title ?? 'Sin título').trim()
    const excerpt = String(blogObj.excerpt ?? '').trim()
    const content = String(blogObj.content ?? '').trim()
    const titleEn = String(blogObj.title_en ?? '').trim()
    const excerptEn = String(blogObj.excerpt_en ?? '').trim()
    const contentEn = String(blogObj.content_en ?? '').trim()
    if (!content || !excerpt) {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'missing_content_or_excerpt' },
      })
      return { success: false, error: 'missing_content_or_excerpt' }
    }
    if (!titleEn || !excerptEn || !contentEn) {
      await logAgentRun({
        agentName: 'content-creator',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'missing_english_fields' },
      })
      return { success: false, error: 'missing_english_fields' }
    }

    const slugBase = slugify(String(blogObj.slug ?? title))
    const slug = await uniqueSlug(supabase, slugBase)

    let category = String(blogObj.category ?? 'insight').trim()
    if (!ALLOWED_CATEGORIES.has(category)) category = 'insight'

    const tags = Array.isArray(blogObj.tags) ? (blogObj.tags as unknown[]).map((t) => String(t)) : []

    const allowedMarketIds = new Set(marketList.map((m) => m.id))
    const rawSingle =
      typeof blogObj.related_market_id === 'string' ? blogObj.related_market_id.trim() : ''
    const fromArray = Array.isArray(blogObj.related_market_ids)
      ? (blogObj.related_market_ids as unknown[])
          .map((x) => String(x).trim())
          .filter((id) => allowedMarketIds.has(id))
      : []
    const relatedIds: string[] = []
    if (rawSingle && allowedMarketIds.has(rawSingle)) relatedIds.push(rawSingle)
    for (const id of fromArray) {
      if (!relatedIds.includes(id)) relatedIds.push(id)
    }
    const relatedTitles = Array.isArray(blogObj.related_market_titles)
      ? (blogObj.related_market_titles as unknown[]).map((t) => String(t).trim()).filter(Boolean)
      : []
    const titleToId = new Map(marketList.map((m) => [m.title.trim().toLowerCase(), m.id]))
    if (relatedIds.length === 0) {
      for (const rt of relatedTitles) {
        const id = titleToId.get(rt.toLowerCase())
        if (id) relatedIds.push(id)
      }
      for (const m of marketList) {
        if (relatedIds.length >= 5) break
        const fuzzy = relatedTitles.some(
          (rt) =>
            m.title.toLowerCase().includes(rt.toLowerCase()) ||
            rt.toLowerCase().includes(m.title.toLowerCase().slice(0, 20))
        )
        if (fuzzy && !relatedIds.includes(m.id)) relatedIds.push(m.id)
      }
    }
    const finalRelated = [...new Set(relatedIds)].slice(0, 5)

    const metaDesc = String(blogObj.meta_description ?? excerpt).slice(0, 160)

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
        category: category as
          | 'insight'
          | 'pulse_analysis'
          | 'market_story'
          | 'world_cup'
          | 'behind_data',
        tags,
        meta_title: title,
        meta_description: metaDesc,
        related_market_ids: finalRelated,
        generated_by: 'content-creator',
        status: 'draft',
      })
      .select('id')
      .single()

    if (insErr || !inserted) {
      console.error('[Content Creator] blog_posts insert', insErr)
      return { success: false, error: insErr?.message ?? 'blog_insert_failed' }
    }

    const blogId = inserted.id as string

    const { data: agentRow, error: agentErr } = await supabase
      .from('agent_content')
      .insert({
        market_id: finalRelated[0] ?? null,
        agent_type: 'content_creator',
        content_type: 'blog_post',
        title,
        body: JSON.stringify({
          blog_post_id: blogId,
          slug,
        }),
        language: 'es',
        metadata: {
          blog_post_id: blogId,
          slug,
          category,
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
      .select('id')
      .single()

    if (agentErr) {
      console.error('[Content Creator] agent_content insert', agentErr)
    } else if (agentRow?.id) {
      await supabase.from('blog_posts').update({ agent_content_id: agentRow.id }).eq('id', blogId)
    }

    await logAgentRun({
      agentName: 'content-creator',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: { blog_post_id: blogId, slug },
    })

    return {
      success: true,
      blog_post_id: blogId,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('Content creator agent error:', err)
    await logAgentRun({
      agentName: 'content-creator',
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: err.message,
    })
    return { success: false, error: err.message }
  }
}
