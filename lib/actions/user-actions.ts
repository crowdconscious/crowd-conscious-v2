import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Modelo Consciente: a private summary of a user's real actions.
 * Actions are recorded as evidence — never converted to points, never ranked.
 */
export type UserActionKind = 'vote' | 'signal' | 'cosign' | 'live' | 'course'

export type UserActionItem = {
  id: string
  kind: UserActionKind
  title: string
  href: string | null
  created_at: string
}

export type UserActionsSummary = {
  counts: Record<UserActionKind, number>
  recent: UserActionItem[]
}

type Row = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function pickTitle(market: unknown, locale: 'es' | 'en'): string {
  const m = (Array.isArray(market) ? market[0] : market) as Row | null | undefined
  if (!m) return ''
  const translations = m.translations as Record<string, { title?: string }> | null | undefined
  return translations?.[locale]?.title || str(m.title)
}

async function safe<T>(p: PromiseLike<{ data: T | null; count?: number | null; error: unknown }>) {
  try {
    const res = await p
    if (res.error) return { data: null as T | null, count: 0 }
    return { data: res.data, count: res.count ?? 0 }
  } catch {
    return { data: null as T | null, count: 0 }
  }
}

export async function loadUserActions(
  supabase: SupabaseClient,
  userId: string,
  locale: 'es' | 'en',
  limit = 30
): Promise<UserActionsSummary> {
  const [votes, liveVotes, signals, cosigns, courses] = await Promise.all([
    safe<Row[]>(
      supabase
        .from('market_votes')
        .select('id, market_id, created_at, prediction_markets(title, translations, is_pulse, live_event_id)', {
          count: 'exact',
        })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    ),
    safe<Row[]>(
      supabase
        .from('market_votes')
        .select('prediction_markets!inner(live_event_id)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('prediction_markets.live_event_id', 'is', null)
    ),
    safe<Row[]>(
      supabase
        .from('citizen_signals')
        .select('id, public_slug, title, created_at', { count: 'exact' })
        .eq('author_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    ),
    safe<Row[]>(
      supabase
        .from('citizen_signal_cosigns')
        .select('id, created_at, citizen_signals(title, public_slug)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    ),
    safe<Row[]>(
      supabase
        .from('course_enrollments')
        .select('id, created_at, completed, marketplace_modules(title)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    ),
  ])

  const recent: UserActionItem[] = []

  for (const v of votes.data ?? []) {
    const m = (Array.isArray(v.prediction_markets) ? v.prediction_markets[0] : v.prediction_markets) as Row | null
    const isLive = Boolean(m?.live_event_id)
    recent.push({
      id: `vote-${str(v.id)}`,
      kind: isLive ? 'live' : 'vote',
      title: pickTitle(v.prediction_markets, locale),
      href: m?.is_pulse ? `/pulse/${str(v.market_id)}` : `/predictions/markets/${str(v.market_id)}`,
      created_at: str(v.created_at),
    })
  }
  for (const s of signals.data ?? []) {
    recent.push({
      id: `signal-${str(s.id)}`,
      kind: 'signal',
      title: str(s.title),
      href: s.public_slug ? `/signals/${str(s.public_slug)}` : null,
      created_at: str(s.created_at),
    })
  }
  for (const c of cosigns.data ?? []) {
    const sig = (Array.isArray(c.citizen_signals) ? c.citizen_signals[0] : c.citizen_signals) as Row | null
    recent.push({
      id: `cosign-${str(c.id)}`,
      kind: 'cosign',
      title: str(sig?.title),
      href: sig?.public_slug ? `/signals/${str(sig.public_slug)}` : null,
      created_at: str(c.created_at),
    })
  }
  for (const e of courses.data ?? []) {
    const mod = (Array.isArray(e.marketplace_modules) ? e.marketplace_modules[0] : e.marketplace_modules) as Row | null
    recent.push({
      id: `course-${str(e.id)}`,
      kind: 'course',
      title: str(mod?.title),
      href: null,
      created_at: str(e.created_at),
    })
  }

  recent.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

  const liveCount = liveVotes.count
  return {
    counts: {
      vote: Math.max(0, votes.count - liveCount),
      live: liveCount,
      signal: signals.count,
      cosign: cosigns.count,
      course: courses.count,
    },
    recent: recent.slice(0, limit),
  }
}
