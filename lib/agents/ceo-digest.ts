/**
 * CEO Digest — weekly operational dashboard for the founder.
 *
 * v2 (Apr 2026 re-prompting): one Claude call that returns a structured
 * JSON dashboard. The email template renders cards (no more markdown
 * narrative). Schema:
 *   - key_metrics[]      5 numbers with non-zero deltas only (silence = signal)
 *   - do_this_week[]     3 dated, actionable next steps with cta_url
 *   - watch              0-1 risk/surprise to flag
 *   - sponsor_outreach   0-1 warm-lead pitch (Pulse Pilot / Single / Pack)
 *
 * Cron: weekly Mon 16:00 UTC (10:00 CDMX) per vercel.json.
 */
import {
  getAnthropicClient,
  getSupabaseAdmin,
  logAgentRun,
  MODELS,
  TOKEN_LIMITS,
  formatDateMX,
  mexicoCityNow,
  parseAgentJSON,
} from '@/lib/agents/config'
import { sendEmail } from '@/lib/resend'
import { CONSCIOUS_FUND_PERCENT } from '@/lib/fund-allocation'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://crowdconscious.app').replace(/\/$/, '')

interface CeoDigestPayload {
  week_label: string
  key_metrics: Array<{
    label: string
    value: string
    delta?: string | null
  }>
  do_this_week: Array<{
    id: string
    title: string
    deadline?: string | null
    context?: string | null
    cta_url?: string | null
    cta_label?: string | null
  }>
  watch?: {
    title: string
    detail: string
  } | null
  sponsor_outreach?: {
    segment: string
    specific_target?: string | null
    rationale: string
    product: string
    whatsapp_message: string
    cta_url?: string | null
  } | null
}

function getCurrentCycle(): string {
  return new Date().toISOString().slice(0, 7)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderDigestHtml(payload: CeoDigestPayload, weekLabel: string, trackTo: string): string {
  const metricCards = (payload.key_metrics ?? [])
    .slice(0, 5)
    .map((m) => {
      const deltaHtml = m.delta
        ? `<div style="font-size:11px;color:#10b981;margin-top:2px;">${escapeHtml(m.delta)}</div>`
        : ''
      return `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;flex:1;min-width:140px;">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${escapeHtml(m.label)}</div>
          <div style="font-size:18px;color:#0f172a;font-weight:700;margin-top:4px;">${escapeHtml(m.value)}</div>
          ${deltaHtml}
        </div>`
    })
    .join('\n')

  const doItems = (payload.do_this_week ?? [])
    .slice(0, 3)
    .map((item, i) => {
      const cta =
        item.cta_url && item.cta_label
          ? `<a href="${escapeHtml(item.cta_url)}" style="display:inline-block;margin-top:6px;padding:6px 12px;background:#10b981;color:white;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">${escapeHtml(item.cta_label)}</a>`
          : ''
      const deadline = item.deadline
        ? `<span style="background:#fee2e2;color:#b91c1c;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:600;">${escapeHtml(item.deadline)}</span>`
        : ''
      const context = item.context
        ? `<div style="color:#64748b;font-size:13px;margin-top:4px;">${escapeHtml(item.context)}</div>`
        : ''
      return `
        <div style="border-left:3px solid #10b981;padding:10px 14px;background:white;border-radius:0 6px 6px 0;margin-bottom:8px;">
          <div style="color:#0f172a;font-weight:600;font-size:14px;">${i + 1}. ${escapeHtml(item.title)}${deadline}</div>
          ${context}
          ${cta}
        </div>`
    })
    .join('\n')

  const watchBlock = payload.watch
    ? `
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px;margin:18px 0;">
        <div style="color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">⚠ Watch</div>
        <div style="color:#78350f;font-size:14px;font-weight:600;margin-top:4px;">${escapeHtml(payload.watch.title)}</div>
        <div style="color:#92400e;font-size:13px;margin-top:4px;">${escapeHtml(payload.watch.detail)}</div>
      </div>`
    : ''

  const outreachBlock = payload.sponsor_outreach
    ? (() => {
        const o = payload.sponsor_outreach!
        const trackLink = (kind: 'reply' | 'meeting' | 'sale') => {
          const subject = `[Outreach ${weekLabel}] ${kind}`
          return `mailto:${encodeURIComponent(trackTo)}?subject=${encodeURIComponent(subject)}`
        }
        return `
          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:14px;margin:18px 0;">
            <div style="color:#047857;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">🎯 Sponsor outreach</div>
            <div style="color:#064e3b;font-size:14px;font-weight:600;margin-top:6px;">
              ${escapeHtml(o.specific_target ?? o.segment)} — <span style="color:#047857;">${escapeHtml(o.product)}</span>
            </div>
            <div style="color:#065f46;font-size:13px;margin-top:4px;">${escapeHtml(o.rationale)}</div>
            <div style="background:white;border-radius:6px;padding:10px 12px;margin-top:10px;font-size:13px;color:#0f172a;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(o.whatsapp_message)}</div>
            ${o.cta_url ? `<a href="${escapeHtml(o.cta_url)}" style="display:inline-block;margin-top:8px;padding:6px 12px;background:#10b981;color:white;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Abrir contexto</a>` : ''}
            <div style="margin-top:10px;font-size:11px;color:#475569;">
              Si convierte:
              <a href="${trackLink('reply')}" style="color:#0f766e;text-decoration:none;">reply</a> ·
              <a href="${trackLink('meeting')}" style="color:#0f766e;text-decoration:none;">meeting</a> ·
              <a href="${trackLink('sale')}" style="color:#0f766e;text-decoration:none;">sale</a>
            </div>
          </div>`
      })()
    : ''

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
      <div style="background:linear-gradient(135deg,#10b981,#0ea5e9);padding:22px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Crowd Conscious — Digest semanal</h1>
        <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">${escapeHtml(payload.week_label || weekLabel)}</p>
      </div>
      <div style="padding:24px;background:#f8fafc;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin-bottom:10px;">Métricas clave</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">${metricCards || '<div style="color:#94a3b8;font-size:13px;">(sin métricas con cambios significativos)</div>'}</div>

        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin:22px 0 8px;">Hacer esta semana</div>
        ${doItems || '<div style="color:#94a3b8;font-size:13px;">(sin acciones priorizadas — semana de mantenimiento)</div>'}

        ${watchBlock}
        ${outreachBlock}
      </div>
      <div style="padding:14px 24px;background:#f1f5f9;border-radius:0 0 8px 8px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
        Generado por el agente CEO Digest. Edita el prompt en <code>lib/agents/ceo-digest.ts</code>.
      </div>
    </div>
  `
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

    // a. USER METRICS — profiles count
    try {
      const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      metrics.total_registered_users = profileCount ?? 0
    } catch {
      metrics.total_registered_users = 0
    }

    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: votes24h } = await supabase
        .from('market_votes')
        .select('user_id, anonymous_participant_id')
        .gte('created_at', cutoff24h)
      const rows = votes24h ?? []
      metrics.users_with_predictions_last_24h = new Set(
        rows.filter((v) => v.user_id != null).map((v) => v.user_id as string)
      ).size
      metrics.unique_anonymous_voters_last_24h = new Set(
        rows.filter((v) => v.anonymous_participant_id != null).map((v) => v.anonymous_participant_id as string)
      ).size
    } catch {
      metrics.users_with_predictions_last_24h = 0
      metrics.unique_anonymous_voters_last_24h = 0
    }

    // b. PREDICTION ACTIVITY
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: votes24h } = await supabase
        .from('market_votes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', cutoff24h)
      metrics.predictions_last_24h = votes24h ?? 0
    } catch {
      metrics.predictions_last_24h = 0
    }

    // c. MARKET HEALTH
    try {
      const { count: active } = await supabase
        .from('prediction_markets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
      metrics.total_active_markets = active ?? 0
    } catch {
      metrics.total_active_markets = 0
    }

    try {
      const now = new Date()
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { data: approaching } = await supabase
        .from('prediction_markets')
        .select('id, title, resolution_date, is_pulse')
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
        .gte('resolution_date', now.toISOString())
        .lte('resolution_date', in7.toISOString())
      metrics.markets_approaching_resolution_7d = (approaching ?? []).length
      metrics.markets_approaching_list = (approaching ?? []).map((m) => ({
        id: m.id,
        title: m.title,
        is_pulse: m.is_pulse,
        resolution_date: m.resolution_date,
      }))
    } catch {
      metrics.markets_approaching_resolution_7d = 0
      metrics.markets_approaching_list = []
    }

    try {
      const { count: zeroPred } = await supabase
        .from('prediction_markets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trading'])
        .is('archived_at', null)
        .or('total_votes.is.null,total_votes.eq.0')
      metrics.markets_with_zero_predictions = zeroPred ?? 0
    } catch {
      metrics.markets_with_zero_predictions = 0
    }

    // d. CONSCIOUS FUND
    try {
      let legacyBalance = 0
      const { data: fund } = await supabase
        .from('conscious_fund')
        .select('total_collected, total_disbursed')
        .limit(1)
        .single()
      if (fund) {
        legacyBalance = Math.max(
          0,
          Number(fund.total_collected ?? 0) - Number(fund.total_disbursed ?? 0)
        )
      }
      let totalFromSponsors = 0
      const { data: sponsorMarkets } = await supabase
        .from('prediction_markets')
        .select('sponsor_contribution')
        .not('sponsor_name', 'is', null)
        .gt('sponsor_contribution', 0)
        .is('archived_at', null)
      if (sponsorMarkets) {
        totalFromSponsors = sponsorMarkets.reduce(
          (sum, m) =>
            sum + Number((m as { sponsor_contribution?: number }).sponsor_contribution ?? 0) * CONSCIOUS_FUND_PERCENT,
          0
        )
      }
      metrics.total_fund_value = legacyBalance + totalFromSponsors
    } catch {
      metrics.total_fund_value = 0
    }

    try {
      const cycle = getCurrentCycle()
      const { count: votes } = await supabase
        .from('fund_votes')
        .select('id', { count: 'exact', head: true })
        .eq('cycle', cycle)
      metrics.fund_votes_this_cycle = votes ?? 0
    } catch {
      metrics.fund_votes_this_cycle = 0
    }

    // e. INBOX ACTIVITY
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { count: new24h } = await supabase
        .from('conscious_inbox')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', cutoff24h)
      metrics.inbox_new_last_24h = new24h ?? 0
    } catch {
      metrics.inbox_new_last_24h = 0
    }

    try {
      const { count: pending } = await supabase
        .from('conscious_inbox')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('archived_at', null)
      metrics.inbox_pending_total = pending ?? 0
    } catch {
      metrics.inbox_pending_total = 0
    }

    try {
      const { data: top3 } = await supabase
        .from('conscious_inbox')
        .select('id, title, upvotes, status, type, category')
        .eq('status', 'pending')
        .is('archived_at', null)
        .order('upvotes', { ascending: false })
        .limit(5)
      metrics.inbox_top_pending = top3 ?? []
    } catch {
      metrics.inbox_top_pending = []
    }

    // f. AGENT HEALTH (latest run per agent)
    try {
      const { data: runs } = await supabase
        .from('agent_runs')
        .select('agent_name, created_at, status, error_message')
        .order('created_at', { ascending: false })
        .limit(60)
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
    } catch {
      metrics.agent_last_runs = {}
    }

    // g. NEWS MONITOR — pulse opportunities + blog topic ideas (latest brief)
    try {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: latestBrief } = await supabase
        .from('agent_content')
        .select('body, metadata, created_at')
        .eq('agent_type', 'news_monitor')
        .eq('content_type', 'news_summary')
        .gte('created_at', cutoff7d)
        .order('created_at', { ascending: false })
        .limit(3)
      const v2Brief = (latestBrief ?? []).find(
        (r) => (r.metadata as { type?: string } | null)?.type === 'pulse_opportunities'
      )
      if (v2Brief?.body) {
        try {
          const parsed = JSON.parse(v2Brief.body) as {
            pulse_opportunities?: unknown[]
            blog_topic_ideas?: unknown[]
            summary?: string
          }
          metrics.latest_news_monitor = {
            generated_at: v2Brief.created_at,
            summary: parsed.summary,
            pulse_opportunity_count: (parsed.pulse_opportunities ?? []).length,
            pulse_opportunities: (parsed.pulse_opportunities ?? []).slice(0, 3),
            blog_topic_count: (parsed.blog_topic_ideas ?? []).length,
            blog_topic_ideas: (parsed.blog_topic_ideas ?? []).slice(0, 3),
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    // h. INBOX TRIAGE — latest curator decision
    try {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: latestTriage } = await supabase
        .from('agent_content')
        .select('body, metadata, created_at')
        .eq('agent_type', 'news_monitor')
        .eq('content_type', 'weekly_digest')
        .gte('created_at', cutoff7d)
        .order('created_at', { ascending: false })
        .limit(3)
      const triage = (latestTriage ?? []).find(
        (r) => (r.metadata as { type?: string } | null)?.type === 'inbox_triage_v2'
      )
      if (triage?.body) {
        try {
          const items = JSON.parse(triage.body) as Array<{
            action?: string
            title?: string
            reason?: string
          }>
          metrics.latest_inbox_triage = {
            generated_at: triage.created_at,
            respond_today: items.filter((i) => i.action === 'respond_today').slice(0, 3),
            park_count: items.filter((i) => i.action === 'park').length,
            archive_count: items.filter((i) => i.action === 'archive').length,
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }

    // i. HOT LOCATIONS — Pulse upgrade leads
    try {
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: hotLocations } = await supabase
        .from('conscious_locations')
        .select('name, slug, city, total_votes, conscious_score, instagram_handle, contact_email, updated_at')
        .eq('status', 'active')
        .gte('total_votes', 10)
        .not('conscious_score', 'is', null)
        .gte('updated_at', cutoff7d)
        .order('updated_at', { ascending: false })
        .limit(5)
      metrics.hot_locations_last_7d = (hotLocations ?? []).map((l) => ({
        name: l.name,
        slug: l.slug,
        city: l.city,
        total_votes: l.total_votes,
        conscious_score: l.conscious_score,
        instagram_handle: l.instagram_handle,
        contact_email: l.contact_email,
        pilot_pulse_link: `${APP_URL}/para-marcas/pilot?business=${encodeURIComponent(l.name as string)}&source=ceo_digest`,
        insights_link: `${APP_URL}/locations/${l.slug}/insights`,
      }))
    } catch {
      metrics.hot_locations_last_7d = []
    }

    // j. WEEK-OVER-WEEK DELTAS
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

      metrics.week_over_week = {
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

      // Top markets by NEW votes in last 7d
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
      let titles7d: Record<string, { title: string; is_pulse: boolean }> = {}
      if (topIds.length > 0) {
        const { data: topMarkets } = await supabase
          .from('prediction_markets')
          .select('id, title, is_pulse')
          .in('id', topIds)
        for (const m of topMarkets ?? []) {
          titles7d[m.id] = { title: m.title, is_pulse: !!m.is_pulse }
        }
      }
      metrics.top_markets_by_new_votes_7d = sorted7d.map(([id, count]) => ({
        market_id: id,
        title: titles7d[id]?.title ?? id,
        is_pulse: titles7d[id]?.is_pulse ?? false,
        new_votes_7d: count,
      }))
    } catch {
      metrics.week_over_week = null
      metrics.top_markets_by_new_votes_7d = []
    }

    const systemMessage = `You are the WEEKLY operational analyst for Crowd Conscious, a free-to-play opinion + Pulse platform in Mexico City. World Cup 2026 opens June 11 at Estadio Azteca.

Your output is a JSON dashboard that the email template renders as cards. There is NO room for narrative, motivation, or padding. The founder is solo and reads this in 60 seconds.

OUTPUT FORMAT — respond with ONLY a single JSON object, no markdown fences, no preamble:

{
  "week_label": "<short ES label, e.g. 'Semana del 27 abr al 3 may'>",
  "key_metrics": [
    { "label": "<short ES, max 18 chars>", "value": "<short, e.g. '47 votos'>", "delta": "<optional: '+12 vs semana pasada' OR null>" }
  ],
  "do_this_week": [
    {
      "id": "<stable kebab-case slug, e.g. 'contact-bar-bikina'>",
      "title": "<imperative ES sentence>",
      "deadline": "<optional: 'mié', 'vie', 'esta semana'>",
      "context": "<optional: 1 ES sentence with the data hook>",
      "cta_url": "<optional: absolute or path URL admin can click, e.g. '${APP_URL}/predictions/admin/inbox'>",
      "cta_label": "<optional: button label, e.g. 'Abrir Buzón'>"
    }
  ],
  "watch": { "title": "<ES short>", "detail": "<1 ES sentence>" } | null,
  "sponsor_outreach": {
    "segment": "<who the lead segment is, ES>",
    "specific_target": "<exact name from data, e.g. 'Bar Bikina' OR null>",
    "rationale": "<1 ES sentence: why now>",
    "product": "<one of: 'Pulse Pilot ($1,500 MXN)' | 'Pulse Single ($5,000 MXN)' | 'Mundial Pulse Pack — Founding ($25,000 MXN)' | 'Mundial Pulse Pack ($50,000 MXN)'>",
    "whatsapp_message": "<3 ES sentences max, casual-pro, includes a Pulse question, ready to copy-send>",
    "cta_url": "<optional: pilot_pulse_link from hot_locations OR null>"
  } | null
}

HARD RULES
- Exactly 5 key_metrics MAX, fewer if there isn't material to say. PREFER metrics with non-zero deltas. Examples: 'Votos esta semana', 'Nuevas conversiones', 'Top Pulse', 'Pendientes en buzón', 'Lugares calientes'.
- Exactly 3 do_this_week items MAX. Each must reference a SPECIFIC datum from the JSON below. NEVER write "considera revisar" or "mantén el momentum". If you don't have 3 concrete actions, return fewer.
- 'cta_url' for actions: use ${APP_URL}/predictions/admin/inbox if action is reviewing inbox, ${APP_URL}/predictions/admin/agents for content, ${APP_URL}/dashboard/sponsor/<token> if known. If unsure, omit.
- 'watch' is null if everything is fine. Don't invent risks.
- 'sponsor_outreach': if 'hot_locations_last_7d' has items, AT LEAST ONE outreach must target a specific location from it (use its name + pilot_pulse_link as cta_url). Default product for warm Conscious Locations: 'Pulse Pilot ($1,500 MXN)'. Use Mundial Pulse Pack only when there's a World Cup activation angle. Set to null if no warm leads exist AND no plausible cold pitch from the data.
- All Spanish. No English. No emojis.
- DO NOT comment on agent runs, costs, or platform internals — those have their own dashboard.`

    const userMessage = `Here are this week's metrics. Today is ${todayFormatted}.

\`\`\`json
${JSON.stringify(metrics, null, 2)}
\`\`\`

Produce the JSON dashboard exactly per system instructions.`

    const response = await anthropic.messages.create({
      model: MODELS.CREATIVE,
      max_tokens: TOKEN_LIMITS.DIGEST,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : ''
    if (!rawText) {
      throw new Error('No text in Claude response')
    }
    const usage = response.usage ?? { input_tokens: 0, output_tokens: 0 }

    let payload: CeoDigestPayload
    try {
      const raw = parseAgentJSON(rawText)
      const candidate = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>
      payload = {
        week_label: String(candidate.week_label ?? `Semana al ${todayFormatted}`),
        key_metrics: Array.isArray(candidate.key_metrics)
          ? (candidate.key_metrics as CeoDigestPayload['key_metrics'])
          : [],
        do_this_week: Array.isArray(candidate.do_this_week)
          ? (candidate.do_this_week as CeoDigestPayload['do_this_week'])
          : [],
        watch:
          candidate.watch && typeof candidate.watch === 'object'
            ? (candidate.watch as CeoDigestPayload['watch'])
            : null,
        sponsor_outreach:
          candidate.sponsor_outreach && typeof candidate.sponsor_outreach === 'object'
            ? (candidate.sponsor_outreach as CeoDigestPayload['sponsor_outreach'])
            : null,
      }
    } catch (parseErr) {
      console.error('[CEO Digest] JSON parse failed:', parseErr)
      await logAgentRun({
        agentName: 'ceo-digest',
        status: 'error',
        durationMs: Date.now() - startTime,
        tokensInput: usage.input_tokens,
        tokensOutput: usage.output_tokens,
        errorMessage: 'parse_failed',
        summary: { raw_preview: rawText.slice(0, 200) },
      })
      return { success: false, error: 'parse_failed' }
    }

    // Persist (use weekly_digest content_type as before — admin dashboard
    // already classifies these to the CEO Digests tab via metadata.digest_type).
    try {
      await supabase.from('agent_content').insert({
        market_id: null,
        agent_type: 'news_monitor',
        content_type: 'weekly_digest',
        title: `Digest CEO semanal — ${todayFormatted}`,
        body: JSON.stringify(payload),
        language: 'es',
        metadata: {
          model: MODELS.CREATIVE,
          tokens_input: usage.input_tokens,
          tokens_output: usage.output_tokens,
          date: today.toISOString().slice(0, 10),
          digest_type: 'ceo_digest',
          schema_version: 'v2_dashboard',
        },
        published: true,
      })
    } catch (e) {
      console.error('Failed to save digest to agent_content:', e)
    }

    let emailSent = false
    const adminEmail = process.env.ADMIN_EMAIL
    const weekLabel = today.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Mexico_City',
    })
    if (adminEmail) {
      const html = renderDigestHtml(payload, weekLabel, adminEmail)
      const emailResult = await sendEmail(adminEmail, {
        subject: `🧠 Digest CEO — ${weekLabel}`,
        html,
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
      summary: {
        metrics_gathered: true,
        email_sent: emailSent,
        key_metric_count: payload.key_metrics.length,
        action_count: payload.do_this_week.length,
        has_watch: !!payload.watch,
        has_sponsor_outreach: !!payload.sponsor_outreach,
      },
    })

    const totalIn = usage.input_tokens
    const totalOut = usage.output_tokens
    const costEst = (totalIn * 0.000003 + totalOut * 0.000015).toFixed(6) + ' USD'

    return {
      success: true,
      tokens: { input: totalIn, output: totalOut },
      cost_estimate: costEst,
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const apiErr = error as {
      status?: number
      error?: { type?: string; error?: { message?: string }; message?: string }
      message?: string
    }
    console.error('[CEO Digest] error:', err)
    try {
      await logAgentRun({
        agentName: 'ceo-digest',
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
