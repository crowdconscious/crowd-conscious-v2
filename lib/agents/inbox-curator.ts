/**
 * Inbox Curator — public submission triage.
 *
 * v2 (Apr 2026 re-prompting): outputs Action / Park / Archive per pending
 * `conscious_inbox` item with a one-sentence rationale. The admin dashboard
 * renders these inline so triage is one click ("Approve" → create market,
 * "Park" → leave pending, "Archive" → mark archived).
 *
 * Manual trigger only (Run Now). No cron — there's no fresh-submission
 * volume yet that justifies daily LLM spend.
 */
import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
} from '@/lib/agents/config'

const AGENT_NAME = 'inbox-curator'

type PendingItem = {
  id: string
  type: string
  title: string
  description: string | null
  category: string | null
  upvotes: number
  created_at: string
}

type TriageDecision = {
  /** matches conscious_inbox.id */
  id: string
  /** What the founder should do with this item this week. */
  action: 'respond_today' | 'park' | 'archive'
  /** One sentence in Spanish explaining the decision. */
  reason: string
  /** Optional: short Spanish title to use if action=respond_today and item should become a market. */
  suggested_market_title?: string
  /** Optional: name of an existing active market this overlaps with. */
  duplicates_existing?: string
}

export async function runInboxCurator(): Promise<{
  success: boolean
  error?: string
  skipped?: boolean
  summary?: {
    pending_count: number
    respond_today_count?: number
    park_count?: number
    archive_count?: number
  }
}> {
  const startTime = Date.now()

  try {
    const supabase = getSupabaseAdmin()

    const { data: pendingItems, error: pendingErr } = await supabase
      .from('conscious_inbox')
      .select('id, type, title, description, category, upvotes, created_at')
      .eq('status', 'pending')
      .is('archived_at', null)
      .order('upvotes', { ascending: false })
      .limit(40)

    if (pendingErr) {
      throw new Error(`Failed to fetch pending items: ${pendingErr.message}`)
    }

    const pending = (pendingItems ?? []) as PendingItem[]

    if (pending.length === 0) {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { count: submissionsLast7d } = await supabase
        .from('conscious_inbox')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff7d)

      await logAgentRun({
        agentName: AGENT_NAME,
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: {
          pending_count: 0,
          submissions_last_7d: submissionsLast7d ?? 0,
          reason:
            (submissionsLast7d ?? 0) === 0
              ? 'no_submissions_this_week'
              : 'no_pending_items',
        },
      })
      return { success: true, skipped: true, summary: { pending_count: 0 } }
    }

    let activeTitles: string[] = []
    const { data: activeMarkets, error: marketsErr } = await supabase
      .from('prediction_markets')
      .select('title')
      .in('status', ['active', 'trading'])
      .is('archived_at', null)
      .limit(80)
    if (!marketsErr) {
      activeTitles = (activeMarkets ?? []).map((m) => m.title)
    }

    const anthropic = getAnthropicClient()

    const systemMessage = `Eres el curador del Buzón Consciente de Crowd Conscious, una plataforma de opinión colectiva en CDMX. Tu trabajo es triar las propuestas pendientes del público y devolver una decisión clara por cada una. Sé práctico — la plataforma es operada por una sola persona y prioriza señal sobre volumen.

REGLAS DE DECISIÓN
- "respond_today" — el ítem es accionable ESTA SEMANA. Cumple TODOS estos criterios:
  * Encaja en una categoría real de la plataforma (Mundial 2026, gobierno CDMX, sustentabilidad, sociedad, tecnología, cultura).
  * Tiene >= 5 upvotes O fue creado en las últimas 72h Y representa un evento concreto con fecha.
  * NO duplica un mercado activo (lista provista abajo).
  * Si se vuelve mercado, la pregunta resuelve en 7-30 días con criterio verificable.

- "park" — interesante pero no urgente. Vale la pena revisarlo de nuevo en 1-2 semanas. Ejemplos: idea válida sin gancho noticioso, propuesta esperando datos, evento >30 días al futuro.

- "archive" — no procede. Ejemplos: duplica un mercado existente, está fuera de las categorías de la plataforma, es spam o muy ambiguo, o promueve a una persona/marca específica sin valor para la comunidad.

DEFAULT: cuando dudes, "park". No fuerces "respond_today" para inflar la lista.`

    const userMessage = `PROPUESTAS PENDIENTES (ordenadas por upvotes desc):
${JSON.stringify(pending, null, 2)}

MERCADOS ACTIVOS EN LA PLATAFORMA (evita duplicar):
${JSON.stringify(activeTitles, null, 2)}

Devuelve SÓLO un array JSON. Sin markdown, sin texto antes o después. Una entrada por cada propuesta pendiente:

[
  {
    "id": "<uuid del item exactamente como aparece arriba>",
    "action": "respond_today" | "park" | "archive",
    "reason": "Una oración en español, concreta, que explique por qué esta acción.",
    "suggested_market_title": "(sólo si action=respond_today y el ítem debería volverse mercado) Título de pregunta sí/no en español, ~12 palabras",
    "duplicates_existing": "(sólo si action=archive por duplicado) Título exacto del mercado activo que duplica"
  }
]

NO devuelvas más entradas que las propuestas reales (${pending.length}).
Ordena por urgencia descendente: respond_today primero, luego park, luego archive.`

    const response = await anthropic.messages.create({
      model: MODELS.FAST,
      max_tokens: TOKEN_LIMITS.DIGEST,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let decisions: TriageDecision[]
    try {
      const parsed = parseAgentJSON(rawText)
      decisions = (Array.isArray(parsed) ? parsed : [parsed]).map((d): TriageDecision => {
        const action = String((d as Record<string, unknown>).action ?? '').toLowerCase()
        return {
          id: String((d as Record<string, unknown>).id ?? ''),
          action:
            action === 'respond_today' || action === 'park' || action === 'archive'
              ? (action as TriageDecision['action'])
              : 'park',
          reason: String((d as Record<string, unknown>).reason ?? '').trim(),
          suggested_market_title: (d as Record<string, unknown>).suggested_market_title
            ? String((d as Record<string, unknown>).suggested_market_title).trim()
            : undefined,
          duplicates_existing: (d as Record<string, unknown>).duplicates_existing
            ? String((d as Record<string, unknown>).duplicates_existing).trim()
            : undefined,
        }
      }).filter((d) => d.id)
    } catch (e) {
      console.error('[Inbox Curator] JSON parse failed:', String(e).slice(0, 200))
      try {
        await supabase.from('agent_content').insert({
          market_id: null,
          agent_type: 'news_monitor',
          content_type: 'weekly_digest',
          title: 'Inbox Curator Triage (parse failed)',
          body: rawText.slice(0, 8000),
          language: 'es',
          metadata: {
            type: 'inbox_triage_v2',
            parse_error: String(e),
            pending_count: pending.length,
            model: MODELS.FAST,
            tokens_input: usage.input_tokens,
            tokens_output: usage.output_tokens,
          },
          published: false,
        })
      } catch {
        /* ignore */
      }
      await logAgentRun({
        agentName: AGENT_NAME,
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `JSON parse failed: ${String(e)}`,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        summary: { pending_count: pending.length, parse_failed: true },
      })
      return { success: false, error: 'parse_failed' }
    }

    const respondToday = decisions.filter((d) => d.action === 'respond_today').length
    const park = decisions.filter((d) => d.action === 'park').length
    const archive = decisions.filter((d) => d.action === 'archive').length

    // Persist with the new metadata.type so the admin dashboard can pick the
    // v2 renderer. We keep agent_type='news_monitor' / content_type='weekly_digest'
    // because the admin page already classifies those rows under "Inbox Digests"
    // (no schema migration needed for an op-level prompt change).
    try {
      const titleById = new Map(pending.map((p) => [p.id, p.title]))
      const enriched = decisions.map((d) => ({
        ...d,
        title: titleById.get(d.id) ?? '(unknown)',
      }))

      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'weekly_digest',
        title: 'Triage del Buzón Consciente',
        body: JSON.stringify(enriched),
        language: 'es',
        metadata: {
          type: 'inbox_triage_v2',
          pending_count: pending.length,
          respond_today_count: respondToday,
          park_count: park,
          archive_count: archive,
          model: MODELS.FAST,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
        },
        published: false,
      })
    } catch (e) {
      console.error('[Inbox Curator] Failed to save triage:', e)
    }

    await logAgentRun({
      agentName: AGENT_NAME,
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        pending_count: pending.length,
        respond_today_count: respondToday,
        park_count: park,
        archive_count: archive,
      },
    })

    return {
      success: true,
      summary: {
        pending_count: pending.length,
        respond_today_count: respondToday,
        park_count: park,
        archive_count: archive,
      },
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as {
      status?: number
      error?: { type?: string; error?: { message?: string }; message?: string }
      message?: string
    }
    console.error('[Inbox Curator] error:', err)

    try {
      await logAgentRun({
        agentName: AGENT_NAME,
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `API ${apiErr?.status ?? '?'}: ${apiErr?.error?.error?.message ?? apiErr?.error?.message ?? err.message}`,
      })
    } catch {
      /* ignore */
    }

    return { success: false, error: err.message }
  }
}
