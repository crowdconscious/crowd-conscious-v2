/**
 * Sponsor Pulse Report agent — per-Pulse executive report.
 *
 * Distinct from `lib/agents/sponsor-report.ts`, which is the legacy
 * monthly cross-market impact summary. This one runs once per Pulse on
 * resolution day and feeds the dashboard at
 *   /dashboard/sponsor/[token]/report/[marketId]
 * plus the PDF download.
 *
 * Inputs
 *  - marketId only (we self-fetch the market, votes, outcomes, sponsor
 *    metadata, and aggregates). The agent owns its own data shape so
 *    cron and admin "Run now" call sites stay tiny.
 *
 * Outputs (persisted to public.sponsor_pulse_reports keyed by market_id)
 *  - executive_summary  — ~150 words Spanish prose
 *  - conviction_analysis — divergence between vote share and weighted
 *    confidence (the actual insight sponsors pay for)
 *  - next_steps  — 3..5 specific, data-grounded actions
 *  - snapshot_data — frozen aggregates for historical rendering
 *
 * Idempotent: ON CONFLICT (market_id) DO UPDATE — running again replaces
 * the previous narrative.
 */

import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  parseAgentJSON,
} from '@/lib/agents/config'

const AGENT_NAME = 'sponsor-pulse-report'

export interface SponsorPulseReportSnapshot {
  totalVotes: number
  registeredVotes: number
  guestVotes: number
  avgConfidence: number | null
  /** Per-outcome aggregates, sorted by vote share desc. */
  outcomes: Array<{
    id: string
    label: string
    subtitle: string | null
    votes: number
    /** 0..1 share of total votes. */
    pct: number
    avgConfidence: number | null
  }>
  /** Daily participation (YYYY-MM-DD in es-MX). */
  votesByDay: Array<{ date: string; count: number }>
  /**
   * Anonymised reasoning quotes used by the dashboard's "Voter reasoning"
   * section AND surfaced to the LLM. Truncated to 280 chars to avoid
   * runaway prompts and to discourage long PII-bearing strings.
   */
  topReasonings: Array<{
    outcomeId: string
    outcomeLabel: string
    snippet: string
    confidence: number
    createdAt: string
  }>
}

export interface SponsorPulseReportRow {
  marketId: string
  sponsorAccountId: string | null
  executiveSummary: string
  convictionAnalysis: string
  nextSteps: string[]
  snapshot: SponsorPulseReportSnapshot
  model: string
  tokensIn: number
  tokensOut: number
}

export interface RunSponsorPulseReportResult {
  success: boolean
  status: 'success' | 'skipped' | 'error'
  reason?: string
  marketId: string
  reportId?: string | null
  tokens?: { input: number; output: number }
  error?: string
}

type MarketRow = {
  id: string
  title: string
  description_short: string | null
  description: string | null
  is_pulse: boolean | null
  status: string | null
  created_at: string
  resolution_date: string | null
  resolved_at: string | null
  sponsor_account_id: string | null
  sponsor_name: string | null
  pulse_client_email: string | null
  total_votes: number | null
  market_outcomes: Array<{
    id: string
    label: string
    subtitle: string | null
    sort_order: number | null
    vote_count: number | null
    total_confidence: number | null
  }>
}

type VoteRow = {
  id: string
  outcome_id: string
  confidence: number | null
  reasoning: string | null
  user_id: string | null
  anonymous_participant_id: string | null
  created_at: string
}

const MIN_VOTES_FOR_NARRATIVE = 5

/**
 * Strip obvious PII tokens (emails, phone-like sequences) from voter
 * reasoning before either showing them in the report or feeding them to
 * the LLM. We err on the side of caution; admins can manually unmask
 * via the sponsor_pulse_reports admin row if they need to.
 */
function anonymise(s: string): string {
  return s
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '[telefono]')
    .replace(/\s+/g, ' ')
    .trim()
}

function fmtDateMx(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function buildSnapshot(market: MarketRow, votes: VoteRow[]): SponsorPulseReportSnapshot {
  const totalVotes = votes.length
  const registeredVotes = votes.filter((v) => v.user_id).length
  const guestVotes = totalVotes - registeredVotes

  const confSum = votes.reduce((s, v) => s + (typeof v.confidence === 'number' ? v.confidence : 0), 0)
  const avgConfidence =
    totalVotes > 0 ? Math.round((confSum / totalVotes) * 10) / 10 : null

  const outcomeOrder = [...market.market_outcomes].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )
  const outcomes = outcomeOrder.map((o) => {
    const filtered = votes.filter((v) => v.outcome_id === o.id)
    const oVotes = filtered.length
    const oConfSum = filtered.reduce(
      (s, v) => s + (typeof v.confidence === 'number' ? v.confidence : 0),
      0
    )
    return {
      id: o.id,
      label: o.label,
      subtitle: o.subtitle ?? null,
      votes: oVotes,
      pct: totalVotes > 0 ? oVotes / totalVotes : 0,
      avgConfidence: oVotes > 0 ? Math.round((oConfSum / oVotes) * 10) / 10 : null,
    }
  })

  // Sort by vote share desc — driver of the headline ordering in both
  // dashboard and PDF. We don't sort by confidence here; the conviction
  // analysis section calls that out separately.
  outcomes.sort((a, b) => b.pct - a.pct)

  // Daily participation. Use es-MX date so the chart x-axis matches the
  // copy in the rest of the report.
  const dayMap = new Map<string, number>()
  for (const v of votes) {
    const d = fmtDateMx(v.created_at)
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
  }
  const votesByDay = Array.from(dayMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }))

  // Reasoning quotes — anonymised + capped per outcome (top by confidence,
  // then most recent). We pull a generous number for the LLM context and
  // the dashboard "all reasoning" section will show the full list.
  const reasoningRaw = votes.filter((v) => typeof v.reasoning === 'string' && v.reasoning.trim().length > 0)
  const reasoningPerOutcome = new Map<string, VoteRow[]>()
  for (const r of reasoningRaw) {
    const arr = reasoningPerOutcome.get(r.outcome_id) ?? []
    arr.push(r)
    reasoningPerOutcome.set(r.outcome_id, arr)
  }
  const topReasonings: SponsorPulseReportSnapshot['topReasonings'] = []
  for (const [outcomeId, arr] of reasoningPerOutcome.entries()) {
    arr.sort((a, b) => {
      const ac = a.confidence ?? 0
      const bc = b.confidence ?? 0
      if (bc !== ac) return bc - ac
      return a.created_at < b.created_at ? 1 : -1
    })
    const o = outcomes.find((x) => x.id === outcomeId)
    for (const r of arr.slice(0, 4)) {
      const txt = anonymise((r.reasoning ?? '').slice(0, 280))
      if (!txt) continue
      topReasonings.push({
        outcomeId,
        outcomeLabel: o?.label ?? '—',
        snippet: txt,
        confidence: r.confidence ?? 0,
        createdAt: r.created_at,
      })
    }
  }

  return {
    totalVotes,
    registeredVotes,
    guestVotes,
    avgConfidence,
    outcomes,
    votesByDay,
    topReasonings,
  }
}

function buildPrompt(market: MarketRow, snap: SponsorPulseReportSnapshot): string {
  const sponsorName =
    market.sponsor_name?.trim() ||
    'el patrocinador'

  const outcomeBlock = snap.outcomes
    .map((o, i) => {
      const pct = Math.round(o.pct * 100)
      const conf =
        typeof o.avgConfidence === 'number' ? `${o.avgConfidence.toFixed(1)}/10` : 'sin confianza registrada'
      const sub = o.subtitle ? ` — ${o.subtitle}` : ''
      return `${i + 1}. "${o.label}"${sub} · ${pct}% (${o.votes} votos) · confianza promedio ${conf}`
    })
    .join('\n')

  const reasoningBlock = snap.topReasonings.length
    ? snap.topReasonings
        .slice(0, 12)
        .map((r) => `- (${r.outcomeLabel}, conf ${r.confidence}/10) ${r.snippet}`)
        .join('\n')
    : '(no hubo razones escritas suficientes)'

  // Identify potential vote-vs-conviction divergence so the model has
  // a clear handle for the "conviction analysis" output.
  const sortedByVotes = [...snap.outcomes].sort((a, b) => b.pct - a.pct)
  const sortedByConf = [...snap.outcomes].sort(
    (a, b) => (b.avgConfidence ?? 0) - (a.avgConfidence ?? 0)
  )
  const voteWinner = sortedByVotes[0]
  const confWinner = sortedByConf[0]
  const divergence =
    voteWinner && confWinner && voteWinner.id !== confWinner.id
      ? `MARCAR: la opción más votada ("${voteWinner.label}") NO es la de mayor convicción ("${confWinner.label}", ${confWinner.avgConfidence?.toFixed(1)}/10 vs ${voteWinner.avgConfidence?.toFixed(1)}/10).`
      : 'Sin divergencia notable entre votos y convicción.'

  return `Eres un analista de inteligencia colectiva escribiendo un reporte ejecutivo para ${sponsorName} sobre una consulta participativa (Pulse) en Crowd Conscious.

CONTEXTO DEL PULSE
Título: ${market.title}
Descripción corta: ${market.description_short ?? '—'}
Estado: ${market.status ?? '—'} · Cierra: ${market.resolution_date ? fmtDateMx(market.resolution_date) : '—'}
Total de votos: ${snap.totalVotes} (${snap.registeredVotes} registrados · ${snap.guestVotes} invitados)
Confianza promedio: ${snap.avgConfidence != null ? `${snap.avgConfidence.toFixed(1)}/10` : '—'}

OPCIONES Y RESULTADOS
${outcomeBlock}

${divergence}

RAZONES ESCRITAS POR VOTANTES (anonimizadas)
${reasoningBlock}

TAREAS
Devuelve SÓLO un objeto JSON con esta forma exacta — nada más, sin texto fuera del JSON:

{
  "executiveSummary": "Ensayo en español de aproximadamente 150 palabras (3 oraciones de narrativa + 1 hallazgo contraintuitivo + 1 acción recomendada). Cita números reales del Pulse. Voz profesional, directa, sin marketing.",
  "convictionAnalysis": "Un párrafo que explique el balance entre cantidad de votos y nivel de convicción (confianza ponderada). Si hay divergencia entre la opción más votada y la de mayor convicción, hazlo explícito en lenguaje plano (no jerga). Si no hay divergencia, di que la mayoría votó con convicción consistente.",
  "nextSteps": ["Acción 1 ligada a un dato específico del Pulse", "Acción 2", "Acción 3", "Acción 4 (opcional)", "Acción 5 (opcional)"]
}

REGLAS
- Español profesional, claro, sin emojis.
- "executiveSummary" debe estar entre 120 y 180 palabras.
- "nextSteps" debe tener entre 3 y 5 elementos. Cada uno debe referirse a un dato del Pulse, no consejo genérico.
- No menciones marca/sponsor en imperativo ("ustedes deberían"). Habla del patrocinador en tercera persona si es necesario.
- No copies citas textuales de los votantes — parafraséalas si las usas.
`
}

export async function runSponsorPulseReport(
  marketId: string
): Promise<RunSponsorPulseReportResult> {
  const startTime = Date.now()
  const supabase = getSupabaseAdmin()

  try {
    const { data: marketRaw, error: mErr } = await supabase
      .from('prediction_markets')
      .select(
        `
        id, title, description_short, description, is_pulse, status,
        created_at, resolution_date, resolved_at,
        sponsor_account_id, sponsor_name, pulse_client_email, total_votes,
        market_outcomes(id, label, subtitle, sort_order, vote_count, total_confidence)
      `
      )
      .eq('id', marketId)
      .maybeSingle<MarketRow>()

    if (mErr || !marketRaw) {
      const reason = mErr?.message ?? 'market_not_found'
      await logAgentRun({
        agentName: AGENT_NAME,
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: reason,
      })
      return { success: false, status: 'error', marketId, error: reason }
    }
    const market: MarketRow = marketRaw

    const { data: votesRaw } = await supabase
      .from('market_votes')
      .select('id, outcome_id, confidence, reasoning, user_id, anonymous_participant_id, created_at')
      .eq('market_id', marketId)
      .order('created_at', { ascending: true })
    const votes: VoteRow[] = (votesRaw ?? []) as VoteRow[]

    if (votes.length < MIN_VOTES_FOR_NARRATIVE) {
      await logAgentRun({
        agentName: AGENT_NAME,
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { marketId, reason: 'insufficient_votes', count: votes.length },
      })
      return {
        success: true,
        status: 'skipped',
        reason: 'insufficient_votes',
        marketId,
      }
    }

    const snapshot = buildSnapshot(market, votes)
    const prompt = buildPrompt(market, snapshot)

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.SOCIAL_CONTENT,
      messages: [{ role: 'user', content: prompt }],
    })
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    const textBlock = response.content.find((b) => b.type === 'text')
    const text = textBlock && 'text' in textBlock ? textBlock.text : ''
    if (!text) {
      throw new Error('Empty agent response')
    }

    let parsed: { executiveSummary?: string; convictionAnalysis?: string; nextSteps?: string[] }
    try {
      const raw = parseAgentJSON(text)
      parsed = Array.isArray(raw) ? raw[0] : raw
    } catch (err) {
      console.error('[sponsor-pulse-report] JSON parse failed:', err)
      parsed = {}
    }

    const executiveSummary = (parsed.executiveSummary ?? '').trim()
    const convictionAnalysis = (parsed.convictionAnalysis ?? '').trim()
    const nextSteps = Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.map((s) => String(s).trim()).filter((s) => s.length > 0).slice(0, 5)
      : []

    if (!executiveSummary || !convictionAnalysis || nextSteps.length === 0) {
      throw new Error('Agent response missing required fields')
    }

    // Cost tracking: Sonnet rates per config.ts comments.
    const cost =
      usage.input_tokens * 0.000003 + usage.output_tokens * 0.000015

    const upsertPayload = {
      market_id: market.id,
      sponsor_account_id: market.sponsor_account_id,
      executive_summary: executiveSummary,
      conviction_analysis: convictionAnalysis,
      next_steps: nextSteps,
      snapshot_data: snapshot as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      model: MODELS.CREATIVE,
      tokens_in: usage.input_tokens,
      tokens_out: usage.output_tokens,
      cost,
    }

    const { data: saved, error: saveErr } = await supabase
      .from('sponsor_pulse_reports')
      .upsert(upsertPayload, { onConflict: 'market_id' })
      .select('id')
      .single()

    if (saveErr) {
      throw new Error(`save failed: ${saveErr.message}`)
    }

    await logAgentRun({
      agentName: AGENT_NAME,
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: {
        marketId,
        reportId: saved?.id ?? null,
        totalVotes: snapshot.totalVotes,
      },
    })

    return {
      success: true,
      status: 'success',
      marketId,
      reportId: saved?.id ?? null,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sponsor-pulse-report] error:', err)
    await logAgentRun({
      agentName: AGENT_NAME,
      status: 'error',
      durationMs: Date.now() - startTime,
      errorMessage: msg,
      summary: { marketId },
    })
    return { success: false, status: 'error', marketId, error: msg }
  }
}

/** Read the cached report (or null). Used by the dashboard view. */
export async function getSponsorPulseReport(marketId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('sponsor_pulse_reports')
    .select(
      'id, market_id, sponsor_account_id, executive_summary, conviction_analysis, next_steps, snapshot_data, generated_at, model, pdf_path, pdf_generated_at, email_sent_at'
    )
    .eq('market_id', marketId)
    .maybeSingle()
  if (error) {
    console.error('[sponsor-pulse-report] fetch failed:', error.message)
    return null
  }
  return data
}
