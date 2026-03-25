/**
 * Structured platform metrics for agents — aligned with Intelligence Hub data
 * (see lib/intelligence-data.ts schema notes).
 */

import { createAdminClient } from '@/lib/supabase-admin'

function normProb(p: number): number {
  if (p == null || Number.isNaN(p)) return 0.5
  return p > 1 ? p / 100 : p
}

export interface PlatformIntelligence {
  overview: {
    total_users: number
    total_votes: number
    active_markets: number
    orphan_markets: number
    conscious_fund_balance: number
  }
  trending: {
    most_voted_markets: Array<{ title: string; votes: number; yes_pct: number }>
    biggest_probability_shifts: Array<{
      title: string
      old_pct: number
      new_pct: number
      direction: 'up' | 'down'
    }>
    most_active_users: Array<{ username: string; xp: number; votes: number }>
  }
  engagement: {
    votes_today: number
    votes_this_week: number
    new_users_this_week: number
    avg_confidence: number
  }
  content_worthy: string[]
}

export function emptyPlatformIntelligence(): PlatformIntelligence {
  return {
    overview: {
      total_users: 0,
      total_votes: 0,
      active_markets: 0,
      orphan_markets: 0,
      conscious_fund_balance: 0,
    },
    trending: {
      most_voted_markets: [],
      biggest_probability_shifts: [],
      most_active_users: [],
    },
    engagement: {
      votes_today: 0,
      votes_this_week: 0,
      new_users_this_week: 0,
      avg_confidence: 0,
    },
    content_worthy: [],
  }
}

export async function getPlatformIntelligence(): Promise<PlatformIntelligence> {
  const out = emptyPlatformIntelligence()

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch {
    return out
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const dayAgo = new Date(now.getTime() - 86400000).toISOString()

  try {
    const [
      { count: totalUsers },
      { count: totalVotes },
      { count: activeMarkets },
      { count: orphanMarkets },
      { data: topMarkets },
      { count: votesToday },
      { count: votesThisWeek },
      { count: newUsersWeek },
      { data: fundRow },
      { data: histRows },
      { data: xpRows },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('market_votes').select('*', { count: 'exact', head: true }),
      admin
        .from('prediction_markets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trading']),
      admin
        .from('prediction_markets')
        .select('*', { count: 'exact', head: true })
        .or('total_votes.is.null,total_votes.eq.0'),
      admin
        .from('prediction_markets')
        .select('title, total_votes, current_probability')
        .in('status', ['active', 'trading'])
        .order('total_votes', { ascending: false, nullsFirst: false })
        .limit(5),
      admin.from('market_votes').select('*', { count: 'exact', head: true }).gte('created_at', dayAgo),
      admin.from('market_votes').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      admin.from('conscious_fund').select('total_collected, current_balance').limit(1).maybeSingle(),
      admin
        .from('prediction_market_history')
        .select('market_id, probability, recorded_at')
        .gte('recorded_at', weekAgo)
        .order('recorded_at', { ascending: true })
        .limit(12000),
      admin.from('user_xp').select('user_id, total_xp').order('total_xp', { ascending: false }).limit(5),
    ])

    out.overview.total_users = totalUsers ?? 0
    out.overview.total_votes = totalVotes ?? 0
    out.overview.active_markets = activeMarkets ?? 0
    out.overview.orphan_markets = orphanMarkets ?? 0

    if (fundRow) {
      out.overview.conscious_fund_balance =
        Number((fundRow as { total_collected?: number; current_balance?: number }).total_collected ?? 0) ||
        Number((fundRow as { current_balance?: number }).current_balance ?? 0) ||
        0
    }

    out.engagement.votes_today = votesToday ?? 0
    out.engagement.votes_this_week = votesThisWeek ?? 0
    out.engagement.new_users_this_week = newUsersWeek ?? 0

    out.trending.most_voted_markets = (topMarkets ?? []).map((m: Record<string, unknown>) => {
      const cp = Number(m.current_probability ?? 50)
      const cpFrac = cp > 1 ? cp / 100 : cp
      return {
        title: String(m.title ?? ''),
        votes: Number(m.total_votes ?? 0),
        yes_pct: Math.round(normProb(cpFrac) * 100),
      }
    })

    // Probability shifts: earliest vs latest snapshot per market in window (≥10 pts on 0–100 scale)
    const byMarket = new Map<string, { probability: number; recorded_at: string }[]>()
    for (const h of histRows ?? []) {
      const row = h as { market_id: string; probability: number; recorded_at: string }
      const mid = row.market_id
      if (!byMarket.has(mid)) byMarket.set(mid, [])
      byMarket.get(mid)!.push({ probability: Number(row.probability), recorded_at: row.recorded_at })
    }

    const shiftsWithIds: Array<{
      market_id: string
      old_pct: number
      new_pct: number
      direction: 'up' | 'down'
    }> = []
    for (const [mid, entries] of byMarket) {
      if (entries.length < 2) continue
      entries.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      const oldest = entries[0]!
      const newest = entries[entries.length - 1]!
      const oldPct = Math.round(normProb(oldest.probability) * 100)
      const newPct = Math.round(normProb(newest.probability) * 100)
      if (Math.abs(newPct - oldPct) < 10) continue
      shiftsWithIds.push({
        market_id: mid,
        old_pct: oldPct,
        new_pct: newPct,
        direction: newPct > oldPct ? 'up' : 'down',
      })
    }
    shiftsWithIds.sort(
      (a, b) => Math.abs(b.new_pct - b.old_pct) - Math.abs(a.new_pct - a.old_pct)
    )
    const topShiftIds = [...new Set(shiftsWithIds.slice(0, 12).map((s) => s.market_id))]
    let titleMap = new Map<string, string>()
    if (topShiftIds.length) {
      const { data: titles } = await admin
        .from('prediction_markets')
        .select('id, title')
        .in('id', topShiftIds)
      titleMap = new Map((titles ?? []).map((t: { id: string; title: string }) => [t.id, t.title]))
    }
    out.trending.biggest_probability_shifts = shiftsWithIds.slice(0, 5).map((s) => ({
      title: titleMap.get(s.market_id) ?? s.market_id,
      old_pct: s.old_pct,
      new_pct: s.new_pct,
      direction: s.direction,
    }))

    // Leaderboard + vote counts (registered votes only when column exists)
    const uids = (xpRows ?? []).map((r: { user_id: string }) => r.user_id)
    let nameRows: { id: string; full_name: string | null }[] = []
    if (uids.length) {
      const { data: prof } = await admin.from('profiles').select('id, full_name').in('id', uids)
      nameRows = (prof ?? []) as { id: string; full_name: string | null }[]
    }
    const names = new Map(nameRows.map((p) => [p.id, p.full_name]))
    let voteRows: { user_id: string }[] = []
    try {
      const { data: vr } = await admin
        .from('market_votes')
        .select('user_id')
        .in('user_id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000'])
        .or('is_anonymous.is.null,is_anonymous.eq.false')
      voteRows = (vr ?? []) as { user_id: string }[]
    } catch {
      const { data: vr } = await admin
        .from('market_votes')
        .select('user_id')
        .in('user_id', uids.length ? uids : ['00000000-0000-0000-0000-000000000000'])
      voteRows = (vr ?? []) as { user_id: string }[]
    }
    const voteCount = new Map<string, number>()
    for (const v of voteRows) {
      voteCount.set(v.user_id, (voteCount.get(v.user_id) ?? 0) + 1)
    }
    out.trending.most_active_users = (xpRows ?? []).map((r: { user_id: string; total_xp: number }) => {
      const display = names.get(r.user_id)?.trim() || 'Anonymous'
      return {
        username: display,
        xp: Number(r.total_xp ?? 0),
        votes: voteCount.get(r.user_id) ?? 0,
      }
    })

    try {
      const { data: confRows } = await admin.from('market_votes').select('confidence').limit(50000)
      const arr = (confRows ?? [])
        .map((r: { confidence: number }) => r.confidence)
        .filter((n: number) => n != null && !Number.isNaN(Number(n)))
      if (arr.length) {
        out.engagement.avg_confidence = arr.reduce((a, b) => a + Number(b), 0) / arr.length
      }
    } catch {
      // optional
    }

    const hooks: string[] = []
    const vt = out.engagement.votes_today
    if (vt > 5) {
      hooks.push(`${vt} votos hoy — la comunidad está activa`)
    }
    if (out.engagement.new_users_this_week > 3) {
      hooks.push(`${out.engagement.new_users_this_week} nuevos usuarios esta semana`)
    }
    if (out.overview.orphan_markets > 0) {
      hooks.push(`${out.overview.orphan_markets} mercados sin votos esperan tu opinión`)
    }
    const topShift = out.trending.biggest_probability_shifts[0]
    if (topShift?.title) {
      hooks.push(
        `"${topShift.title}" se movió de ${topShift.old_pct}% a ${topShift.new_pct}% esta semana`
      )
    }
    const lead = out.trending.most_active_users[0]
    if (lead && lead.xp > 0) {
      hooks.push(`${lead.username} lidera el leaderboard con ${lead.xp} XP`)
    }
    if (out.engagement.avg_confidence >= 7) {
      hooks.push(
        `Confianza promedio en votos: ${out.engagement.avg_confidence.toFixed(1)}/10`
      )
    }
    out.content_worthy = hooks
  } catch (e) {
    console.warn('[intelligence-bridge] getPlatformIntelligence failed:', e)
  }

  return out
}

/** Block inserted into News Monitor Claude prompt before SEÑALES RECIENTES. */
export function formatNewsMonitorPlatformContext(p: PlatformIntelligence): string {
  const voted = p.trending.most_voted_markets
    .map((m) => `• "${m.title}" — ${m.votes} votos, ${m.yes_pct}% YES`)
    .join('\n')
  const shifts = p.trending.biggest_probability_shifts
    .map((s) => `• "${s.title}" se movió de ${s.old_pct}% a ${s.new_pct}% (${s.direction})`)
    .join('\n')

  return `DATOS DE LA PLATAFORMA (Intelligence Hub):
- ${p.overview.total_users} usuarios registrados
- ${p.overview.total_votes} votos totales
- ${p.overview.active_markets} mercados activos
- ${p.overview.orphan_markets} mercados sin votos
- Fondo Consciente: $${p.overview.conscious_fund_balance.toLocaleString('es-MX')} MXN (referencia)
- Votos esta semana: ${p.engagement.votes_this_week}
- Nuevos usuarios esta semana: ${p.engagement.new_users_this_week}
- Confianza promedio (1–10): ${p.engagement.avg_confidence > 0 ? p.engagement.avg_confidence.toFixed(1) : 'N/D'}

MERCADOS MÁS VOTADOS:
${voted || '—'}

CAMBIOS DE PROBABILIDAD IMPORTANTES (últimos 7 días, Δ≥10 pts):
${shifts || 'No hay cambios significativos esta semana.'}

USA ESTOS DATOS para:
- No sugerir mercados duplicados o casi idénticos a los más votados (ya existen y tienen audiencia)
- Priorizar ángulos en categorías con pocos votos u orfandad (${p.overview.orphan_markets} mercados sin votos)
- Tratar los cambios de probabilidad como señal de interés o debate comunitario
- Citar solo cifras que aparecen arriba (no inventes números)`
}

/** Block for Content Creator user prompt (real leaderboard + hooks). */
export function formatContentCreatorPlatformContext(p: PlatformIntelligence): string {
  const hooks = p.content_worthy.map((h) => `• ${h}`).join('\n')
  const board = p.trending.most_active_users
    .map((u, i) => `${i + 1}. ${u.username} — ${u.xp} XP (${u.votes} votos registrados)`)
    .join('\n')
  const hot = p.trending.biggest_probability_shifts
    .map((s) => `• "${s.title}": ${s.old_pct}% → ${s.new_pct}%`)
    .join('\n')

  return `DATOS EN VIVO DE LA PLATAFORMA:
${hooks || '• (Sin hooks automáticos; usa KPIs del JSON de actividad más abajo.)'}

LEADERBOARD (XP / votos registrados):
${board || '—'}

MERCADOS CALIENTES (cambios de probabilidad esta semana, Δ≥10 pts):
${hot || 'No hay cambios importantes en el umbral actual.'}

INSTRUCCIONES (datos reales):
- USA los datos reales de arriba y el JSON de actividad en los social posts cuando encaje
- Si hay un cambio de probabilidad > 15%, considera un post destacando ese movimiento
- Si hay muchos nuevos usuarios esta semana, puedes un post de bienvenida a la comunidad
- Si hay mercados sin votos, un post invitando a explorar y votar (sin inventar el número si no está arriba)
- SIEMPRE incluye datos reales del contexto (no inventes cifras)
- Los community highlights deben basarse en usuarios reales del leaderboard cuando los menciones`
}
