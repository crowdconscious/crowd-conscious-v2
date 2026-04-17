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
        .select('user_id, anonymous_participant_id')
        .gte('created_at', cutoff24h)
      const rows = votes24h ?? []
      const distinctUsers = new Set(
        rows.filter((v) => v.user_id != null).map((v) => v.user_id as string)
      )
      const distinctAnonymous = new Set(
        rows.filter((v) => v.anonymous_participant_id != null).map((v) => v.anonymous_participant_id as string)
      )
      metrics.users_with_predictions_last_24h = distinctUsers.size
      metrics.unique_anonymous_voters_last_24h = distinctAnonymous.size
    } catch (e) {
      metrics.users_with_predictions_last_24h = 'error'
      metrics.unique_anonymous_voters_last_24h = 'error'
    }

    try {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count: totalAnon } = await supabase
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since30d)
      const { count: convertedAnon } = await supabase
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since30d)
        .not('converted_to_user_id', 'is', null)
      const t = totalAnon ?? 0
      const c = convertedAnon ?? 0
      metrics.anonymous_to_registered_conversion_30d_pct = t > 0 ? Math.round((c / t) * 1000) / 10 : 0
    } catch (e) {
      metrics.anonymous_to_registered_conversion_30d_pct = 'error'
    }

    // Conversion funnel at finer granularity — how many anon participants
    // upgraded in the last 24h and last 7d, plus a 7d conversion rate.
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { count: conv24h } = await supabase
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff24h)
        .not('converted_to_user_id', 'is', null)
      metrics.anonymous_conversions_last_24h = conv24h ?? 0

      const { count: conv7d } = await supabase
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff7d)
        .not('converted_to_user_id', 'is', null)
      const { count: anon7d } = await supabase
        .from('anonymous_participants')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff7d)

      metrics.anonymous_conversions_last_7d = conv7d ?? 0
      metrics.anonymous_to_registered_conversion_7d_pct =
        (anon7d ?? 0) > 0 ? Math.round(((conv7d ?? 0) / (anon7d ?? 1)) * 1000) / 10 : 0
    } catch (e) {
      metrics.anonymous_conversions_last_24h = 'error'
      metrics.anonymous_conversions_last_7d = 'error'
      metrics.anonymous_to_registered_conversion_7d_pct = 'error'
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
        .is('archived_at', null)
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
        .is('archived_at', null)
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
        .is('archived_at', null)
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
        .is('archived_at', null)
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

    // Locations that recently crossed the 10-vote reveal threshold —
    // these owners are the warmest possible Pulse leads because their
    // community just gave them a public score.
    try {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: hotLocations } = await supabase
        .from('conscious_locations')
        .select('name, slug, city, total_votes, conscious_score, instagram_handle, contact_email, certified_at, updated_at')
        .eq('status', 'active')
        .gte('total_votes', 10)
        .not('conscious_score', 'is', null)
        .gte('updated_at', cutoff7d)
        .order('updated_at', { ascending: false })
        .limit(10)
      metrics.locations_with_live_score_last_7d = (hotLocations ?? []).map((l) => ({
        name: l.name,
        slug: l.slug,
        city: l.city,
        total_votes: l.total_votes,
        conscious_score: l.conscious_score,
        instagram_handle: l.instagram_handle,
        contact_email: l.contact_email,
        pilot_pulse_link: `https://crowdconscious.app/pulse/pilot?business=${encodeURIComponent(l.name as string)}&source=ceo_digest`,
        insights_link: `https://crowdconscious.app/locations/${l.slug}/insights`,
      }))
    } catch (e) {
      console.warn('[CEO Digest] hot locations query failed:', e)
      metrics.locations_with_live_score_last_7d = []
    }

    // Week-over-week deltas — these are the heart of the weekly digest.
    // We compare the last 7 days to the 7 days before that ("prev week")
    // and surface only what changed. Flat metrics like "259 users (+0)"
    // are explicitly omitted from the prompt unless a delta is non-zero.
    try {
      const now = Date.now()
      const cutoff7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
      const cutoff14d = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()

      const [
        usersThisWeek,
        usersLastWeek,
        votesThisWeek,
        votesLastWeek,
        anonThisWeek,
        anonLastWeek,
        convThisWeek,
        convLastWeek,
        locationsThisWeek,
        newMarketsThisWeek,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', cutoff7d),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', cutoff14d).lt('created_at', cutoff7d),
        supabase.from('market_votes').select('*', { count: 'exact', head: true }).gte('created_at', cutoff7d),
        supabase.from('market_votes').select('*', { count: 'exact', head: true }).gte('created_at', cutoff14d).lt('created_at', cutoff7d),
        supabase.from('anonymous_participants').select('*', { count: 'exact', head: true }).gte('created_at', cutoff7d),
        supabase.from('anonymous_participants').select('*', { count: 'exact', head: true }).gte('created_at', cutoff14d).lt('created_at', cutoff7d),
        supabase.from('anonymous_participants').select('*', { count: 'exact', head: true }).gte('created_at', cutoff7d).not('converted_to_user_id', 'is', null),
        supabase.from('anonymous_participants').select('*', { count: 'exact', head: true }).gte('created_at', cutoff14d).lt('created_at', cutoff7d).not('converted_to_user_id', 'is', null),
        supabase.from('conscious_locations').select('name, slug, city, created_at').gte('created_at', cutoff7d).order('created_at', { ascending: false }),
        supabase.from('prediction_markets').select('id, title, created_at').gte('created_at', cutoff7d).is('archived_at', null).order('created_at', { ascending: false }).limit(10),
      ])

      const weekOverWeek = {
        users: {
          this_week: usersThisWeek.count ?? 0,
          last_week: usersLastWeek.count ?? 0,
          delta: (usersThisWeek.count ?? 0) - (usersLastWeek.count ?? 0),
        },
        votes: {
          this_week: votesThisWeek.count ?? 0,
          last_week: votesLastWeek.count ?? 0,
          delta: (votesThisWeek.count ?? 0) - (votesLastWeek.count ?? 0),
        },
        new_anonymous: {
          this_week: anonThisWeek.count ?? 0,
          last_week: anonLastWeek.count ?? 0,
        },
        conversions: {
          this_week: convThisWeek.count ?? 0,
          last_week: convLastWeek.count ?? 0,
        },
        new_locations_this_week: (locationsThisWeek.data ?? []).map((l) => ({
          name: l.name, slug: l.slug, city: l.city,
        })),
        new_markets_this_week: (newMarketsThisWeek.data ?? []).length,
      }
      metrics.week_over_week = weekOverWeek

      const cutoff7dDate = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: byMarket7d } = await supabase
        .from('market_votes')
        .select('market_id')
        .gte('created_at', cutoff7dDate)
      const counts7d: Record<string, number> = {}
      for (const row of byMarket7d ?? []) {
        const mid = row.market_id
        counts7d[mid] = (counts7d[mid] ?? 0) + 1
      }
      const sorted7d = Object.entries(counts7d).sort((a, b) => b[1] - a[1]).slice(0, 3)
      const topIds = sorted7d.map(([id]) => id)
      let titles7d: Record<string, string> = {}
      if (topIds.length > 0) {
        const { data: topMarkets } = await supabase
          .from('prediction_markets')
          .select('id, title')
          .in('id', topIds)
        for (const m of topMarkets ?? []) titles7d[m.id] = m.title
      }
      metrics.top_markets_by_new_votes_7d = sorted7d.map(([id, count]) => ({
        market_id: id,
        title: titles7d[id] ?? id,
        new_votes_7d: count,
      }))
    } catch (e) {
      console.warn('[CEO Digest] week-over-week block failed:', e)
      metrics.week_over_week = 'error'
      metrics.top_markets_by_new_votes_7d = 'error'
    }

    const systemMessage = `You are the WEEKLY operational analyst for Crowd Conscious, a free-to-play opinion platform based in Mexico City preparing for FIFA World Cup 2026 (opening match June 11, 2026 at Estadio Azteca).

RULES (strict):
- Write in Spanish. Professional, executive tone. No alarmism.
- This is a WEEKLY digest. Compare THIS WEEK (last 7 days) vs LAST WEEK. Highlight what CHANGED.
- If a delta is 0 or negligible, DO NOT mention that metric at all. Silence is the signal.
  - Example: if week_over_week.users.delta === 0, do NOT write "se mantuvo en 259 usuarios". Skip it.
  - Example: if week_over_week.votes.delta > 0, DO write "Los votos subieron de X a Y (+Z)".
- Use DAYS for time horizons (e.g. "~93 días hasta la inauguración").
- You have NO access to API balance or credits. Never say "créditos agotados" or "recargar presupuesto".
- Agent health: use the most recent run per agent. Latest success = ✅. Past errors alone do NOT mean the agent is broken now.
- Be precise with numbers. Double-check date math.`

    const userMessage = `Here are this week's platform metrics (JSON):

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Generate the WEEKLY CEO digest for the week ending ${todayFormatted}. Use this exact structure:

## 1. Lo que cambió esta semana
- 3-5 bullets, each referencing a NON-ZERO delta from \`week_over_week\` or a specific item from \`top_markets_by_new_votes_7d\` or \`new_locations_this_week\`.
- If everything is flat, write a single line: "Semana estable. Ver acciones sugeridas abajo."

## 2. Mercados del momento
- Reference \`top_markets_by_new_votes_7d\` by title. Mention vote counts.
- Call out any market in \`markets_approaching_list\` that resolves in the next 7 days.
- Mention \`markets_with_zero_predictions\` ONLY if it's > 5 (otherwise not worth noting).

## 3. Pipeline Pulse / Lugares Conscientes
- If \`locations_with_live_score_last_7d\` is non-empty, name the warmest 1-2 leads.
- If new locations were added this week, name them.

## 4. Salud de los agentes
- Use \`agent_last_runs\`. Only mention agents whose latest run was NOT success. Otherwise a single line: "Todos los agentes OK."

## 5. 3 acciones para esta semana
Pick exactly 3 concrete next steps. Each should reference specific data:
- Example: "Crear mercado sobre [X] — News Monitor señaló [signal]"
- Example: "Contactar a [Location] — cruzó 10 votos, usar \`pilot_pulse_link\`"
- Example: "Publicar borrador '[blog title]' — lleva 5 días en draft"

Keep the entire digest under 400 words. Write in Spanish. Today is ${todayFormatted}.`

    // Sponsor outreach prompt — generated separately so it can be stored and
    // emailed as its own actionable artifact. Uses the same metrics + News
    // Monitor context as the main digest but answers a different question:
    // "Who do I message today, and what do I say?"
    const sponsorOutreachUserMessage = `Here are today's platform metrics (JSON):

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Generate exactly 3 sponsor outreach ideas the founder can act on TODAY.
Today is ${todayFormatted}. ~56 días hasta la inauguración del Mundial 2026.

Catalog of products to pitch (use the right one for the segment):
- **Sello de Lugar Consciente** — for cafés, bars, restaurants, gyms, coworking spaces.
- **Pulse Single ($5,000 MXN Starter)** — single-question survey for a brand or institution.
- **Mundial Pulse Pack ($50,000 MXN)** — 5 Pulse surveys across the tournament for a brand seeking sustained presence.
- **Pilot Pulse ($1,500 MXN, coupon PILOTO)** — lead-magnet trial for cold prospects.

For each of the 3 ideas, output in this exact markdown structure:

### Idea N — [short title]
- **Segmento:** [e.g. "Bares deportivos en CDMX", "Fintech mexicanas", "Alcaldía Coyoacán"]
- **Hook:** [the news signal or platform datum that makes this timely — reference a specific news_monitor finding or market trend]
- **Producto:** [Sello | Pulse Single | Mundial Pulse Pack | Pilot Pulse]
- **Precio:** [in MXN]
- **Mensaje listo para enviar (WhatsApp/email, en español, 3 oraciones máx, casual pero profesional):**
> [draft message with one specific Pulse question they could run]

Prioritize ideas where:
1. A news story creates urgency (regulación, evento, crisis económica)
2. **A Conscious Location in \`locations_with_live_score_last_7d\` can be upgraded to Pulse** — if this list is non-empty, AT LEAST ONE of the 3 ideas MUST target a specific location from it. Use its exact name, score, vote count, and the provided \`pilot_pulse_link\` so the founder can forward the message directly. Recommend the **Pilot Pulse** ($1,500 MXN) product for these leads because they're already warm.
3. A World Cup activation angle exists

No introduction, no closing summary, no extra commentary — just the 3 ideas in the format above.`

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
        title: `Digest CEO semanal — ${todayFormatted}`,
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
        subject: `🧠 Crowd Conscious Digest Semanal — ${todayFormatted}`,
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

    // Sponsor outreach: separate Claude call so the artifact can be persisted
    // and emailed independently of the main operational digest. Failure here
    // must NOT fail the parent run — outreach is additive, not load-bearing.
    let outreachOk = false
    let outreachEmailSent = false
    let outreachUsage = { input_tokens: 0, output_tokens: 0 }
    try {
      const outreachResponse = await anthropic.messages.create({
        model: MODELS.CREATIVE,
        max_tokens: TOKEN_LIMITS.DIGEST,
        system: systemMessage,
        messages: [{ role: 'user', content: sponsorOutreachUserMessage }],
      })
      const outreachBlock = outreachResponse.content.find((b) => b.type === 'text')
      const outreachText = outreachBlock && 'text' in outreachBlock ? outreachBlock.text : ''
      outreachUsage = outreachResponse.usage ?? outreachUsage

      if (outreachText) {
        outreachOk = true

        try {
          await supabase.from('agent_content').insert({
            market_id: null,
            agent_type: 'news_monitor',
            content_type: 'sponsor_outreach',
            title: `Outreach del día — ${todayFormatted}`,
            body: outreachText,
            language: 'es',
            metadata: {
              model: MODELS.CREATIVE,
              tokens_input: outreachUsage.input_tokens,
              tokens_output: outreachUsage.output_tokens,
              date: today.toISOString().slice(0, 10),
              digest_type: 'sponsor_outreach',
            },
            published: true,
          })
        } catch (e) {
          console.error('Failed to save sponsor outreach to agent_content:', e)
        }

        if (adminEmail) {
          const outreachEmailResult = await sendEmail(adminEmail, {
            subject: `🎯 Outreach del día — ${todayFormatted}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">🎯 Outreach del día</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${todayFormatted}</p>
                </div>
                <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 8px 8px; white-space: pre-wrap;">${outreachText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>
            `,
          })
          outreachEmailSent = outreachEmailResult.success
          if (!outreachEmailResult.success) {
            console.warn('Sponsor outreach email not sent:', outreachEmailResult.error)
          }
        }
      }
    } catch (outreachErr) {
      console.error('[CEO Digest] Sponsor outreach generation failed:', outreachErr)
    }

    await logAgentRun({
      agentName: 'ceo-digest',
      status: 'success',
      durationMs: Date.now() - startTime,
      tokensInput: usage.input_tokens + outreachUsage.input_tokens,
      tokensOutput: usage.output_tokens + outreachUsage.output_tokens,
      summary: {
        metrics_gathered: true,
        email_sent: emailSent,
        sponsor_outreach_generated: outreachOk,
        sponsor_outreach_email_sent: outreachEmailSent,
      },
    })

    const totalIn = usage.input_tokens + outreachUsage.input_tokens
    const totalOut = usage.output_tokens + outreachUsage.output_tokens
    const costEst =
      (totalIn * 0.000001 + totalOut * 0.000005).toFixed(6) + ' USD'

    return {
      success: true,
      tokens: { input: totalIn, output: totalOut },
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
