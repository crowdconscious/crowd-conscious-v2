import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  formatDateMX,
  mexicoCityNow,
} from '@/lib/agents/config'
import { sendEmail } from '@/lib/resend'
import { CONSCIOUS_FUND_PERCENT } from '@/lib/fund-allocation'

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

export async function runCeoDigest(): Promise<{
  success: boolean
  error?: string
  tokens?: { input: number; output: number }
  cost_estimate?: string
}> {
  const startTime = Date.now()

  try {
    const anthropic = getAnthropicClient()
    const supabase = getSupabaseAdmin()
    const today = mexicoCityNow()
    const todayFormatted = formatDateMX(today)

    const metrics: Record<string, unknown> = {}

    // a. USER METRICS — profiles count (fast). Avoid loading entire market_votes into memory.
    try {
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      metrics.total_registered_users = profileCount ?? 0
    } catch (e) {
      console.warn('[CEO Digest] profiles user count failed:', e)
      metrics.total_registered_users = 0
    }

    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: votes24h } = await supabase
        .from('market_votes')
        .select('user_id')
        .gte('created_at', cutoff24h)
      const distinctUsers = new Set((votes24h ?? []).map((v) => v.user_id))
      metrics.users_with_predictions_last_24h = distinctUsers.size
    } catch (e) {
      metrics.users_with_predictions_last_24h = 'error'
    }

    // b. PREDICTION ACTIVITY (market_votes = free-to-play)
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: votes24h } = await supabase
        .from('market_votes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', cutoff24h)
      metrics.predictions_last_24h = votes24h ?? 0
    } catch (e) {
      metrics.predictions_last_24h = 'error'
    }

    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: byMarket } = await supabase
        .from('market_votes')
        .select('market_id')
        .gte('created_at', cutoff24h)
      const counts: Record<string, number> = {}
      for (const row of byMarket ?? []) {
        const mid = row.market_id
        counts[mid] = (counts[mid] ?? 0) + 1
      }
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      const marketIds = sorted.map(([id]) => id)
      let titleMap: Record<string, string> = {}
      if (marketIds.length > 0) {
        const { data: markets } = await supabase
          .from('prediction_markets')
          .select('id, title')
          .in('id', marketIds)
        for (const m of markets ?? []) {
          titleMap[m.id] = m.title
        }
      }
      metrics.top_markets_last_24h = sorted.map(([id, count]) => ({
        market_id: id,
        title: titleMap[id] ?? id,
        count,
      }))
    } catch (e) {
      metrics.top_markets_last_24h = 'error'
    }

    try {
      const { count: total } = await supabase
        .from('market_votes')
        .select('id', { count: 'exact', head: true })
      metrics.total_predictions_all_time = total ?? 0
    } catch (e) {
      metrics.total_predictions_all_time = 'error'
    }

    // c. MARKET HEALTH
    try {
      const { count: active } = await supabase
        .from('prediction_markets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trading'])
      metrics.total_active_markets = active ?? 0
    } catch (e) {
      metrics.total_active_markets = 'error'
    }

    try {
      const now = new Date()
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { data: approaching } = await supabase
        .from('prediction_markets')
        .select('id, title, resolution_date')
        .in('status', ['active', 'trading'])
        .gte('resolution_date', now.toISOString())
        .lte('resolution_date', in7.toISOString())
      metrics.markets_approaching_resolution_7d = (approaching ?? []).length
      metrics.markets_approaching_list = (approaching ?? []).map((m) => ({
        title: m.title,
        resolution_date: m.resolution_date,
      }))
    } catch (e) {
      metrics.markets_approaching_resolution_7d = 'error'
    }

    try {
      const { count: zeroPred } = await supabase
        .from('prediction_markets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trading'])
        .or('total_votes.is.null,total_votes.eq.0')
      metrics.markets_with_zero_predictions = zeroPred ?? 0
    } catch (e) {
      metrics.markets_with_zero_predictions = 'error'
    }

    // d. CONSCIOUS FUND (conscious_fund, sponsor columns may not exist)
    try {
      let legacyBalance = 0
      const { data: fund, error: fundErr } = await supabase
        .from('conscious_fund')
        .select('total_collected, total_disbursed')
        .limit(1)
        .single()
      if (!fundErr && fund) {
        legacyBalance = Math.max(
          0,
          Number(fund.total_collected ?? 0) - Number(fund.total_disbursed ?? 0)
        )
      }
      let totalFromSponsors = 0
      const { data: sponsorMarkets, error: sponsorErr } = await supabase
        .from('prediction_markets')
        .select('sponsor_contribution')
        .not('sponsor_name', 'is', null)
        .gt('sponsor_contribution', 0)
      if (!sponsorErr && sponsorMarkets) {
        totalFromSponsors =
          sponsorMarkets.reduce(
            (sum, m) =>
              sum +
              Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0) *
                CONSCIOUS_FUND_PERCENT,
            0
          ) ?? 0
      }
      metrics.total_fund_value = legacyBalance + totalFromSponsors
    } catch (e) {
      console.warn('[CEO Digest] conscious_fund failed:', e)
      metrics.total_fund_value = 0
    }

    try {
      const cycle = getCurrentCycle()
      const { count: votes } = await supabase
        .from('fund_votes')
        .select('id', { count: 'exact', head: true })
        .eq('cycle', cycle)
      metrics.fund_votes_this_cycle = votes ?? 0
    } catch (e) {
      metrics.fund_votes_this_cycle = 'error'
    }

    // e. INBOX ACTIVITY
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: new24h } = await supabase
        .from('conscious_inbox')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', cutoff24h)
      metrics.inbox_new_last_24h = new24h ?? 0
    } catch (e) {
      metrics.inbox_new_last_24h = 'error'
    }

    try {
      const { count: pending } = await supabase
        .from('conscious_inbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      metrics.inbox_pending_total = pending ?? 0
    } catch (e) {
      metrics.inbox_pending_total = 'error'
    }

    try {
      const { data: top3 } = await supabase
        .from('conscious_inbox')
        .select('id, title, upvotes, status')
        .order('upvotes', { ascending: false })
        .limit(3)
      metrics.inbox_top_3_by_upvotes = top3 ?? []
    } catch (e) {
      metrics.inbox_top_3_by_upvotes = 'error'
    }

    // f. AGENT HEALTH
    try {
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('agent_name, created_at, status, error_message')
        .order('created_at', { ascending: false })
        .limit(100)
      const byAgent: Record<string, { last_run: string; status: string; error?: string }> = {}
      for (const r of runs ?? []) {
        if (!byAgent[r.agent_name]) {
          byAgent[r.agent_name] = {
            last_run: r.created_at,
            status: r.status,
            error: r.error_message ?? undefined,
          }
        }
      }
      metrics.agent_last_runs = byAgent
    } catch (e) {
      metrics.agent_last_runs = 'error'
    }

    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: errors } = await supabase
        .from('agent_runs')
        .select('agent_name, error_message, created_at')
        .eq('status', 'error')
        .gte('created_at', cutoff24h)
      metrics.agent_errors_last_24h = (errors ?? []).length
      metrics.agent_errors_list = (errors ?? []).map((e) => ({
        agent: e.agent_name,
        error: e.error_message,
      }))
    } catch (e) {
      metrics.agent_errors_last_24h = 'error'
    }

    // g. NEWS MONITOR & CONTENT (content briefs, market suggestions, recent news)
    let newsMonitorContext = ''
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: briefs } = await supabase
        .from('agent_content')
        .select('body, created_at, content_type, metadata')
        .eq('agent_type', 'news_monitor')
        .in('content_type', ['content_brief', 'market_insight'])
        .gte('created_at', cutoff24h)
        .order('created_at', { ascending: false })
        .limit(5)
      const contentBrief = (briefs ?? []).find(
        (r: { content_type?: string; metadata?: { type?: string } }) =>
          r.content_type === 'content_brief' || r.metadata?.type === 'content_brief'
      )
      if (contentBrief?.body) {
        try {
          const b = JSON.parse(contentBrief.body) as {
            trending_topics?: string[]
            new_market_suggestions?: string[]
            sentiment_snapshot?: unknown
          }
          newsMonitorContext = `
Temas trending (News Monitor): ${(b.trending_topics ?? []).join(', ') || 'N/A'}
Sugerencias de mercados nuevos: ${(b.new_market_suggestions ?? []).join(', ') || 'N/A'}
Snapshot sentimiento: ${JSON.stringify(b.sentiment_snapshot ?? {})}`
        } catch {
          newsMonitorContext = '\n(Brief del News Monitor disponible pero no parseable)'
        }
      }

      const { data: newsBriefs } = await supabase
        .from('agent_content')
        .select('title, body, created_at')
        .eq('agent_type', 'news_monitor')
        .eq('content_type', 'news_summary')
        .eq('published', true)
        .gte('created_at', cutoff24h)
        .order('created_at', { ascending: false })
        .limit(2)
      if ((newsBriefs ?? []).length > 0) {
        newsMonitorContext += `\n\nResúmenes de noticias recientes:\n${(newsBriefs ?? [])
          .map((n) => `• ${n.title}: ${(n.body ?? '').slice(0, 150)}...`)
          .join('\n')}`
      }

      const { data: suggestions } = await supabase
        .from('agent_content')
        .select('title, body, content_type, metadata')
        .eq('agent_type', 'news_monitor')
        .in('content_type', ['market_suggestion', 'market_insight'])
        .eq('published', false)
        .gte('created_at', cutoff24h)
        .limit(8)
      const sugRows = (suggestions ?? []).filter(
        (r: { content_type?: string; metadata?: { type?: string } }) =>
          r.content_type === 'market_suggestion' || r.metadata?.type === 'market_suggestion'
      )
      if (sugRows.length > 0) {
        newsMonitorContext += `\n\nSugerencias pendientes de aprobación: ${sugRows.map((s: { title?: string }) => s.title).join('; ')}`
      }

      if (newsMonitorContext) {
        metrics.news_monitor_context = newsMonitorContext.trim()
      }
    } catch (e) {
      console.warn('[CEO Digest] News Monitor context failed:', e)
    }

    const systemMessage = `You are the daily briefing analyst for Crowd Conscious, a free-to-play opinion platform based in Mexico City preparing for FIFA World Cup 2026 (opening match June 11, 2026 at Estadio Azteca).

RULES (strict):
- Write in Spanish. Professional, executive tone. No alarmism.
- Use DAYS for time horizons (e.g. "~93 días hasta la inauguración"), never weeks unless it's actually weeks.
- You have NO access to API balance or credits. NEVER infer "créditos agotados" or "recargar presupuesto" — error counts can be from parsing, model config, or transient issues. Only report what the data shows: agent status (success/error) and error messages.
- Do NOT claim a model "no está disponible" — errors may be historical; if an agent has recent success, it is working.
- Agent health: use the most recent run per agent. If the latest run is success, report ✅. Past errors do not mean the agent is broken now.
- Be precise with numbers. Double-check date math.`

    const userMessage = `Here are today's platform metrics (JSON):

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Generate today's CEO digest with these sections:
1. RESUMEN RÁPIDO — 3-5 headline metrics with trend context
2. MERCADOS ACTIVOS — what's hot, what's dead, probability shifts
3. NOTICIAS Y CONTENIDO — if news_monitor_context is present: trending topics, market suggestions from News Monitor, sentiment snapshot. Use this to inform OPORTUNIDADES.
4. ACCIONES PENDIENTES — markets to resolve, inbox to review, anything broken
5. OPORTUNIDADES — suggested new markets based on what's trending (use News Monitor data when available), sponsor angles
6. SALUD DE LA PLATAFORMA — agents running ok? (use most recent run status only)

Keep it under 500 words. Write in Spanish. Today is ${todayFormatted}.`

    const userPrompt = userMessage?.trim() ?? ''
    if (!userPrompt) {
      console.error('[CEO Digest] Empty prompt, skipping API call')
      await logAgentRun({
        agentName: 'ceo-digest',
        status: 'skipped',
        durationMs: Date.now() - startTime,
        summary: { reason: 'empty_prompt' },
      })
      return { success: false, error: 'empty_prompt' }
    }

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.DIGEST,
      system: systemMessage,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const digestText = textBlock && 'text' in textBlock ? textBlock.text : ''

    if (!digestText) {
      throw new Error('No text in Claude response')
    }

    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    // Save to agent_content (use weekly_digest as content_type - ceo_digest not in schema)
    try {
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'weekly_digest',
        title: `Digest CEO - ${todayFormatted}`,
        body: digestText,
        language: 'es',
        metadata: {
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
          date: today.toISOString().slice(0, 10),
          digest_type: 'ceo_digest',
        },
        published: true,
      })
    } catch (e) {
      console.error('Failed to save digest to agent_content:', e)
      // Continue - don't fail the whole run
    }

    let emailSent = false
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      const emailResult = await sendEmail(adminEmail, {
        subject: `🧠 Crowd Conscious Digest — ${todayFormatted}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14b8a6, #3b82f6); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">🧠 Crowd Conscious Digest</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${todayFormatted}</p>
            </div>
            <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px; white-space: pre-wrap;">${digestText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>
        `,
      })
      emailSent = emailResult.success
      if (!emailResult.success) {
        console.warn('CEO digest email not sent:', emailResult.error)
      }
    } else {
      console.warn('ADMIN_EMAIL not set - skipping CEO digest email')
    }

    await logAgentRun({
      agentName: 'ceo-digest',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens,
      tokensOutput: usage.output_tokens,
      summary: { metrics_gathered: true, email_sent: emailSent },
    })

    const costEst =
      (usage.input_tokens * 0.000001 + usage.output_tokens * 0.000005).toFixed(6) + ' USD'

    return {
      success: true,
      tokens: { input: usage.input_tokens, output: usage.output_tokens },
      cost_estimate: costEst,
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as { status?: number; error?: { type?: string; error?: { message?: string }; message?: string }; message?: string }
    const fullError = error instanceof Error ? `${error.message} | ${error.stack ?? ''}` : String(error)
    console.error('[CEO Digest] Anthropic API error:', JSON.stringify({
      status: apiErr?.status,
      type: apiErr?.error?.type,
      message: apiErr?.error?.error?.message ?? apiErr?.error?.message ?? apiErr?.message,
      full: apiErr?.error ?? apiErr,
    }, null, 2))
    console.error('CEO Digest agent error:', err)

    try {
      await logAgentRun({
        agentName: 'ceo-digest',
        status: 'error',
        durationMs: Date.now() - startTime,
        errorMessage: `API ${apiErr?.status ?? '?'}: ${apiErr?.error?.error?.message ?? apiErr?.error?.message ?? err.message}`,
        summary: { step: 'identify which step failed', metrics_gathered: false, email_sent: false },
      })
    } catch (logErr) {
      console.error('Failed to log agent run:', logErr)
    }

    return { success: false, error: err.message }
  }
}
